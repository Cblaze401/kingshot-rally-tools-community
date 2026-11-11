# Kingshot Rally Tools

Reinforcement Timer, March Command, and March Planner. Static HTML, CSS, and JavaScript — no build step or backend required.

**Originally created by Blaze K163.**

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

Alternatively download the repository ZIP and upload the files to any static host. Keep `index.html`, `tabs.css`, `tabs.js`, `reinforcement/`, `march-command/`, and `march-planner/` together with the same directory structure. No installation or compilation is needed.

### Local preview

Run `python -m http.server 8000` from the project directory and visit `http://localhost:8000/`. The three tools are also accessible at `/reinforcement/`, `/march-command/`, and `/march-planner/`. Open `/#march-planner` to select the March Planner tab directly.

The root page switches between same-origin frames without reloading the tools; keep your browser open and device awake for timer cues. Tool settings are stored in your browser.

## Creator credit and license

Anyone who hosts a copy must retain the visibly displayed creator credit **Originally created by Blaze K163**, linking to this project's original GitHub URL. For complete terms, see [LICENSE.md](LICENSE.md). This is a custom source-available license, not an OSI-approved open-source license.


## Rally presets

In March Command, enter a preset name and choose **Save As** to save the current groups, player order, enabled selections, spacing, normal/pet march times, pet selections, and rally countdown. Choose a saved preset and press **Load** to switch setups, **Save** to update it, or **Delete** to remove it. Loading stops an active countdown; copy the schedule for fresh UTC rally call times.

Presets are stored in this browser. **Export all** downloads a JSON backup to share or move to another device. **Import** adds presets without overwriting existing names. Loading a preset restores its pet selections; reopening March Command still starts Grizzly Bear OFF. Keep a backup before clearing browser data.
