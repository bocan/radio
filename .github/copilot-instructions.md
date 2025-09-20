<!-- Guidance for AI coding assistants working on the `radio` static web player -->
# Copilot instructions — radio (static web player)

Goal: be immediately productive editing this small static site. Focus on `radio.js` (station data + player logic), `index.html` (markup), and `radio.css` (theme + player UI). This repo is a vanilla HTML/CSS/JS single-page static site — no build step.

Quick maps
- Main UI: `index.html` (structure + player container)
- Player logic & station definitions: `radio.js` (largest file; STATIONS array; metadata parsing; HLS + hls.js integration)
- Styling & theme: `radio.css` (CSS variables for theme, data-theme overrides)
- Small helpers: `lightdark.js`, `caroline.js`, `footer.js`, `autumn-leaves.js`
- Alternate copy: `v2/` contains a second variant of the site; mirror changes if appropriate.

Notes on architecture and patterns
- Single-page static app: there is no bundler or backend required by default. Editing `radio.js` and `index.html` is sufficient to change behaviour.
- Station data lives in a top-level `const STATIONS` array in `radio.js`. Each station may provide any of:
  - `streams`: array of {url, type}
  - `metadataUrl` or `metadataUrlBuilder`
  - `metadataFormat`: `json` (default), `xml`, `text`, or `sse`
  - `parseNowPlaying`: a custom parser (string, object, or HTML) — the code expects a flexible return shape (string or object) handled by `updateNowPlaying`
- Playback:
  - HLS detection uses MIME or `.m3u8` and prefers native playback when available; otherwise `hls.js` is used if present.
  - Metadata polling runs at 12s intervals when using HTTP polling; SSE handled if `metadataFormat: 'sse'`.
- UI conventions:
  - Theme variables in `radio.css` (use `:root[data-theme="dark"]` or the toggle in `lightdark.js`)
  - Station cards are rendered via `renderStations()` and have ids `station-<id>` (useful for tests or anchors)

Developer workflows & gotchas
- No build needed: open `index.html` in a browser or serve with a static file server for proper MIME/CORS behaviour.
- HLS & CORS: live HLS streams often require correct CORS headers; if testing locally prefer a simple static server:

```bash
# macOS: serve current dir at http://localhost:8000
python3 -m http.server 8000
```

- Metadata CORS: many `metadataUrl` endpoints are proxied in the author's site (`chris.funderburg.me/proxy/...`). When adding metadata endpoints, be prepared to proxy if the target disallows cross-origin requests.
- Tests / linting: none provided. Keep changes minimal and self-contained; preview in browser.

Project-specific conventions (do these exactly)
- When adding a station, edit `STATIONS` in `radio.js`. Keep `id` lowercase and hyphenated (e.g. `groove-salad`) because DOM ids use `station-<id>`.
- If the stream is HLS (`.m3u8`) set `type: 'application/vnd.apple.mpegurl'` on the stream entry to allow native HLS detection.
- `parseNowPlaying` should accept whatever fetch returns (string, JSON, XML text) and return either a plain string (preferred) or an object with fields like `{artist, title, show, artworkUrl, descriptionHtml}` — `updateNowPlaying` will assemble the display.
- Prefer defensive parsing: some metadata endpoints omit fields or return odd shapes; code currently swallows errors during polling — follow same pattern (try/catch, return null on failure).

Integration points & external dependencies
- `hls.js` is loaded from CDN in `index.html`. If editing HLS behaviour, prefer feature-detection (see `startStation()` in `radio.js`).
- `mediaSession` API is used when available to expose Now Playing and transport controls.
- The repo uses a few small helper scripts (`caroline.js`, `lightdark.js`) — inspect them before moving shared functionality.

Examples (from repo)
- Add a simple MP3 stream:
  { id: 'my-station', name: 'My Station', location: 'Nowhere', streams: [{url: 'https://example.com/stream.mp3', type: 'audio/mpeg'}] }
- HLS stream with metadata parsing:
  { id: 'thelot', streams: [{url:'.../index.m3u8', type:'application/vnd.apple.mpegurl'}], metadataUrl: 'https://chris.funderburg.me/thelot.json', parseNowPlaying: data => ({ show: data.event?.summary }) }

When to edit other files
- Changing UI layout or player markup → `index.html` + `radio.css` (and mirror in `v2/index.html` if you intend both to stay aligned).
- Adding complex station metadata parsing or proxies → prefer adding small helper modules (e.g., `caroline.js` pattern) or point at an external proxy; note CORS.

Safety and style
- This project intentionally accepts some unsafe HTML in `description` fields but sanitizes rich metadata for the Now Playing details (`sanitizeHtml` in `radio.js`). Follow that pattern: prefer `descriptionHtml` only for trusted or sanitized content.

If you need more context
- Read `radio.js` top-to-bottom (largest source of project-specific logic).
- `README.md` contains high-level deployment notes (static hosting).

If anything in this file is unclear or you need examples for a specific change (add station, improve HLS handling, add a test harness), tell me which area and I'll expand this guidance.
