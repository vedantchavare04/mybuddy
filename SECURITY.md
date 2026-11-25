# Security Policy

MyBuddy can launch apps, read your clipboard and connect to your Google Calendar, so security matters. Thank you for helping keep it safe.

## Reporting a vulnerability

**Please don't report security problems in a public issue, pull request or discussion.**

Report them privately instead:

1. Go to the [Security tab](https://github.com/vedantchavare04/mybuddy/security) of this repository.
2. Click **Report a vulnerability**.
3. Describe the problem.

Please include:

- What the problem is and where it is (file, feature or screen).
- Steps to reproduce it.
- What an attacker could do with it.
- The MyBuddy version (Settings → Updates) and your Windows version.

Please don't include real passwords, tokens or personal data in your report.

## What to expect

- Reports are read and acknowledged as soon as possible. MyBuddy is maintained by one person, so please be patient.
- Confirmed problems are fixed in a new release, and you'll be told when it's out.
- Please give a reasonable amount of time to fix an issue before you share it publicly.

## Supported versions

Only the **latest release** receives security fixes. Please update from Settings → Updates, or download the newest installer from the [releases page](https://github.com/vedantchavare04/myBuddy-releases/releases/latest).

## Scope

Examples of things worth reporting:

- A way to read or steal the stored Google refresh token or other credentials.
- A flaw in how updates are downloaded, verified or installed.
- A way to make MyBuddy run code or open files without the user's action.
- Leaked secrets, keys or tokens in the repository or in a release.
- Problems on the website that expose visitor data.

Things that are generally out of scope:

- Problems that need full access to your unlocked computer or administrator rights.
- Vulnerabilities in other software, such as Windows, Google or third-party libraries, with no way to exploit them through MyBuddy.
- Missing security headers or best-practice suggestions with no demonstrated impact.

## Your Google data

MyBuddy only requests the `calendar.events` permission, stores only a refresh token in Windows Credential Manager, and sends calendar data only between your computer and Google. You can revoke MyBuddy's access at any time at [myaccount.google.com/permissions](https://myaccount.google.com/permissions). See the [Privacy Policy](https://mybuddy.vedant-chavare.xyz/privacy) for details.
