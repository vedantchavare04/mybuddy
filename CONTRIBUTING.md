# Contributing to MyBuddy

Thanks for wanting to help! MyBuddy's source is public so you can read it and suggest improvements.

Please note that MyBuddy is **not open source**. All rights are reserved, as described in [LICENSE.md](LICENSE.md). You are welcome to fork the repository on GitHub to propose changes to this project, but you may not copy or reuse the code for anything else.

## Ways to help

- **Report a bug.** [Open an issue](https://github.com/vedantchavare04/mybuddy/issues) and describe what you did, what you expected and what happened. Your Windows version, the MyBuddy version (Settings → Updates) and a screenshot help a lot.
- **Suggest an idea.** Open an issue and explain the problem you'd like solved, not just the feature.
- **Fix something.** For a small fix, go straight to a pull request. For a bigger change, open an issue first so we can agree on the approach before you spend time on it.

Security problems are the exception. Please don't post them publicly. See [SECURITY.md](SECURITY.md).

## Sending a pull request

1. **Fork** the repository on GitHub.
2. **Clone** your fork and create a branch for your change:

   ```powershell
   git clone https://github.com/<your-username>/mybuddy.git
   cd mybuddy
   git checkout -b my-change
   ```

3. **Install and run the app** (see the [Development section](README.md#development) of the README):

   ```powershell
   bun install
   bun run tauri dev
   ```

4. **Make your change.** Keep it focused on one thing, and match the style of the surrounding code.
5. **Check it works:**

   ```powershell
   bun run lint
   bun run build
   ```

6. **Commit and push** to your fork:

   ```powershell
   git add .
   git commit -m "Short description of the change"
   git push origin my-change
   ```

7. **Open a pull request** against `main` on this repository. Explain what changed and why, and include a screenshot for visual changes.

Only the maintainer can merge pull requests. Feedback may be requested, and a pull request may be declined if it doesn't fit the direction of the project.

## What happens after your change is merged

MyBuddy has two parts, and they go live in different ways.

| Part | Where it lives | How it reaches people |
| --- | --- | --- |
| **Desktop app** | `src/` and `src-tauri/` | Needs a **release**. The maintainer bumps the version and pushes a git tag such as `v0.2.9`, and GitHub Actions builds, signs and publishes the update. Until then, installed apps don't change. |
| **Website** | `apps/web/` (including the privacy page) | No tag needed. It goes live when the website is next deployed. |

Contributors never create tags or releases. Please leave that to the maintainer. A merged app change may wait for the next release before users see it. Docs-only changes (README, CONTRIBUTING, SECURITY) don't need a release either.

## Guidelines

- One change per pull request.
- Don't add new dependencies unless they're clearly needed, and say why in the description.
- Never commit secrets, keys, tokens or `.env` files.
- Don't change the version number, create tags, or edit the updater settings or the release workflow. The maintainer handles releases.
- Be kind. Everyone here is volunteering their time.

## License of contributions

By submitting a pull request or any other contribution, you confirm that you wrote it or have the right to submit it, and you grant the copyright holder (Vedant Chavare) a perpetual, worldwide, royalty-free license to use, modify and distribute it as part of MyBuddy, under any terms the copyright holder chooses. Your contribution does not give you any rights over MyBuddy itself.
