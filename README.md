# goLyrics

macOS menu bar app that shows synchronized karaoke lyrics in a transparent overlay while music plays. Built with Electron, React, and TypeScript.

## What it does

- Detects playback from **macOS Now Playing**, **Spotify**, **Apple Music**, and **YouTube** in Chrome, Arc, Edge, or Safari
- Shows lyrics automatically when music starts; hides when playback stops or pauses
- Fetches synced lyrics from **LRCLIB**, with **YouTube transcript** as a fallback when captions are available
- Displays **romanized (Hinglish)** or **original script** for Indic lyrics
- Runs as a click-through overlay above fullscreen apps
- Remembers overlay position, per-track sync offsets, and a local lyrics cache

## Requirements

- macOS 13+
- Node.js 20+
- At least one configured music source (see **Settings → Sources**)

## Quick start

```bash
git clone <repo-url>
cd golyrics
npm install
npm run dev
```

```bash
npm run typecheck   # TypeScript
npm run build       # production bundle to out/
npm run dist:mac    # local DMG in release/
```

## Permissions

| Access | Where to grant | Purpose |
|--------|----------------|---------|
| Automation | System Settings → Privacy & Security → Automation | Read now-playing from Music, Spotify, and browsers |
| Network | Firewall prompt if enabled | LRCLIB and YouTube transcript APIs |

For accurate YouTube sync in Chromium browsers, also enable **Allow JavaScript from Apple Events** in the browser’s Developer menu. This lets goLyrics read playback time, live captions, channel name, and the on-page video title.

goLyrics does not use Screen Recording, microphone, or camera access.

## Menu bar

**Left-click** the menu bar icon to open the menu. It does not hide the overlay.

| Item | Action |
|------|--------|
| Show / Hide Overlay | Toggle visibility (`Option+L`) |
| Settings… | Appearance, sync, sources, system |
| Setup Permissions… | Onboarding wizard |
| Lyrics Script | Romanized (Latin / Hinglish) or Original script |
| Toggle Drag Mode | Drag the overlay to reposition |
| Position | Nudge left/right/up/down; reset to bottom default |
| Click-Through | Pass mouse clicks to apps below |
| Show in Dock | Dock icon visibility |
| Quit | Exit (`Command+Q`) |

### Drag mode workflow

1. Menu → **Toggle Drag Mode** (or tray checkbox)
2. Drag the overlay to the desired spot
3. Menu → **Toggle Drag Mode** again to return to click-through

Custom position persists across restarts. Use **Position → Reset to Bottom (default)** or **Settings → Maintenance → Reset overlay position** to restore the default placement.

## Hotkeys

| Hotkey | Action |
|--------|--------|
| `Option+L` | Show / hide overlay |
| `Option+Space` | Refresh song detection |
| `Option+R` | Reload lyrics |
| `Option+↑` | Shift lyrics earlier (per-track offset) |
| `Option+↓` | Shift lyrics later |
| `Option+0` | Reset per-track sync offset |

## Settings

Open from the tray menu (**Settings…**) or the first-run onboarding wizard.

| Section | Options |
|---------|---------|
| **Appearance** | Opacity, font size, font preset, dual-line mode, safe area (Dock / Fullscreen / Notch), lyrics script (Romanized or Original) |
| **Sync** | Lyric lead time (how early the next line appears) |
| **Sources** | Enable macOS Now Playing, Spotify, Apple Music; pick a YouTube browser or Off |
| **System** | Launch at login, show in Dock |
| **Maintenance** | Reset overlay position, clear lyrics cache |

### Settings → Sources

Limit which providers are polled every 500ms. Fewer sources reduce CPU and AppleScript load.

- **macOS Now Playing** — lightweight system media session (Control Center)
- **Spotify** / **Apple Music** — per-app AppleScript
- **YouTube in browser** — Chrome, Arc, Edge, Safari, or Off

New installs default to macOS Now Playing + Chrome. Upgrading from an earlier version keeps all sources enabled until you change this.

## How lyrics are found

goLyrics tries providers in order:

1. **YouTube transcript** — only when the video has captions (live CC or transcript track)
2. **LRCLIB** — community synced lyrics; works without YouTube captions

### Artist matching (YouTube)

YouTube does not always expose the performer as metadata. goLyrics resolves artist like this:

| Video style | Example | Artist used for LRCLIB |
|-------------|---------|-------------------------|
| Label channel, artist in title | `Aankhon Se Batana – Dikshant \| Official Video` on Sony Music India | **Dikshant** (parsed from title), then channel name |
| Artist-owned channel, plain title | `Thinking of You` on **APDHILLON** | **AP Dhillon** (from channel name; compact handles like `APDHILLON` are normalized) |
| Title contains `Artist - Song` | `AP Dhillon - With You` | **AP Dhillon** (from title prefix) |

LRCLIB results are validated against title, artist, and duration before they are shown or cached.

### Lyrics script

- **Romanized (default)** — Devanagari, Gurmukhi, and similar scripts are shown in Latin letters (Hinglish-style pronunciation). English lyrics stay in English.
- **Original** — native script is preserved.

Change via tray **Lyrics Script** or **Settings → Appearance**.

## Data on disk

All files live under `~/Library/Application Support/goLyrics/`:

| File | Purpose |
|------|---------|
| `config.json` | Overlay position, appearance, enabled sources, onboarding flag |
| `lyrics-cache.json` | Fetched lyrics (positive entries, 30-day TTL) and short-lived “not found” entries (5-minute TTL) |
| `sync-offsets.json` | Per-track timing adjustments from `Option+↑` / `Option+↓` |

### Lyrics cache keys

Cache keys match track identity:

```
yt:{videoId}:{normalized-title}
```

Example: `yt:2vKMY75kvjI:aankhon se batana – dikshant | viral song | official video`

Non-YouTube tracks use `{providerId}::{artist}::{title}`.

Use **Settings → Maintenance → Clear lyrics cache** if lyrics look wrong or stale after a fix or track change.

## Releases

Unsigned local builds: `npm run dist:mac` → `release/goLyrics-<version>.dmg`

Signed releases: push a version tag (e.g. `v0.2.0`). See `.github/workflows/release.yml` and repository secrets for `CSC_*` and Apple notarization variables. The app checks GitHub Releases for updates when distributed via a signed build.

## Project layout

```
src/main/       Electron main process, tray, IPC, orchestrators, cache
src/preload/    contextBridge API
src/renderer/   Overlay, settings, and onboarding UI
src/providers/  Song and lyrics providers
src/engine/     Karaoke sync engine
src/shared/     Types, defaults, matching utilities
docs/           Architecture notes
```

## Contributing

See `CONTRIBUTING.md`. Before a PR:

```bash
npm run typecheck && npm run build
```

## Known limitations

- macOS Automation must be granted for each music app you enable
- Not all tracks have synced or transcript lyrics on LRCLIB
- Label channels (Sony, T-Series, etc.) need the performer in the title or a matching LRCLIB entry
- Per-track offset may be needed for some sources
- App Store distribution is constrained by Automation and sandbox rules
