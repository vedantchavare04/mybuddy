//! src-tauri/src/speech.rs
//!
//! Native Windows text-to-speech: SpeechSynthesizer renders to a stream and
//! MediaPlayer plays it, which gives real pause / resume / stop / rate.
//! One dedicated MTA thread owns the player. States are pushed to the UI on
//! `speech://state`: speaking | paused | completed | idle | error.

use std::sync::{Mutex, mpsc};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use windows::{
    Foundation::{TimeSpan, TypedEventHandler},
    Media::{Core::MediaSource, Playback::MediaPlayer, SpeechSynthesis::SpeechSynthesizer},
    Win32::System::Com::{COINIT_MULTITHREADED, CoInitializeEx},
    core::HSTRING,
};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Voice {
    pub id: String,
    pub name: String,
    pub language: String,
}

pub enum Cmd {
    Speak {
        text: String,
        voice_id: Option<String>,
        rate: f64,
    },
    Pause,
    Resume,
    Stop,
    Rate(f64),
}

pub struct SpeechTx(pub Mutex<mpsc::Sender<Cmd>>);

fn emit(app: &AppHandle, state: &str, message: Option<&str>) {
    let _ = app.emit(
        "speech://state",
        serde_json::json!({ "state": state, "message": message }),
    );
}

fn run(app: AppHandle, rx: mpsc::Receiver<Cmd>) -> windows::core::Result<()> {
    unsafe { CoInitializeEx(None, COINIT_MULTITHREADED).ok()? };

    let synth = SpeechSynthesizer::new()?;
    let player = MediaPlayer::new()?;

    let a = app.clone();
    player.MediaEnded(&TypedEventHandler::new(move |_, _| {
        emit(&a, "completed", None);
        Ok(())
    }))?;
    let a = app.clone();
    player.MediaFailed(&TypedEventHandler::new(move |_, _| {
        emit(&a, "error", Some("playback_failed"));
        Ok(())
    }))?;

    while let Ok(cmd) = rx.recv() {
        match cmd {
            Cmd::Speak {
                text,
                voice_id,
                rate,
            } => {
                let result = (|| -> windows::core::Result<()> {
                    if let Some(id) = voice_id {
                        for v in SpeechSynthesizer::AllVoices()? {
                            if v.Id()?.to_string() == id {
                                synth.SetVoice(&v)?;
                                break;
                            }
                        }
                    }
                    let stream = synth
                        .SynthesizeTextToStreamAsync(&HSTRING::from(text.as_str()))?
                        .join()?;
                    let source = MediaSource::CreateFromStream(&stream, &stream.ContentType()?)?;
                    player.SetSource(&source)?;
                    let _ = player
                        .PlaybackSession()
                        .and_then(|s| s.SetPlaybackRate(rate));
                    player.Play()?;
                    Ok(())
                })();
                match result {
                    Ok(()) => emit(&app, "speaking", None),
                    Err(_) => emit(&app, "error", Some("synth_failed")),
                }
            }
            Cmd::Pause => {
                if player.Pause().is_ok() {
                    emit(&app, "paused", None);
                }
            }
            Cmd::Resume => {
                if player.Play().is_ok() {
                    emit(&app, "speaking", None);
                }
            }
            Cmd::Stop => {
                let _ = player.Pause();
                let _ = player
                    .PlaybackSession()
                    .and_then(|s| s.SetPosition(TimeSpan { Duration: 0 }));
                emit(&app, "idle", None);
            }
            Cmd::Rate(r) => {
                let _ = player.PlaybackSession().and_then(|s| s.SetPlaybackRate(r));
            }
        }
    }
    Ok(())
}

pub fn start(app: AppHandle) -> SpeechTx {
    let (tx, rx) = mpsc::channel::<Cmd>();
    std::thread::spawn(move || {
        if let Err(e) = run(app, rx) {
            eprintln!("[speech] unavailable: {e}");
        }
    });
    SpeechTx(Mutex::new(tx))
}

fn send(tx: &State<SpeechTx>, cmd: Cmd) -> Result<(), String> {
    tx.0.lock()
        .map_err(|_| "failed".to_string())?
        .send(cmd)
        .map_err(|_| "unavailable".to_string())
}

#[tauri::command]
pub fn speech_voices() -> Result<Vec<Voice>, String> {
    let voices = SpeechSynthesizer::AllVoices().map_err(|_| "unavailable".to_string())?;
    let mut out = Vec::new();
    for v in voices {
        if let (Ok(id), Ok(name), Ok(language)) = (v.Id(), v.DisplayName(), v.Language()) {
            out.push(Voice {
                id: id.to_string(),
                name: name.to_string(),
                language: language.to_string(),
            });
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn speech_speak(
    tx: State<SpeechTx>,
    text: String,
    voice_id: Option<String>,
    rate: f64,
) -> Result<(), String> {
    send(
        &tx,
        Cmd::Speak {
            text,
            voice_id,
            rate: rate.clamp(0.5, 3.0),
        },
    )
}

#[tauri::command]
pub fn speech_pause(tx: State<SpeechTx>) -> Result<(), String> {
    send(&tx, Cmd::Pause)
}

#[tauri::command]
pub fn speech_resume(tx: State<SpeechTx>) -> Result<(), String> {
    send(&tx, Cmd::Resume)
}

#[tauri::command]
pub fn speech_stop(tx: State<SpeechTx>) -> Result<(), String> {
    send(&tx, Cmd::Stop)
}

#[tauri::command]
pub fn speech_rate(tx: State<SpeechTx>, rate: f64) -> Result<(), String> {
    send(&tx, Cmd::Rate(rate.clamp(0.5, 3.0)))
}
