# Power Apps Code App — Starter

This is the minimal starter for a [Power Apps Code App](https://learn.microsoft.com/en-us/power-platform/power-apps/maker/canvas-apps/code-apps/overview), generated from the [Power Apps Code App Foundations](https://github.com/martycarreras-psnl/PAppsCAFoundations) template.

## Prerequisites

You need **VS Code** with a coding-agent extension (GitHub Copilot Chat, Claude Code, Cursor, …) signed in — that's how you drive the wizard. All commands below run in the **VS Code terminal** (`` Ctrl+` `` on Windows, `` ⌃` `` on macOS).

**Quick check** — paste this into the terminal to verify everything at once:

```bash
node --version && git --version && dotnet --version && pac help && python3 --version
```

If every line prints a version number with no errors, you're ready to run the wizard.

| Tool | Why it's needed | Minimum |
|------|-----------------|---------|
| **Node.js** | Runs the wizard and all build tooling (installs `npm`) | v20+ |
| **Git** | Version control; the wizard commits scaffolded files | 2.x+ |
| **.NET SDK** | Required by the PAC CLI | 8.x+ |
| **PAC CLI** | Registers and deploys the Code App to Power Platform (`dotnet tool install -g Microsoft.PowerApps.CLI.Tool`) | latest |
| **Python 3** | Recommended — powers the Dataverse-skills plugin | 3.x+ |
| **GitHub CLI** (optional) | Convenience for repo/PR/auth from the terminal | 2.x+ |

**Install notes**

- After installing any tool, **close and reopen the VS Code terminal** so PATH changes take effect.
- Windows: install Node.js from [nodejs.org](https://nodejs.org) (LTS), .NET from [dotnet.microsoft.com](https://dotnet.microsoft.com/download), and tick **"Add python.exe to PATH"** when installing Python. Use `py -3 --version` if `python3` opens the Microsoft Store.
- macOS: easiest via [Homebrew](https://brew.sh): `brew install node@20 git dotnet-sdk python@3`.
- PAC CLI `command not found` after install → add `$HOME/.dotnet/tools` (macOS) or `%USERPROFILE%\.dotnet\tools` (Windows) to PATH, then restart the terminal.

Full step-by-step guide (per-OS, with verification): <https://github.com/martycarreras-psnl/PAppsCAFoundations/blob/main/docs/prerequisite-setup.md>

## Get started

Run the setup wizard. It scaffolds the Code App, configures auth, provisions the Power Platform solution, and (optionally) registers your first connectors and data sources:

**Browser-based wizard (recommended):**

```bash
npx @pacaf/wizard-ux@latest
```

**CLI wizard:**

```bash
npx @pacaf/wizard@latest
```

That's it. The wizard handles `pnpm install`, `pac code init`, dependency selection, and the first smoke test. No `wizard/`, `scripts/`, or `docs/` directory is copied into your repo — those are kept centrally and updated via `npx pacaf-update`.

## Plan first, then build

Don't jump straight into "add a table and a page." Your agent has been pre-loaded with a **planning workflow** that walks you from a fuzzy business problem to a validated Dataverse model and a working app, in deliberate order:

1. **`00a` Business problem decomposition** — what are we solving, for whom, with what outcomes?
2. **`00b` Scope refinement and solution shaping** — workflows, approvals, exceptions, reporting, governance, automation placement
3. **`00c` Solution concept to Dataverse plan** — candidate entities, relationships, lifecycle states
4. **`00d` Prototype validation** — exercise the UX with mock data before schema hardens
5. Then schema, components, connectors, deployment

### Switch your agent into Plan mode

| Agent | How to enter Plan mode |
|---|---|
| **GitHub Copilot Chat** | Switch the mode dropdown to **Agent**, then prefix your first message with `[[PLAN]]` |
| **Claude Code** | Toggle Plan mode (`⌘+Shift+P` → *Claude: Toggle Plan Mode*) or start your message with `/plan` |
| **Cursor** | Use **Composer → Plan** before *Apply* |
| **Other agents** | Tell it explicitly: *"Stay in plan mode. Don't write code yet."* |

Then describe what you want to build in business terms, e.g.:

> *"I want to manage equipment loans across our field offices. Multiple regions, approvers, and an audit trail when assets go missing. Help me plan this out properly before we touch any code or schema."*

The agent works through `00a → 00b → 00c → 00d`, producing a refined scope narrative, a draft conceptual model, a `dataverse/planning-payload.json` you can validate with `pacaf-validate`, and a prototype UX on mock data.

### Then exit Plan mode and build

> *"Looks good. Provision the Dataverse schema, generate the connectors, and deploy to my dev environment."*

```bash
pnpm dev          # local dev server on :3000
pnpm build        # produce ./dist/
pac code push -s "<SolutionUniqueName>"   # upload ./dist/ and add the app to your solution
```

**New to Power Apps Code Apps?** See the [glossary](https://martycarreras-psnl.github.io/PAppsCAFoundations) and the [prototype golden path](https://github.com/martycarreras-psnl/PAppsCAFoundations/blob/main/docs/prototype-golden-path.md) the agent is following.

## What this template gives you

- `.env.template` — environment variable scaffold (the wizard fills it out)
- `.gitignore` — sensible defaults for Power Apps Code Apps
- `.github/copilot-instructions.md` — pointer for VS Code Copilot to load the foundation's agent guidance via `@pacaf/agent-instructions`
- `AGENTS.md` / `CLAUDE.md` — bootstrap pointers so Copilot CLI, Claude Code, Cursor, and other agents know to run the wizard and load the full guidance (the sync replaces these with the full versions)
- This README

After the wizard runs, you will additionally have `src/`, `package.json`, `vite.config.ts`, `power.config.json`, `.github/instructions/`, and everything else needed to build and deploy.

## Updating later

```bash
npx pacaf-update          # refresh @pacaf/scripts and instruction files
npx pacaf-update --check  # only show drift, don't write
```

## Docs

Full guidance lives at <https://martycarreras-psnl.github.io/PAppsCAFoundations>.
