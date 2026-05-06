# FULLY CLIENT
### GeoGuessr Location Resolver · v3.0

> A clean, feature-rich GeoGuessr cheat client with a blue-black UI overlay.  
> Built as a personal improvement over the original concept by [nerdyass](https://github.com/nerdyass) — credit where it's due.

---

## What it does

Fully Client hooks into GeoGuessr's internal Street View API and automatically extracts the **exact coordinates** of your current round location. It displays them in a draggable overlay panel with a built-in map, round history, country flag, and more — all without you having to do anything.

---

## Features

| Feature | Description |
|---|---|
| 📍 **Live Coordinates** | Lat/Lng extracted automatically when a round starts |
| 🏳️ **Country Flag & Name** | Reverse geocoded via OpenStreetMap Nominatim |
| 🗺️ **Embedded Map** | Google Maps iframe centered on the round location |
| 🔍 **Zoom Slider** | Adjust the map zoom from 1–18 in real time |
| 📋 **Copy Button** | One click to copy coordinates to clipboard |
| 🔗 **Street View Link** | Opens Google Street View at the exact location |
| 📜 **Round History** | Last 10 rounds saved, click any to jump back to it |
| **—** **Minimize** | Collapse the panel to just the header bar |
| **F** **Toggle Button** | Fixed button in the corner to show/hide the panel |
| `T` **Keyboard Shortcut** | Press T anywhere to toggle the panel |

---

## Requirements

You need **Tampermonkey** installed in your browser. It's a free browser extension that lets you run custom scripts on websites.

| Browser | Link |
|---|---|
| Chrome | [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) |
| Edge | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |

---

## Installation

1. Install **Tampermonkey** from the table above
2. Click the Tampermonkey icon in your browser toolbar
3. Select **"Create a new script"**
4. Delete everything in the editor
5. Paste the full contents of `fully-client.user.js`
6. Press `Ctrl + S` to save
7. Go to [geoguessr.com](https://www.geoguessr.com) and start a round

The **F** button will appear in the bottom-right corner of the screen. Click it to open the panel.

---

## Usage

```
F button (bottom-right)   →  Open / Close the panel
T key                     →  Toggle panel visibility
— button (in panel)       →  Minimize to header only  
✕ button (in panel)       →  Hide panel
Zoom slider               →  Change map zoom level
Round History             →  Click any entry to view that location on the map
```

> **Tip:** If the panel doesn't appear after starting a round, reload the page. Make sure your adblocker isn't blocking `maps.googleapis.com`.

---

## Troubleshooting

**Panel doesn't show up**  
→ Check that the script is enabled in Tampermonkey (green toggle)  
→ Reload the page after saving the script

**No coordinates loading**  
→ Your adblocker may be blocking Google Maps API calls  
→ Try whitelisting `geoguessr.com` or disabling the adblocker for that site  
→ Test in an incognito window (make sure Tampermonkey is allowed in incognito)

**Flag or address shows "Unknown"**  
→ Nominatim (OpenStreetMap) rate limits requests — wait a second and try the next round

---

## Credits & Inspiration

This project was built as a personal rewrite and improvement based on the original GeoGuessr cheat concept by:

> **nerdyass** · [github.com/nerdyass](https://github.com/nerdyass)

Their original script provided the core XHR intercept technique and the idea for the overlay UI. Fully Client expands on this with a completely redesigned interface, additional features, and a more stable Street View hook.

---

## Disclaimer

This tool is for **educational purposes only**. Using cheats in ranked or competitive GeoGuessr modes affects other players. Use responsibly.
