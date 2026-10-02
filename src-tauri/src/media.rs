//! src-tauri/src/media.rs
//!
//! Windows media sessions (System Media Transport Controls).
//! Works with anything Windows exposes a session for: Spotify, Chrome/Edge
//! media (YouTube, YouTube Music), Media Player, VLC, etc.
//!
//! One dedicated MTA thread. Windows pushes changes via events, so there is
//! no polling loop. Artwork is fetched only when the track changes.

use std::sync::{Arc, Mutex, mpsc};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::{Engine, engine::general_purpose::STANDARD};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use windows::{
    Foundation::TypedEventHandler,
    Media::Control::{
        GlobalSystemMediaTransportControlsSession as Session,
        GlobalSystemMediaTransportControlsSessionManager as Manager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
    },
    Storage::Streams::DataReader,
    Win32::System::Com::{COINIT_MULTITHREADED, CoInitializeEx},
};

/// 100ns ticks between 1601-01-01 and 1970-01-01
const EPOCH_DIFF: i64 = 116_444_736_000_000_000;

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct MediaState {
    pub available: bool,
    pub status: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub source: String,
    pub position_ms: i64,
    pub duration_ms: i64,
    pub position_updated_ms: i64,
    pub can_play: bool,
    pub can_pause: bool,
    pub can_next: bool,
    pub can_previous: bool,
    pub can_seek: bool,
    pub track_key: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Artwork {
    pub track_key: String,
    pub url: Option<String>,
}

#[derive(Serialize)]
pub struct Snapshot {
    pub state: MediaState,
    pub artwork: Option<Artwork>,
}

pub enum Cmd {
    Toggle,
    Next,
    Previous,
    Seek(i64),
    Snapshot(mpsc::Sender<Snapshot>),
}

pub struct MediaTx(pub Mutex<mpsc::Sender<Cmd>>);

type Unsub = Box<dyn FnOnce() + Send>;

#[derive(Default)]
struct ArtCache {
    key: String,
    tries: u8,
    artwork: Option<Artwork>,
}

struct Shared {
    app: AppHandle,
    mgr: Manager,
    art: Mutex<ArtCache>,
    unsub: Mutex<Option<Unsub>>,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn read_state(mgr: &Manager) -> (MediaState, Option<Session>) {
    let session = match mgr.GetCurrentSession() {
        Ok(s) => s,
        Err(_) => {
            return (
                MediaState {
                    status: "closed".into(),
                    ..Default::default()
                },
                None,
            );
        }
    };
    match build_state(&session) {
        Ok(state) => (state, Some(session)),
        Err(_) => (
            MediaState {
                status: "closed".into(),
                ..Default::default()
            },
            None,
        ),
    }
}

fn build_state(session: &Session) -> windows::core::Result<MediaState> {
    let props = session.TryGetMediaPropertiesAsync()?.join()?;
    let title = props.Title()?.to_string();
    let artist = props.Artist()?.to_string();
    let album = props.AlbumTitle()?.to_string();

    let playback = session.GetPlaybackInfo()?;
    let ps = playback.PlaybackStatus()?;
    let status = if ps == Status::Playing {
        "playing"
    } else if ps == Status::Paused {
        "paused"
    } else if ps == Status::Stopped {
        "stopped"
    } else if ps == Status::Changing {
        "changing"
    } else if ps == Status::Opened {
        "opened"
    } else {
        "closed"
    };
    let c = playback.Controls()?;

    let tl = session.GetTimelineProperties()?;
    let position_ms = tl.Position()?.Duration / 10_000;
    let start = tl.StartTime()?.Duration;
    let end = tl.EndTime()?.Duration;
    let duration_ms = (end - start).max(0) / 10_000;
    let updated = tl.LastUpdatedTime()?.UniversalTime;
    let position_updated_ms = if updated > EPOCH_DIFF {
        (updated - EPOCH_DIFF) / 10_000
    } else {
        now_ms()
    };

    let source = session.SourceAppUserModelId()?.to_string();
    let track_key = format!("{source}|{title}|{artist}|{album}");

    Ok(MediaState {
        available: true,
        status: status.into(),
        title,
        artist,
        album,
        source,
        position_ms,
        duration_ms,
        position_updated_ms,
        can_play: c.IsPlayEnabled().unwrap_or(false),
        can_pause: c.IsPauseEnabled().unwrap_or(false),
        can_next: c.IsNextEnabled().unwrap_or(false),
        can_previous: c.IsPreviousEnabled().unwrap_or(false),
        can_seek: c.IsPlaybackPositionEnabled().unwrap_or(false),
        track_key,
    })
}

fn read_artwork(session: &Session) -> Option<String> {
    let props = session.TryGetMediaPropertiesAsync().ok()?.join().ok()?;
    let thumb = props.Thumbnail().ok()?;
    let stream = thumb.OpenReadAsync().ok()?.join().ok()?;
    let size = stream.Size().ok()? as u32;
    if size == 0 || size > 8_000_000 {
        return None;
    }
    let reader = DataReader::CreateDataReader(&stream).ok()?;
    reader.LoadAsync(size).ok()?.join().ok()?;
    let mut buf = vec![0u8; size as usize];
    reader.ReadBytes(&mut buf).ok()?;
    let mime = stream.ContentType().ok()?.to_string();
    let mime = if mime.is_empty() {
        "image/jpeg".to_string()
    } else {
        mime
    };
    Some(format!("data:{mime};base64,{}", STANDARD.encode(buf)))
}

/// Emit current state; fetch artwork only on track change (retry a few times
/// because apps often publish the thumbnail slightly after the title).
fn refresh(sh: &Arc<Shared>) {
    let (state, session) = read_state(&sh.mgr);

    {
        let mut cache = sh.art.lock().unwrap();
        let changed = cache.key != state.track_key;
        if changed {
            cache.key = state.track_key.clone();
            cache.tries = 0;
            cache.artwork = None;
        }
        let missing = cache.artwork.as_ref().map_or(true, |a| a.url.is_none());
        if state.available && missing && cache.tries < 3 {
            cache.tries += 1;
            let url = session.as_ref().and_then(read_artwork);
            if url.is_some() || changed {
                let art = Artwork {
                    track_key: state.track_key.clone(),
                    url,
                };
                cache.artwork = Some(art.clone());
                let _ = sh.app.emit("media://artwork", art);
            }
        }
    }

    let _ = sh.app.emit("media://state", state);
}

/// (Re)attach event handlers to whichever session is current.
fn bind(sh: &Arc<Shared>) -> windows::core::Result<()> {
    if let Some(unsub) = sh.unsub.lock().unwrap().take() {
        unsub();
    }
    let session = sh.mgr.GetCurrentSession()?;

    let s1 = sh.clone();
    let t1 = session.MediaPropertiesChanged(&TypedEventHandler::new(move |_, _| {
        refresh(&s1);
        Ok(())
    }))?;
    let s2 = sh.clone();
    let t2 = session.PlaybackInfoChanged(&TypedEventHandler::new(move |_, _| {
        refresh(&s2);
        Ok(())
    }))?;
    let s3 = sh.clone();
    let t3 = session.TimelinePropertiesChanged(&TypedEventHandler::new(move |_, _| {
        refresh(&s3);
        Ok(())
    }))?;

    let sess = session.clone();
    *sh.unsub.lock().unwrap() = Some(Box::new(move || {
        let _ = sess.RemoveMediaPropertiesChanged(t1);
        let _ = sess.RemovePlaybackInfoChanged(t2);
        let _ = sess.RemoveTimelinePropertiesChanged(t3);
    }));
    Ok(())
}

fn run(app: AppHandle, rx: mpsc::Receiver<Cmd>) -> windows::core::Result<()> {
    unsafe { CoInitializeEx(None, COINIT_MULTITHREADED).ok()? };
    let mgr = Manager::RequestAsync()?.join()?;
    let sh = Arc::new(Shared {
        app,
        mgr: mgr.clone(),
        art: Mutex::new(ArtCache::default()),
        unsub: Mutex::new(None),
    });

    let s = sh.clone();
    mgr.CurrentSessionChanged(&TypedEventHandler::new(move |_, _| {
        let _ = bind(&s);
        refresh(&s);
        Ok(())
    }))?;
    let s = sh.clone();
    mgr.SessionsChanged(&TypedEventHandler::new(move |_, _| {
        let _ = bind(&s);
        refresh(&s);
        Ok(())
    }))?;

    let _ = bind(&sh);
    refresh(&sh);

    while let Ok(cmd) = rx.recv() {
        match cmd {
            Cmd::Snapshot(reply) => {
                let (state, _) = read_state(&sh.mgr);
                let artwork = sh
                    .art
                    .lock()
                    .unwrap()
                    .artwork
                    .clone()
                    .filter(|a| a.track_key == state.track_key);
                let _ = reply.send(Snapshot { state, artwork });
            }
            other => {
                if let Ok(s) = sh.mgr.GetCurrentSession() {
                    let _ = match other {
                        Cmd::Toggle => s.TryTogglePlayPauseAsync().and_then(|o| o.join()),
                        Cmd::Next => s.TrySkipNextAsync().and_then(|o| o.join()),
                        Cmd::Previous => s.TrySkipPreviousAsync().and_then(|o| o.join()),
                        Cmd::Seek(ms) => s
                            .TryChangePlaybackPositionAsync(ms * 10_000)
                            .and_then(|o| o.join()),
                        Cmd::Snapshot(_) => Ok(false),
                    };
                }
            }
        }
    }
    Ok(())
}

pub fn start(app: AppHandle) -> MediaTx {
    let (tx, rx) = mpsc::channel::<Cmd>();
    std::thread::spawn(move || {
        if let Err(e) = run(app, rx) {
            eprintln!("[media] unavailable: {e}");
        }
    });
    MediaTx(Mutex::new(tx))
}

#[tauri::command]
pub fn media_control(
    tx: State<MediaTx>,
    action: String,
    position_ms: Option<i64>,
) -> Result<(), String> {
    let cmd = match action.as_str() {
        "toggle" => Cmd::Toggle,
        "next" => Cmd::Next,
        "previous" => Cmd::Previous,
        "seek" => Cmd::Seek(position_ms.ok_or("bad_args")?),
        _ => return Err("bad_args".into()),
    };
    tx.0.lock()
        .map_err(|_| "failed".to_string())?
        .send(cmd)
        .map_err(|_| "unavailable".to_string())
}

#[tauri::command]
pub fn media_snapshot(tx: State<MediaTx>) -> Result<Snapshot, String> {
    let (reply_tx, reply_rx) = mpsc::channel();
    tx.0.lock()
        .map_err(|_| "failed".to_string())?
        .send(Cmd::Snapshot(reply_tx))
        .map_err(|_| "unavailable".to_string())?;
    reply_rx
        .recv_timeout(Duration::from_secs(3))
        .map_err(|_| "unavailable".to_string())
}
