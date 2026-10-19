# MyBuddy releases and updates

## What is configured now

- The app has Tauri's updater plugin registered, and Settings has a manual **Check for updates** action.
- The updater public key is configured in `src-tauri/tauri.conf.json`.
- The matching private key is stored locally at `.tauri/mybuddy.key`. `.tauri/` and `*.key` are ignored by Git; do not commit or paste the private key.
- The GitHub release workflow runs for version tags such as `v0.2.0`, builds Windows NSIS and MSI installers, and publishes signed updater artifacts plus `latest.json`.
- The Tauri updater feed prefers NSIS. Use the NSIS `.exe` installer for the first updater-enabled install.
- The updater key was generated without a password. In GitHub Actions, set `TAURI_SIGNING_PRIVATE_KEY`; leave the optional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` unset.

## Finish one-time GitHub setup

1. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**.
2. Name it `TAURI_SIGNING_PRIVATE_KEY`. Open `.tauri/mybuddy.key` locally, copy its entire contents into the secret value, and save it. Never paste that value into chat, an issue, or a source file.
3. Add a repository variable named `MYBUDDY_GOOGLE_CLIENT_ID` if Google Calendar should be configured in automated builds. The client ID is separate from updater signing.
4. The workflow's `GITHUB_TOKEN` is supplied by GitHub automatically; no personal access token is needed for the configured release workflow.
5. Keep a secure backup of the private key. Losing it prevents signing future updater packages trusted by already released apps. Do not regenerate the key after users install a build containing this public key.

The private key currently has no password. Protect the local file and GitHub secret access. If you want password protection, generate and configure a password-protected key before publishing the first updater-enabled app; then store the password as `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` too.

## First updater-enabled release

1. Confirm the GitHub secret and any needed Google client ID variable are set.
2. Commit the code, including the public key in `src-tauri/tauri.conf.json`. The private key file stays local and ignored.
3. The configured app version is currently `0.2.0`. Push a tag named exactly `v0.2.0` to start the release workflow.
4. GitHub Actions builds the app and publishes the installer, signed update package, and `latest.json` on the GitHub Release.
5. Install the `0.2.0` NSIS setup `.exe` manually once. An older `0.1.0` installation has no updater code and cannot update itself.
6. After that, users can open **Settings → Updates → Check** and choose to install a newer version when offered.

Do not create the first release until the public key is committed and the matching private key secret is set.

## Publish a later app update

1. Set the same new version in the root `package.json` and `src-tauri/tauri.conf.json` (for example, `0.2.1`).
2. Commit and push the changes, then push a matching tag such as `v0.2.1`.
3. GitHub Actions builds and publishes the signed release. The updater feed points installed apps to its update package.
4. The user opens MyBuddy's Updates setting, checks, and chooses to install. The app downloads the package and Tauri verifies its signature against the embedded public key before installation.

The updater checks only when the user asks; automatic background checks are not currently configured. The repository pins Bun 1.4.3 for dependency installation and release builds.

## Turborepo workspace preparation

The desktop app remains at the repository root so existing Tauri paths and the release workflow keep working. The root package is configured as a workspace root for packages under `apps/*`, and Turborepo tasks are defined in `turbo.json`.

The `apps/website` folder is reserved for your Next.js site and currently contains only a minimal workspace manifest. Until you add the Next.js scripts, `bun run build:all` and `bun run lint:all` run the desktop package only. After adding `dev`, `build`, and `lint` scripts to the website package, remove the `--filter=//` suffixes from the root `build:all` and `lint:all` scripts so Turborepo includes all workspaces. Then run `bun install` to update `bun.lock`. Website hosting/deployment is not selected here. The existing `website/` folder and GitHub Pages workflow are the old static site and should be replaced or removed when the Next.js site is ready.
