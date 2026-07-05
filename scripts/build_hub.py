#!/usr/bin/env python3
"""
build_hub.py - Scan the mirrored Content/ folder and regenerate the web app's
data feed (Hub/data.json).

This is the single source of truth for the dashboard: after every rclone sync
we walk the real files on disk, detect what is new / updated / removed compared
to the previous run, persist a change history, and emit a JSON payload that the
web app (webapp/, served at the site root) fetches. Because the app reads only
this generated file, the UI is always 100% consistent with what is on disk.

Standard library only. Safe to run repeatedly.
"""

from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# ----------------------------------------------------------------------------
# Paths
# ----------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = PROJECT_ROOT / "Content"
HUB_DIR = PROJECT_ROOT / "Hub"
DATA_JSON_FILE = HUB_DIR / "data.json"
SNAPSHOT_FILE = HUB_DIR / ".snapshot.json"
HISTORY_FILE = HUB_DIR / "history.json"

ROOT_DISPLAY_NAME = "KASP 2026 - Cybersecurity Content"

# Files created by the tooling itself - never show them as content.
IGNORED_NAMES = {".snapshot.json", "history.json", "data.js", "data.json", "desktop.ini", "Thumbs.db"}
IGNORED_SUFFIXES = {".tmp", ".partial"}

# How long a file keeps its NEW / UPDATED badge (days).
BADGE_WINDOW_DAYS = 7
# How many events to keep in the persisted history / show in the feed.
HISTORY_CAP = 800
WHATS_NEW_CAP = 120


# ----------------------------------------------------------------------------
# File type classification
# ----------------------------------------------------------------------------
TYPE_BY_EXT = {
    "pdf": "pdf",
    "doc": "doc", "docx": "doc", "odt": "doc", "rtf": "doc", "pages": "doc",
    "ppt": "ppt", "pptx": "ppt", "odp": "ppt", "key": "ppt",
    "xls": "xls", "xlsx": "xls", "csv": "xls", "ods": "xls", "numbers": "xls",
    "png": "image", "jpg": "image", "jpeg": "image", "gif": "image",
    "webp": "image", "svg": "image", "bmp": "image", "tiff": "image",
    "tif": "image", "heic": "image", "ico": "image",
    "mp4": "video", "mov": "video", "avi": "video", "mkv": "video",
    "webm": "video", "wmv": "video", "flv": "video", "m4v": "video",
    "mp3": "audio", "wav": "audio", "flac": "audio", "m4a": "audio",
    "aac": "audio", "ogg": "audio", "wma": "audio",
    "zip": "archive", "rar": "archive", "7z": "archive", "tar": "archive",
    "gz": "archive", "bz2": "archive", "xz": "archive",
    "py": "code", "js": "code", "ts": "code", "jsx": "code", "tsx": "code",
    "java": "code", "c": "code", "cpp": "code", "h": "code", "cs": "code",
    "go": "code", "rs": "code", "rb": "code", "php": "code", "html": "code",
    "css": "code", "json": "code", "xml": "code", "yaml": "code", "yml": "code",
    "sh": "code", "ps1": "code", "ipynb": "code", "sql": "code", "r": "code",
    "txt": "text", "md": "text", "log": "text", "cfg": "text", "ini": "text",
}


def classify(name: str) -> tuple[str, str]:
    """Return (extension_lower, type_category) for a file name."""
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    return ext, TYPE_BY_EXT.get(ext, "file")


def is_ignored(path: Path) -> bool:
    if path.name in IGNORED_NAMES:
        return True
    if path.suffix.lower() in IGNORED_SUFFIXES:
        return True
    if path.name.startswith("~$"):  # office lock files
        return True
    return False


