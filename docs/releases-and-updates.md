# MyBuddy releases and updates

## What is configured now

- The app has Tauri's updater plugin registered, and Settings has a manual **Check for updates** action.
- The updater public key is configured in `src-tauri/tauri.conf.json`.
- The matching private key is stored locally at `.tauri/mybuddy.key`. `.tauri/` and `*.key` are ignored by Git; do not commit or paste the private key.
- The GitHub release workflow runs for version tags such as `v0.2.0`, builds Windows NSIS and MSI installers in the private source repository, and publishes signed updater artifacts plus `latest.json` to the public `myBuddy-releases` repository.
- The Tauri updater feed prefers NSIS. Use the NSIS `.exe` installer for the first updater-enabled install.
- The updater key was generated without a password. In GitHub Actions, set `TAURI_SIGNING_PRIVATE_KEY`; leave the optional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` unset.

## Finish one-time GitHub setup

1. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**.
2. Name it `TAURI_SIGNING_PRIVATE_KEY`. Open `.tauri/mybuddy.key` locally, copy its entire contents into the secret value, and save it. Never paste that value into chat, an issue, or a source file.
3. Add a repository variable named `MYBUDDY_GOOGLE_CLIENT_ID` and a repository secret named `MYBUDDY_GOOGLE_CLIENT_SECRET` if Google Calendar should be configured in automated builds. Google desktop apps are public clients: the client secret is embedded in the distributed app and cannot be kept confidential. It is unrelated to updater signing.
4. Create a fine-grained personal access token limited to the `myBuddy-releases` repository with **Contents: Read and write**, then save it as the `MYBUDDY_RELEASES_TOKEN` Actions secret in the private `mybuddy` source repository. The token is only used by CI to publish release assets; never put it in the app or source files.
5. Ensure the public `myBuddy-releases` repository has a `main` branch (a README commit is enough); the workflow creates release tags on that branch.
6. Keep a secure backup of the updater private key. Losing it prevents signing future updater packages trusted by already released apps. Do not regenerate the key after users install a build containing this public key.

The private key currently has no password. Protect the local file and GitHub secret access. If you want password protection, generate and configure a password-protected key before publishing the first updater-enabled app; then store the password as `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` too.

## First release using the public update feed

1. Confirm the GitHub secrets `TAURI_SIGNING_PRIVATE_KEY`, `MYBUDDY_RELEASES_TOKEN`, and (if enabling Calendar) `MYBUDDY_GOOGLE_CLIENT_SECRET`, plus the `MYBUDDY_GOOGLE_CLIENT_ID` repository variable, are set in the private source repository.
2. Ensure the public `myBuddy-releases` repository has a `main` branch. The private source repository already has a `v0.2.0` release; the next public-feed release should use a new version, such as `0.2.1`.
3. Set the same new version in the root `package.json` and `src-tauri/tauri.conf.json`, commit the changes, and push them to the private source repository. The updater private key stays local and ignored; only its matching public key is committed.
4. Push the matching tag, for example `v0.2.1`. GitHub Actions builds the app and publishes the installer, signed update package, and `latest.json` to the public `myBuddy-releases` repository.
5. Install the public-feed version's NSIS setup `.exe` manually once. An already installed `0.2.0` app still points to the old private update feed, so it cannot discover this new release.
6. For a full updater test, publish `0.2.2` afterward, then open the manually installed `0.2.1` app and check for updates.

Do not publish until the public key is committed and the matching private key and release-publisher token secrets are set.

## Publish a later app update

1. Set the same new version in the root `package.json` and `src-tauri/tauri.conf.json` (for example, `0.2.1`).
2. Commit and push the changes, then push a matching tag such as `v0.2.1`.
3. GitHub Actions builds and publishes the signed release to `myBuddy-releases`. The updater feed points installed apps to its update package.
4. The user opens MyBuddy's Updates setting, checks, and chooses to install. The app downloads the package and Tauri verifies its signature against the embedded public key before installation.

The updater checks only when the user asks; automatic background checks are not currently configured. The repository pins Bun 1.4.3 for dependency installation and release builds.

## Turborepo workspace preparation

The desktop app remains at the repository root so existing Tauri paths and the release workflow keep working. The root package is configured as a workspace root for packages under `apps/*`, and Turborepo tasks are defined in `turbo.json`.

The `apps/website` folder is reserved for your Next.js site and currently contains only a minimal workspace manifest. Until you add the Next.js scripts, `bun run build:all` and `bun run lint:all` run the desktop package only. After adding `dev`, `build`, and `lint` scripts to the website package, remove the `--filter=//` suffixes from the root `build:all` and `lint:all` scripts so Turborepo includes all workspaces. Then run `bun install` to update `bun.lock`. Website hosting/deployment is not selected here. The existing `website/` folder and GitHub Pages workflow are the old static site and should be replaced or removed when the Next.js site is ready.
