# goLyrics

`goLyrics` is a macOS desktop overlay app that shows synchronized karaoke lyrics on top of any window while music is playing.

It is built with Electron, React, TypeScript, and plain CSS.

---

## What goLyrics does

- Detects currently playing YouTube tracks from Google Chrome
- Displays live or synced lyrics in an always-on-top transparent overlay
- Supports click-through mode so you can keep interacting with apps under the overlay
- Lets you drag and persist overlay position
- Runs as a menu bar utility with hotkeys

---

## Current status

This project is under active development and currently focused on macOS + YouTube.

Implemented:
- Transparent overlay window
- Always-on-top behavior over fullscreen apps
- Drag mode + click-through mode
- Song detection via Chrome tab introspection
- Lyrics pipeline:
  - YouTube transcript provider
  - LRCLIB fallback (synced lyrics + plain lyrics fallback)

Planned:
- Better provider reliability across tabs/windows
- Spotify / Apple Music providers
- Smarter lyric scoring and per-track offset calibration
- Packaging/signing/notarization release workflow

---

## Requirements

- macOS 13+ (Ventura or newer)
- Node.js 20+
- Google Chrome

---

## Local setup

```bash
git clone <your-fork-or-repo-url>
cd golyrics
npm install
npm run dev
```

Dev server commands:

```bash
npm run dev        # run Electron + Vite in development
npm run typecheck  # TypeScript checks
npm run build      # production build to out/
```

---

## Permissions and privacy

goLyrics requests access to a few macOS and Chrome capabilities so it can detect songs, sync lyrics, and keep text readable over any background.

| Permission / access | Where to grant | Why goLyrics needs it |
|---------------------|----------------|------------------------|
| **Automation** (control Google Chrome) | `System Settings` → `Privacy & Security` → `Automation` | Reads the active YouTube tab title, URL, playback time, and live captions from Chrome via AppleScript |
| **Screen Recording** | `System Settings` → `Privacy & Security` → `Screen Recording` | Samples the screen behind the lyric overlay to choose black or white text automatically |
| **Network access** | macOS firewall prompt (if enabled) | Fetches lyrics from LRCLIB and YouTube transcript APIs |
| **Menu bar / background app** | No extra prompt | Runs as a menu bar utility with global hotkeys |

### Chrome setting (not a macOS permission)

For precise playback sync, enable this in Chrome:

- `View` → `Developer` → `Allow JavaScript from Apple Events`

Without Automation + this Chrome setting, song detection and lyric timing may be limited or unavailable.

### What goLyrics does **not** access

- Microphone or camera
- Contacts, photos, or files outside its own settings folder
- Keyboard input outside registered global hotkeys
- Your Chrome passwords or saved form data

Settings are stored locally at:

`~/Library/Application Support/goLyrics/config.json`

---

## First-run setup (quick checklist)

1. Launch goLyrics (`npm run dev` or the built `.dmg` app)
2. Grant **Automation** for `goLyrics` / `Electron` → **Google Chrome**
3. Grant **Screen Recording** for `goLyrics` / `Electron` (needed for auto text color)
4. In Chrome, enable **Allow JavaScript from Apple Events**
5. Play a YouTube video in Chrome and confirm lyrics appear at the bottom center

Without the permissions above, detection, sync, and automatic text color may be degraded or unavailable.

---

## Usage

### Hotkeys

| Hotkey | Action |
|--------|--------|
| `Option + L` | Toggle overlay visibility |
| `Option + Space` | Force song detection refresh |
| `Option + R` | Reload lyrics |
| `Option + ↑` | Shift lyrics earlier (per-track offset) |
| `Option + ↓` | Shift lyrics later (per-track offset) |
| `Option + 0` | Reset per-track sync offset |

### Menu bar controls

- Show/Hide Overlay
- Settings…
- Setup Permissions…
- Toggle Drag Mode
- Toggle Click-Through
- Reset Position
- Show in Dock
- Quit

### Drag mode

- Turn on `Toggle Drag Mode` from menu bar
- Drag overlay to desired location
- Turn off drag mode
- Position persists in settings

Settings location:

`~/Library/Application Support/goLyrics/config.json`

---

## Packaging (.dmg)

Build a local DMG artifact:

```bash
npm run dist:mac
```

Output:

- `release/goLyrics-<version>.dmg`

Unsigned local builds work for development. Signed releases are published via GitHub Actions when you push a version tag (for example `v0.2.0`).

### GitHub Releases (signed + notarized)

The workflow at `.github/workflows/release.yml` builds a signed DMG on tag push.

Required repository secrets:

| Secret | Purpose |
|--------|---------|
| `CSC_LINK` | Base64-encoded `.p12` signing certificate |
| `CSC_KEY_PASSWORD` | Certificate password |
| `APPLE_ID` | Apple ID used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

Create a release:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Download the DMG from the GitHub Releases page after the workflow completes.

---

## Repository structure

- `src/main` - Electron main process (window/tray/hotkeys/providers orchestration)
- `src/preload` - secure bridge APIs
- `src/renderer` - React UI overlay
- `src/providers` - song/lyrics provider implementations
- `src/engine` - karaoke sync engine
- `docs` - architecture/design docs

---

## Contributing

See:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

Before opening a PR:

```bash
npm run typecheck
npm run build
```

---

## Known limitations

- macOS automation permissions can block Chrome integration
- Some songs/videos have no accessible transcript/lyrics from configured providers
- Timing may need per-track calibration due to provider/source drift
- Full App Store distribution may be constrained by automation/sandbox rules
