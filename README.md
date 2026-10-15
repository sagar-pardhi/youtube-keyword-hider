# YouTube Keyword Hider

<p align="center">
	<img src="images/Keyword%20Video%20Filter%20Icon.png" alt="YouTube Keyword Hider icon" width="128">
</p>

A lightweight Chrome extension that hides YouTube videos when their titles contain keywords you choose. Manage the list from the extension popup; changes are saved with Chrome Sync storage.

## Features

- Case-insensitive, partial matching against video titles and channel names.
- Exclude selected channels by exact channel name or channel ID; exclusions override keyword matches.
- Hides matching videos on YouTube home, search results, and recommendations.
- Filters newly loaded feed items and updates the page when the keyword list changes.
- Pause and resume filtering without removing keywords.
- Import and export keyword lists as JSON files.
- Skips Shorts-specific video cards.
- Stores keywords in `chrome.storage.sync`; no extension-operated server is used.

## Install for development

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Select **Load unpacked** and choose the project directory containing `manifest.json`.
4. Open YouTube, then click the extension icon to add keywords.

To test changes to the extension code, select **Reload** on its card at `chrome://extensions` and refresh the YouTube tab. You can add or remove keywords from the popup without reloading the extension.

## Usage

Enter a keyword in the popup and submit it. Any supported video card whose title or channel name contains that text, regardless of letter case, will be hidden. For example, `spoiler` also matches `SPOILERS` and `movie spoilers`. Select **Remove** beside a keyword to stop filtering it. Use the **Filtering** switch to pause and resume matching while keeping the list intact.

To keep a channel visible even when its videos match a blocked keyword, add its exact display name or channel ID under **Always show this channel**. Channel names are matched exactly without regard to case; channel IDs are matched exactly. The channel ID can be found in a channel URL such as `youtube.com/channel/UC...`.

Use **Export** to download keywords and excluded channels as JSON. **Import** accepts a legacy JSON array of keyword strings or a JSON object containing a `keywords` array and optional `excludedChannels` array. Object imports replace both lists; legacy array imports replace keywords and preserve the existing exclusions. Names are trimmed and deduplicated without regard to case; channel IDs remain case-sensitive.

## Permissions and data

- **`storage`**: saves the keyword list using Chrome Sync storage. Chrome may sync this data according to the user's Chrome settings.
- **YouTube site access** (`https://www.youtube.com/*`): lets the content script inspect video titles and hide matching feed entries on YouTube.

The extension does not send keywords or video titles to an extension-operated server. Its filtering runs in the browser on YouTube pages.

## Project files

| File                                  | Purpose                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `manifest.json`                       | Chrome Manifest V3 configuration                                               |
| `popup.html`, `popup.css`, `popup.js` | Keyword and channel-exclusion management, pause toggle, and JSON import/export |
| `content.js`, `content.css`           | YouTube title/channel matching, channel exclusions, and card hiding            |

## Limitations

YouTube can change its page structure, which may require updates to the content script's selectors. Filtering is limited to the supported video feeds and title/channel text; it does not filter Shorts-specific cards.

## Contributing

Bug reports and pull requests are welcome. When reporting a filtering issue, include the YouTube page type (home, search, or recommendations) and, if possible, the relevant video-card structure without sharing private account information.

## Disclaimer

This project is an independent community extension and is not affiliated with, endorsed by, or sponsored by YouTube or Google.
