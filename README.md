# Kingshot Rally Tools

Reinforcement Timer, March Command, March Planner, Map Builder, and Rally Caller Map. Static HTML, CSS, and JavaScript — no build step. The pages work from any static host. Live player-location lookup is optional and uses the Netlify function in `netlify/functions/`.

**Originally created by Blaze K163.**

## Tools

The root page tabs, in order:

- **Reinforcement Timer** tracks enemy rallies and times your march to a chosen arrival offset.
- **March Command** plans rally call order, chain hits, and simultaneous groups, then copies a launch schedule.
- **March Planner** compares march times and pet bonuses on the world map.
- **Map Builder** places cities, saves formations, refreshes locations, and exports castle and turret march times.
- **Rally Caller Map** locates selected March Command callers and estimates their march to King's Castle. It shares the March Command page and opens from `#caller-map`.

## Host your own copy

Deploy your own independently hosted copy from this public community repository:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Cblaze401/kingshot-rally-tools-community)

Netlify will guide you through copying the repository and deploying your site.

### Netlify deployment

1. Fork or copy the public distribution repository to your own GitHub account.
2. On Netlify, choose **Add new project → Import an existing project → GitHub**.
3. Select your copied repository.
4. Set **Build command** to blank and **Publish directory** to `.`; the provided `netlify.toml` specifies the directory too.
5. Deploy and choose your site's address.

Alternatively download the repository ZIP and upload the files to any static host. Keep `index.html`, `tabs.css`, `tabs.js`, `reinforcement/`, `march-command/`, `march-planner/`, `map-builder/`, and `netlify/functions/` together with the same directory structure. No installation or compilation is needed. `netlify/functions/caller-locations.cjs` is the location lookup. It reads only the `MIGHTPULSE_API_KEY` environment variable; set that secret in Netlify (never in the repository). Other static hosts need an equivalent `POST /.netlify/functions/caller-locations` endpoint. Timers, planning, and saved formations still work without it.

### Local preview

Run `python -m http.server 8000` from the project directory and visit `http://localhost:8000/`. The root page has five tabs, in this order: Reinforcement Timer, March Command, March Planner, Map Builder, and Rally Caller Map. Direct pages are `/reinforcement/`, `/march-command/`, `/march-planner/`, and `/map-builder/`. Open `/#reinforcement`, `/#march-command`, `/#march-planner`, `/#map-builder`, or `/#caller-map` to select a tab. Rally Caller Map has no separate folder; it is the March Command page switched to the caller-map view.

The root page switches between same-origin frames without reloading the tools; keep your browser open and device awake for timer cues. Tool settings are stored in your browser.

## Creator credit and license

Anyone who hosts a copy must retain the visibly displayed creator credit **Originally created by Blaze K163**, linking to https://github.com/Cblaze401/kingshot-rally-tools-community. For complete terms, see [LICENSE.md](LICENSE.md). This is a custom source-available license, not an OSI-approved open-source license.


## Rally presets

In March Command, enter a preset name and choose **Save As** to save the current groups, player order, enabled selections, spacing, normal/pet march times, pet selections, and rally countdown. Choose a saved preset and press **Load** to switch setups, **Save** to update it, or **Delete** to remove it. Loading stops an active countdown; copy the schedule for fresh UTC rally call times.

Presets are stored in this browser. **Export all** downloads a JSON backup to share or move to another device. **Import** adds presets without overwriting existing names. Loading a preset restores its pet selections; reopening March Command still starts Grizzly Bear OFF. Keep a backup before clearing browser data.


## Rally caller map (Netlify)

Enter each selected caller's in-game Player ID in March Command, then use **Refresh locations & march times**. The map uses Mightpulse coordinates and automatically targets the castle in each caller's reported kingdom. The view selector switches between kingdoms without changing rally groups. Estimates use the March Planner castle engine, base speed 11, +25% normal and +55% with Grizzly Bear, and whole-second client rounding. Check estimates against the game before calling rallies. Refresh updates both march inputs but preserves the pet toggle; manual inputs remain editable.

Add `MIGHTPULSE_API_KEY` as a secret **Production** environment variable in Netlify, available to Functions, then deploy. That is the only environment variable `netlify/functions/caller-locations.cjs` reads. Never put the key in repository files, browser scripts, or preset exports. Community hosts must use their own key. Map Builder location refresh calls the same function. Other static hosts need an equivalent server endpoint to support lookup. Basic planning still works without it.

Lookups request data no older than 60 seconds, but the provider may return stale or pending data. Only valid fresh coordinates and known kingdoms update march times. Data age is shown at lookup. Player IDs are included in saved presets and backups. Function requests use the site's Mightpulse allowance; the browser refreshes only when asked.
