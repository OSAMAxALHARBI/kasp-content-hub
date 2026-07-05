# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-updating mirror and browser for a KAUST cybersecurity program's Google
Drive folder (`KASP_2026_CyS_Content`). A scheduled cloud job mirrors the Drive
folder into `Content/` every few minutes, an indexer turns that into a JSON feed,
and a React web app (hosted on Vercel) browses/previews/downloads the files.

**Live site:** https://kaust-summer.vercel.app · **Repo:** `OSAMAxALHARBI/kasp-content-hub` (public)

## Architecture

One-way pipeline with a strict source-of-truth chain:

```
Google Drive ──rclone sync──► Content/ ──build_hub.py──► Hub/data.json
                                                              │
                          git push (GitHub Actions) ──► Vercel│
                                                        │     │
                                    webapp (React) ◄────┴── fetch data.json (CORS)
```

1. **Sync** — `.github/workflows/sync.yml` runs on GitHub's servers every ~5 min
   (cron) plus manual `workflow_dispatch`. It `rclone sync`s the Drive folder into
   `Content/` (read-only, exporting Google Docs/Slides/Sheets to Office+PDF), then
   **only if `Content/` actually changed** rebuilds the index and pushes. Vercel
   redeploys on push. No local machine is involved. The rclone config (with its
   OAuth token) is stored as the `RCLONE_CONF` GitHub Actions secret.

2. **Indexer** — `scripts/build_hub.py` (stdlib only) walks `Content/`, diffs
   against the previous run, and writes into `Hub/`:
   - `data.json` — the payload the web app fetches: `stats`, a nested folder
     `tree`, top-level `sections` (weeks), a flat `files` list, and a `whatsNew` feed.
   - `.snapshot.json` — last run's `{size, mtime}` per file, used to detect
     added/updated/removed next run.
   - `history.json` — the append-only, capped change log driving New/Updated
     badges and the What's New feed.

3. **Web app** — `webapp/` is a React 19 + Vite 7 + Tailwind v4 + shadcn/ui SPA
   (wouter routing, react-query). Its production build is committed at the **repo
   root** (`index.html` + `assets/`) and served at `/`. It `fetch()`es
   `/Hub/data.json` (same-origin — works on any domain) and links each file to
   `/Content/<rel>` (URL-encoded per segment). `vercel.json` rewrites every path
   except `/Content/*` and `/Hub/*` to `/index.html` for client-side routing.

## Commands

```bash
# Rebuild the file index from Content/ (what the Actions workflow runs)
python scripts/build_hub.py

# Develop / build the web app
cd webapp && npm install
npm run dev          # local dev server
npm run build        # production build -> webapp/dist
```

**Publishing a web-app design change:** after `npm run build`, copy
`webapp/dist/*` to the repo root (replacing `index.html` + `assets/`), commit,
push. `webapp/node_modules` and `webapp/dist` are gitignored; the built output at
root is committed on purpose. Content syncs never touch the web app — they only
change `Content/` and `Hub/data.json`.

## Key invariants — respect these when editing

- **`Content/`, `Hub/data.json`, `Hub/.snapshot.json`, `Hub/history.json` are
  generated artifacts.** Never hand-edit them; regenerate via `build_hub.py`.
- **The web app reads only `data.json`.** Any new data the UI needs must first be
  added to the `payload` dict in `build_hub.py`, then consumed in `webapp/src`.
- **Deploys come from Git, not disk:** only committed files reach Vercel, so
  `Content/`, `Hub/data.json`, and the built `index.html`/`assets/` must stay
  committed (they are — see `.gitignore`).
- **First-run guard:** `build_hub.py` deliberately does *not* flood added/badge
  events for the whole pre-existing library on the initial run; it just captures a
  baseline. Preserve this.
- **Change-detection contract:** the diff keys on relative POSIX path + size +
  `mtime` (2s tolerance). Snapshot fields written must stay in sync with fields
  read in `diff_against_snapshot`.
- **Never hardcode secrets.** The rclone OAuth token lives only in the
  `RCLONE_CONF` Actions secret, never in the repo.

## Safety / config notes

- rclone uses `scope=drive.readonly` pinned to a fixed `root_folder_id` — strictly
  download-only. `rclone sync --max-delete 500` guards against a bad remote
  listing wiping the mirror.
- The repo is **public**, which is what lets the Actions sync use free unlimited
  minutes. `Content/` (including solution/answer-key PDFs) is therefore public by
  design — a deliberate choice by the owner.
