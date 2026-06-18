# Contributing

This repository is a **Power Apps Code App** generated from the [Power Apps Code App Foundations](https://github.com/martycarreras-psnl/PAppsCAFoundations) template. There are two different things you might want to contribute to — this app, or the Foundations tooling behind it.

This project welcomes contributions and suggestions. Most contributions require you to
agree to a Contributor License Agreement (CLA) declaring that you have the right to,
and actually do, grant us the rights to use your contribution. For details, visit
https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need
to provide a CLA and decorate the PR appropriately (e.g., status check, comment). Simply
follow the instructions provided by the bot. You will only need to do this once across
all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Contributing to this Code App

1. **Clone the repository** and create a feature branch.
2. **Install dependencies and run the app locally:**
   ```bash
   pnpm install
   pnpm dev
   ```
   The Power Apps SDK requires local dev on **port 3000** — do not change it.
3. **Make your changes** following the agent guidance in `.github/instructions/`.
4. **Run the test suite** before opening a PR:
   ```bash
   pnpm test
   pnpm lint
   ```
5. **Open a pull request** against `main`.

### Guidelines

- This is a Power Apps Code App. Do **not** introduce non-Power-Platform hosting targets (Vercel, Netlify, Azure SWA), alternative frameworks (Next.js, Angular, Vue), or CSS libraries other than Fluent UI v9.
- `src/generated/` is **read-only** — it is produced by `pac code add-data-source`. Wrap generated services with adapters under `src/services/`.
- Three-layer architecture: components render, hooks orchestrate, services expose contracts.
- Use `HashRouter`, never `BrowserRouter` (the Power Apps host owns the URL path).
- No secrets in source. `.env.local` is gitignored; client secrets are encrypted at rest.
- Use conventional commit messages: `fix:`, `feat:`, `chore:`, `docs:`.

## Contributing to the Foundations tooling

The wizard, helper scripts, and coding-agent instruction files are **not** part of this repo — they are published as `@pacaf/*` npm packages and synced in. If you want to fix or improve the tooling itself (wizard steps, instruction files, validation scripts), contribute upstream at:

**https://github.com/martycarreras-psnl/PAppsCAFoundations**

See that repository's `CONTRIBUTING.md` for the changeset and publishing workflow. Changes published there reach this repo via `npx pacaf-update`.

## Reporting Issues

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your OS and Node.js version

For security vulnerabilities, see [SECURITY.md](SECURITY.md).
