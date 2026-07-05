# KASP Content Hub

A self-updating mirror and browser for the KASP 2026 cybersecurity program's
course files. A scheduled job syncs a Google Drive folder every few minutes,
and a web app lets you browse, preview, and download everything.

**Live site:** https://kasp-content-hub.vercel.app

## How it works

```
Google Drive  ──rclone sync──►  Content/  ──build_hub.py──►  Hub/data.json
                                                                    │
                              git push (GitHub Actions) ──► Vercel  │
                                                            │       │
                                        webapp (React) ◄────┴── fetch data.json
```

- **Sync** — a GitHub Actions workflow (`.github/workflows/sync.yml`) runs every
  ~5 minutes. It mirrors the Drive folder into `Content/` with `rclone`
  (read-only), rebuilds the index, and pushes any changes. Vercel redeploys
  automatically. No computer needs to be running.
- **Index** — `scripts/build_hub.py` walks `Content/`, tracks what's new/updated/
  removed, and writes `Hub/data.json` (stats, folder tree, file list, activity feed).
- **Web app** — a React + Vite single-page app (`webapp/`) served at the site
  root. It fetches `Hub/data.json` and links each file to `Content/<path>` for
  in-browser preview (PDFs, images) or download.

## Project layout

```
├─ Content/                 mirrored Drive files (source of truth)
├─ Hub/data.json            generated file index the web app reads
├─ webapp/                  React app source
├─ index.html + assets/     built web app (served at /)
├─ scripts/build_hub.py     indexer
├─ .github/workflows/       scheduled sync
└─ vercel.json              hosting config
```

## Developing the web app

```bash
cd webapp
npm install
npm run dev        # local dev server
npm run build      # production build -> webapp/dist
```

After a production build, copy `webapp/dist/*` to the repo root (replacing
`index.html` and `assets/`) and commit. Content syncs never touch the web app —
they only update `Content/` and `Hub/data.json`.
