# TL;DR Anywhere — Chrome extension

Summarizes the current web page with Claude (Haiku 4.5), section by section.

## What's done
- Popup (toolbar icon / Cmd+Shift+U): "Summarize this page" → shows title + "## heading / sentence" summary.
- Right-click menu "TL;DR this page" → floating panel on the page (`background.js`, `showPanel`).
- Options page stores the user's Anthropic API key in `chrome.storage.local`.
- Custom extension icon.
- **Save to .md** (branch `save-md`, 2026-10-03): button in both popup and panel. File = `# Title`, `Source: [url](url)` link to the original page, then the summary. Filename is the slugified title; saved to Downloads.

## Key decisions
- Download uses a Blob + `<a download>` link — no `downloads` permission needed.
- In the panel, the save code lives inside `showPanel` because that function is injected into the page and must be self-contained.
- Prompt + API call are duplicated in `popup.js` and `background.js` (kept simple; could be shared later).

## What's next
- Commit/push `save-md` and merge via PR.
- Ideas: copy-to-clipboard button, error handling when the API call fails.