# ----------------------------------------------------------------------------
# Persistence helpers
# ----------------------------------------------------------------------------
def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ----------------------------------------------------------------------------
# Filesystem walk
# ----------------------------------------------------------------------------
def walk_content() -> dict:
    """Walk Content/ and return {rel_posix_path: {name, size, mtime, ...}}."""
    files: dict[str, dict] = {}
    if not CONTENT_DIR.exists():
        return files
    for path in CONTENT_DIR.rglob("*"):
        if path.is_dir() or is_ignored(path):
            continue
        try:
            stat = path.stat()
        except OSError:
            continue
        rel = path.relative_to(CONTENT_DIR).as_posix()
        ext, ftype = classify(path.name)
        files[rel] = {
            "name": path.name,
            "rel": rel,
            "dir": path.parent.relative_to(CONTENT_DIR).as_posix()
            if path.parent != CONTENT_DIR else "",
            "size": stat.st_size,
            "mtime": stat.st_mtime,
            "ext": ext,
            "type": ftype,
            "abs": str(path),
        }
    return files


# ----------------------------------------------------------------------------
# Change detection
# ----------------------------------------------------------------------------
def diff_against_snapshot(files: dict, snapshot: dict) -> list[dict]:
    """Compare current files with previous snapshot, return change events."""
    events: list[dict] = []
    now = iso_now()
    for rel, info in files.items():
        prev = snapshot.get(rel)
        if prev is None:
            events.append(_event(info, "added", now))
        elif info["size"] != prev.get("size") or \
                abs(info["mtime"] - prev.get("mtime", 0)) > 2:
            events.append(_event(info, "updated", now))
    for rel, prev in snapshot.items():
        if rel not in files:
            events.append({
                "rel": rel, "name": prev.get("name", rel.split("/")[-1]),
                "event": "removed", "time": now,
                "type": prev.get("type", "file"), "size": prev.get("size", 0),
            })
    return events


def _event(info: dict, kind: str, when: str) -> dict:
    return {
        "rel": info["rel"], "name": info["name"], "event": kind,
        "time": when, "type": info["type"], "size": info["size"],
    }


def compute_badges(history: list[dict]) -> dict:
    """Map rel -> 'new'|'updated' for files touched within the badge window."""
    cutoff = time.time() - BADGE_WINDOW_DAYS * 86400
    badges: dict[str, str] = {}
    for ev in history:
        if ev["event"] == "removed":
            badges.pop(ev["rel"], None)
            continue
        ts = _parse_iso(ev["time"])
        if ts >= cutoff:
            badges[ev["rel"]] = "new" if ev["event"] == "added" else "updated"
    return badges


def _parse_iso(value: str) -> float:
    try:
        return datetime.fromisoformat(value).timestamp()
    except ValueError:
        return 0.0


# ----------------------------------------------------------------------------
# Tree + section building
# ----------------------------------------------------------------------------
def build_tree(files: dict, badges: dict) -> dict:
    """Build a nested folder tree from the flat file map."""
    root = {"name": ROOT_DISPLAY_NAME, "path": "", "type": "folder", "children": {}}
    for rel, info in sorted(files.items()):
        parts = rel.split("/")
        node = root
        for depth, part in enumerate(parts[:-1]):
            path = "/".join(parts[: depth + 1])
            child = node["children"].get(part)
            if child is None:
                child = {"name": part, "path": path, "type": "folder", "children": {}}
                node["children"][part] = child
            node = child
        leaf = dict(info)
        leaf["type_kind"] = "file"
        leaf["status"] = badges.get(rel)
        node["children"][parts[-1]] = {
            "name": info["name"], "path": rel, "type": "file",
            "ext": info["ext"], "ftype": info["type"], "size": info["size"],
            "mtime": info["mtime"], "rel": rel, "status": badges.get(rel),
        }
    return _finalize_tree(root)


