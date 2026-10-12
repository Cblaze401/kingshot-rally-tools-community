# Kingshot Rally Tools

Reinforcement Timer and March Command. Static HTML, CSS, and JavaScript — no build step or backend required.

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

Alternatively download the repository ZIP and upload the files to any static host. Keep `index.html`, `tabs.css`, `tabs.js`, `reinforcement/`, and `march-command/` together with the same directory structure. No installation or compilation is needed.

### Local preview

Run `python -m http.server 8000` from the project directory and visit `http://localhost:8000/`. Reinforcement Timer and March Command are also accessible at `/reinforcement/` and `/march-command/`.

The root page switches between same-origin frames without reloading the tools; keep your browser open and device awake for timer cues. Tool settings are stored in your browser.

## Creator credit and license

Anyone who hosts a copy must retain the visibly displayed creator credit **Originally created by Blaze K163**, linking to this project's original GitHub URL. For complete terms, see [LICENSE.md](LICENSE.md). This is a custom source-available license, not an OSI-approved open-source license.
