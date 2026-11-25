# MyBuddy

**A little buddy, always close by.**

MyBuddy brings a Notch to your Windows laptop. Pick any photo for it, add a friendly spider, and keep quick actions, reminders and your calendar one glance away, without opening another window.

[Download for Windows](https://github.com/vedantchavare04/myBuddy-releases/releases/latest/download/MyBuddy-Setup.exe) · [Privacy Policy](https://mybuddy.vedant-chavare.xyz/privacy) · [Releases](https://github.com/vedantchavare04/myBuddy-releases/releases) · [Report a problem](https://github.com/vedantchavare04/mybuddy/issues)

> The source is public so you can read it and suggest improvements. MyBuddy is **not open source**: all rights are reserved. See [License](#license).

---

## Contents

- [Features](#features)
- [Install and update](#install-and-update)
- [Google Calendar and your privacy](#google-calendar-and-your-privacy)
- [Project structure](#project-structure)
- [Development](#development)
- [Releasing an update](#releasing-an-update)
- [One-time release setup](#one-time-release-setup)
- [Troubleshooting releases](#troubleshooting-releases)
- [Built with](#built-with)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Features

- **Your wallpaper, in your Notch.** Choose a photo and make the Notch your own. The photo stays on your device.
- **A friendly spider.** It hangs from your Notch in a mood and color that suit you, and you can switch it off.
- **Quick actions.** Search and launch an installed app, open your day planner, and reach everyday tools without leaving what you're doing.
- **Gentle reminders.** Little nudges that help you keep your word.
- **Google Calendar.** See your upcoming events and schedule new ones right from the Notch.
- **Everyday tools.** Clipboard history, memory, tasks, context saver, promise keeper, focus tools, translate, text to speech and an AI helper.
- **Music and notifications.** Playback controls and a quieter notification tray, close by.

## Install and update

### Install

1. Download `MyBuddy-Setup.exe` from the [latest release](https://github.com/vedantchavare04/myBuddy-releases/releases/latest).
2. Run the installer.
3. MyBuddy appears at the top of your screen. Hover or click the Notch to open it.

Requires Windows 10 or 11.

### Update

MyBuddy updates itself with Tauri's updater, and updates only happen when you ask:

1. Open MyBuddy's **Settings** and find **Updates**.
2. Choose **Check for updates**.
3. If a new version is available, choose to install it. The app downloads the package, Tauri verifies its signature against the public key built into the app, then installs it.
4. Restart MyBuddy to finish.

The app does not check in the background.

## Google Calendar and your privacy

Connecting Google Calendar is optional. When you do:

- MyBuddy asks for one permission, `calendar.events`, and uses it only to **list your upcoming events** and **create events you schedule**. It never edits or deletes existing events.
- Sign-in happens in your own browser on Google's page (OAuth 2.0 with PKCE). MyBuddy never sees your password.
- The only thing stored is a refresh token, kept in **Windows Credential Manager** on your computer. Access tokens live in memory and are discarded when the app closes.
- Your calendar data moves only between your computer and Google. It is not sent to a MyBuddy server, and it is not used for ads, analytics or AI training.
- **Disconnect** in the app revokes the token with Google and deletes it locally. You can also revoke access any time at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

Read the full [Privacy Policy](https://mybuddy.vedant-chavare.xyz/privacy).

MyBuddy's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Project structure

```
mybuddy/
├── src/                    Desktop app interface (React, Vite, Tailwind)
│   ├── components/notch/   The Notch shell and all of its views
│   ├── services/           Calendar, reminders, settings, AI, media and more
│   ├── events/             Event queue and lifecycle
│   ├── physics/            Spider rope physics
│   └── system/             Battery monitor, window positioning
├── src-tauri/              Native shell (Rust, Tauri)
│   ├── src/google.rs       Google Calendar OAuth and API calls
│   ├── tauri.conf.json     App version, bundle targets, updater config
│   ├── capabilities/       Tauri permissions (includes updater)
│   └── icons/
├── apps/
│   ├── web/                Marketing site and privacy page (Next.js)
│   └── website/            Reserved workspace for a future site
├── website/                Old static download page (to be removed)
├── docs/
│   └── releases-and-updates.md
├── .github/workflows/
│   └── release.yml         Builds and publishes a release on a version tag
├── LICENSE.md              License (all rights reserved)
├── CONTRIBUTING.md         How to suggest changes
├── SECURITY.md             How to report a vulnerability
├── package.json            Root app package and workspace config
└── turbo.json              Turborepo tasks
```

Releases are published to a separate repository, [`myBuddy-releases`](https://github.com/vedantchavare04/myBuddy-releases). The download button and the in-app updater both read from there, including `latest.json`.

## Development

### Prerequisites

- [Bun](https://bun.sh) 1.4.3 (the repo pins this version)
- [Rust](https://www.rust-lang.org/tools/install) and the [Tauri prerequisites for Windows](https://tauri.app/start/prerequisites/)
- Node.js 22 (used by CI)

### Run the desktop app

```powershell
bun install
bun run tauri dev
```

This starts Vite on `http://localhost:5173` and opens the app window.

### Other scripts

```powershell
bun run dev        # Vite only, in the browser
bun run build      # Type-check and build the frontend
bun run lint       # ESLint
```

### Run the website

```powershell
cd apps/web
bun dev
```

The site is served at `http://localhost:3000`, and the privacy page at `/privacy`.

### Build an installer locally

Updater artifacts are enabled (`createUpdaterArtifacts: true`), so a local build needs the signing key:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content .tauri/mybuddy.key -Raw
bun run tauri build --bundles nsis,msi
```

Installers are written to `src-tauri/target/release/bundle/`. Releases to users are built by GitHub Actions, not locally.

### Google Calendar setup

Calendar needs a Google OAuth client:

1. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth client of type **Desktop app**.
2. Enable the **Google Calendar API** and add the `calendar.events` scope on the consent screen.
3. Set these environment variables, either at runtime or at build time (they are read in `src-tauri/src/google.rs`):

```powershell
$env:MYBUDDY_GOOGLE_CLIENT_ID = "your-client-id"
$env:MYBUDDY_GOOGLE_CLIENT_SECRET = "your-client-secret"
```

Google requires the client secret even for desktop apps, and it is not confidential for installed apps. Without these values, the Calendar view says Google Calendar isn't set up. For CI builds, the same values are supplied as GitHub Actions settings (see [One-time release setup](#one-time-release-setup)).

## Releasing an update

Only the maintainer publishes releases. A release is triggered by pushing a **git tag** that matches the version in `src-tauri/tauri.conf.json`. GitHub Actions then builds, signs and publishes everything.

### The rule that matters

The tag must be `v` plus the `version` in `src-tauri/tauri.conf.json`. The workflow reads that file and fails the build if they differ. For example, `"version": "0.2.9"` needs the tag `v0.2.9`.

### Step by step

**1. Check the current version.** Look at what is in the config and what is already tagged:

```powershell
(Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json).version
git tag --list "v*" --sort=-v:refname | Select-Object -First 5
```

**2. Choose the next version.** It must be higher than the version users have installed, or the updater will say they are up to date. Use [semantic versioning](https://semver.org): `0.2.9` for a fix, `0.3.0` for a new feature.

**3. Bump the version in both files:**

| File | Field |
| --- | --- |
| `src-tauri/tauri.conf.json` | `"version"` (the one the workflow checks) |
| `package.json` | `"version"` (keep it identical) |

`src-tauri/Cargo.toml` has its own version (`0.1.0`). It is not used for releases, so you can leave it.

**4. Check the repository is clean and builds:**

```powershell
bun install
bun run lint
bun run build
git status
```

If `bun install` changes `bun.lock`, commit it. CI installs with `--frozen-lockfile` and fails if the lockfile is out of date.

**5. Commit and push the code:**

```powershell
git add .
git commit -m "Release 0.2.9"
git push origin main
```

**6. Create and push the tag, taking the version from `tauri.conf.json` so they can't drift:**

```powershell
$v = (Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json).version
git tag "v$v"
git push origin "v$v"
```

Pushing the tag starts the **Build and publish MyBuddy** workflow.

**7. Watch the build.** Open the repository's **Actions** tab. A run takes several minutes on a Windows runner.

**8. Verify the release** once the run is green:

```powershell
curl.exe -sL https://github.com/vedantchavare04/myBuddy-releases/releases/latest/download/latest.json
```

The `version` in that JSON should be the one you just released. Also check that the release page lists the installer and signature files.

**9. Test the update.** On a machine running the previous version, open **Settings → Updates → Check for updates**. It should offer the new version.

### What the workflow does

1. Checks out the source, then sets up Node 22, Bun 1.4.3 and Rust.
2. Runs `bun install --frozen-lockfile`.
3. Validates the release: tag matches `tauri.conf.json`, the signing key and release token exist, and the updater public key is not a placeholder. Missing Google values only produce warnings.
4. Builds NSIS and MSI installers with `tauri-action`, signs the update package, and publishes the release to `myBuddy-releases`, including `latest.json`.
5. Uploads a copy of the installer as `MyBuddy-Setup.exe`. That stable filename is what the website's Download button links to, so the link always gets the newest version.

The updater prefers the NSIS installer.

### Quick reference

```powershell
# bump version in tauri.conf.json and package.json, then:
git add .
git commit -m "Release X.Y.Z"
git push origin main
$v = (Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json).version
git tag "v$v"
git push origin "v$v"
```

### Useful tag commands

```powershell
git tag --list "v*"                 # local tags
git ls-remote --tags origin         # tags on GitHub
git show v0.2.9                     # what a tag points to
```

### Fixing a wrong tag

If you tagged the wrong version or the build failed before publishing:

```powershell
git tag -d v0.2.9
git push origin --delete v0.2.9
```

Fix the problem, commit, and create the tag again. If the workflow already published a release to `myBuddy-releases`, delete that release on GitHub as well before reusing the tag. Once users have installed a version, prefer releasing a new patch number over reusing an old one.

## One-time release setup

These are configured once, in the repository's **Settings → Secrets and variables → Actions**. Never paste secret values into chat, issues or source files.

| Name | Type | Purpose |
| --- | --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | Secret | Signs update packages. Paste the full contents of `.tauri/mybuddy.key`. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Secret | Only if the key has a password. The current key has none, so leave it unset. |
| `MYBUDDY_RELEASES_TOKEN` | Secret | Fine-grained token for `myBuddy-releases` with **Contents: Read and write**. Lets CI publish releases there. |
| `MYBUDDY_GOOGLE_CLIENT_ID` | Variable | Google OAuth client ID, baked into the build. |
| `MYBUDDY_GOOGLE_CLIENT_SECRET` | Secret | Google OAuth client secret, baked into the build. |

Also make sure:

- The `myBuddy-releases` repository has a `main` branch. A README commit is enough, since the workflow creates release tags on it.
- The updater public key in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`) matches your private key.
- The updater endpoint in the same file points to `myBuddy-releases/releases/latest/download/latest.json`.

### Protect the repository

Because the repository is public, set these up under **Settings → Rules → Rulesets** so only the maintainer can change `main` or publish a release:

- **Branch ruleset for `main`:** require a pull request before merging, with the repository admin on the bypass list.
- **Tag ruleset for `v*`:** restrict creations, updates and deletions, with the repository admin on the bypass list. Pushing a `v*` tag starts a signed release, so this matters.
- **Settings → Advanced Security:** turn on Dependabot alerts and security updates, secret scanning, push protection and private vulnerability reporting.

### Protect the signing key

- `.tauri/` and `*.key` are in `.gitignore`. Never commit the private key.
- **Keep a secure backup.** If you lose the key you can't sign updates that already installed apps will trust.
- **Never regenerate the key** after users have installed a build containing the current public key. Their apps would reject every future update, and they would have to reinstall manually.

### Updating from an older install

Apps installed before the public update feed existed still point to the old feed and can't find new releases. Those users need to install the newest `MyBuddy-Setup.exe` once by hand. After that, the in-app updater works.

## Troubleshooting releases

| Symptom | Cause and fix |
| --- | --- |
| `Release tag must be vX.Y.Z to match tauri.conf.json` | The tag and the config version differ. Delete the tag, fix the version or the tag, and push again. |
| `Add the TAURI_SIGNING_PRIVATE_KEY repository secret` | The secret is missing. Add it under Actions secrets. |
| `Add the MYBUDDY_RELEASES_TOKEN repository secret` | The release token is missing or expired. Create a new fine-grained token and update the secret. |
| `Replace the updater public-key placeholder` | `pubkey` in `tauri.conf.json` still has a placeholder value. |
| `bun install --frozen-lockfile` fails | `bun.lock` is out of date. Run `bun install`, commit `bun.lock`, and tag again. |
| App says "You're up to date" but a newer release exists | The new version isn't higher than the installed one, or `latest.json` is missing. Check its `version` with the `curl.exe` command above. |
| Google Calendar isn't set up in a released app | `MYBUDDY_GOOGLE_CLIENT_ID` or `MYBUDDY_GOOGLE_CLIENT_SECRET` was empty when the release was built. Set them and release again. |
| Update fails with a signature error | The release was signed with a key that doesn't match the app's public key. Don't change the key. |

More detail is in [`docs/releases-and-updates.md`](docs/releases-and-updates.md).

## Built with

- [Tauri 2](https://tauri.app) and Rust
- React 19, Vite, Tailwind CSS 4, Zustand and Framer Motion
- Next.js for the website
- [Lucide](https://lucide.dev) icons
- Bun and Turborepo
- GitHub Actions for releases and Dependabot for dependency updates

## Contributing

Bug reports and improvements are welcome. To suggest a change:

1. [Open an issue](https://github.com/vedantchavare04/mybuddy/issues) to describe a bug or an idea, or go straight to a pull request for a small fix.
2. Fork the repository and make your change on a new branch.
3. Run `bun run lint` and `bun run build`.
4. Open a pull request against `main` describing what changed and why.

Only the maintainer can merge pull requests. By submitting a contribution, you confirm you have the right to submit it and you grant the copyright holder the license described in [LICENSE.md](LICENSE.md). See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Security

Please don't report security problems in a public issue. Use the **Report a vulnerability** button on this repository's Security tab. See [SECURITY.md](SECURITY.md).

## License

Copyright © 2026 Vedant Chavare. All rights reserved.

The source is public so you can read it and contribute through pull requests. MyBuddy is not open source: you may not copy, redistribute, sell or build products from it without written permission. See [LICENSE.md](LICENSE.md).

The MyBuddy name and logo are not covered by any permission. Please don't use them for modified versions or other products.