def _finalize_tree(node: dict) -> dict:
    """Convert children dicts to sorted lists and aggregate folder stats."""
    if node["type"] == "file":
        return node
    children = [_finalize_tree(c) for c in node["children"].values()]
    # folders first, then files, each alphabetical
    children.sort(key=lambda c: (c["type"] != "folder", c["name"].lower()))
    file_count = sum(1 for c in children if c["type"] == "file")
    folder_count = sum(1 for c in children if c["type"] == "folder")
    size = 0
    last = 0.0
    new_count = 0
    for c in children:
        if c["type"] == "file":
            size += c["size"]
            last = max(last, c["mtime"])
            if c.get("status"):
                new_count += 1
        else:
            file_count += c["fileCount"]
            folder_count += c["folderCount"]
            size += c["size"]
            last = max(last, c["lastModified"])
            new_count += c["newCount"]
    node["children"] = children
    node["fileCount"] = file_count
    node["folderCount"] = folder_count
    node["size"] = size
    node["lastModified"] = last
    node["newCount"] = new_count
    return node


def build_sections(tree: dict) -> list[dict]:
    """Top-level folders become 'sections' (weeks). Loose files get a bucket."""
    sections = []
    loose = []
    for child in tree["children"]:
        if child["type"] == "folder":
            sections.append({
                "name": child["name"], "path": child["path"],
                "fileCount": child["fileCount"], "folderCount": child["folderCount"],
                "size": child["size"], "lastModified": child["lastModified"],
                "newCount": child["newCount"],
            })
        else:
            loose.append(child)
    if loose:
        sections.append({
            "name": "Files", "path": "", "loose": True,
            "fileCount": len(loose), "folderCount": 0,
            "size": sum(c["size"] for c in loose),
            "lastModified": max((c["mtime"] for c in loose), default=0),
            "newCount": sum(1 for c in loose if c.get("status")),
        })
    return sections


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
def main() -> int:
    HUB_DIR.mkdir(parents=True, exist_ok=True)
    files = walk_content()
    snapshot = load_json(SNAPSHOT_FILE, {})
    history = load_json(HISTORY_FILE, [])
    first_run = not snapshot and not history

    events = diff_against_snapshot(files, snapshot)
    # On the very first run, don't flood "new" for the entire existing library.
    if not first_run and events:
        history.extend(events)
        history = history[-HISTORY_CAP:]
        save_json(HISTORY_FILE, history)
    elif first_run:
        save_json(HISTORY_FILE, history)

    badges = compute_badges(history)
    tree = build_tree(files, badges)
    sections = build_sections(tree)

    whats_new = [e for e in reversed(history)][:WHATS_NEW_CAP]

    flat = sorted(files.values(), key=lambda f: f["mtime"], reverse=True)
    for f in flat:
        f["status"] = badges.get(f["rel"])

    payload = {
        "generatedAt": iso_now(),
        "root": ROOT_DISPLAY_NAME,
        "contentRoot": str(CONTENT_DIR),
        "contentReady": bool(files),
        "stats": {
            "files": len(files),
            "folders": tree["folderCount"],
            "totalSize": tree["size"],
            "newCount": sum(1 for v in badges.values() if v == "new"),
            "updatedCount": sum(1 for v in badges.values() if v == "updated"),
            "lastModified": tree["lastModified"],
        },
        "sections": sections,
        "tree": tree,
        "files": flat,
        "whatsNew": whats_new,
    }

    # Persist snapshot for next run's diff.
    save_json(SNAPSHOT_FILE, {
        rel: {"size": i["size"], "mtime": i["mtime"],
              "name": i["name"], "type": i["type"]}
        for rel, i in files.items()
    })

    # Single JSON payload consumed by the web app (webapp/, served at the site
    # root). Served with Access-Control-Allow-Origin: * via vercel.json.
    DATA_JSON_FILE.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    added = sum(1 for e in events if e["event"] == "added")
    updated = sum(1 for e in events if e["event"] == "updated")
    removed = sum(1 for e in events if e["event"] == "removed")
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{stamp}] hub built: {len(files)} files"
          + (f" | +{added} new, ~{updated} updated, -{removed} removed"
             if not first_run else " | first run (baseline captured)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
