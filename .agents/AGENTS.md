# Project Rules

- **Git Branching & Commits:** After any change, ALWAYS commit and push to a branch (e.g., `dev` or a dedicated backup branch). This must happen independently of whether a deploy was requested or not. It serves as a continuous backup of all changes.
- **Local Development First:** ALWAYS run and test the application locally during development unless the user explicitly requests a production deploy or an online test. Do not deploy to production or remote hosting unprompted. Use local emulators or `npm run dev` / `firebase serve` to preview and test.
