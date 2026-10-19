# Turborepo workspace

The desktop app remains at the repository root so its existing Tauri paths and release workflow keep working. The `apps/website` folder is reserved for the Next.js site you plan to create; it currently contains only a minimal workspace manifest.

The root package is already included in Turborepo. Until the website has its own Next.js scripts, `bun run build:all` and `bun run lint:all` run the desktop package only. After you add `dev`, `build`, and `lint` scripts to the website package, remove the `--filter=//` suffixes from the root `build:all` and `lint:all` scripts to include all workspace packages, then run `bun install` to update `bun.lock`.

Website hosting is intentionally not configured; choose the host and deployment setup when the Next.js site is ready.
