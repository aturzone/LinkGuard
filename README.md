# Bitwarden Link Guard

**Offline link safety checker for the Bitwarden open-source ecosystem.**

Link Guard analyzes every URL before you navigate to it — using local heuristics only. No data ever leaves your browser.

---

## Features

- **Safety Score (0-100%)** for every link — shown as badge, tooltip, and overlay
- **5 Heuristic Analyzers**: Domain reputation, URL structure, protocol security, content patterns, behavioral analysis
- **Zero Network Requests** — all analysis happens offline using bundled pattern databases
- **3-Layer Navigation Interception** — catches link clicks, address bar, redirects, form submissions
- **Enterprise Config** — export/import JSON configuration files for organization-wide deployment
- **Warning Overlay** — shows detailed score breakdown before you visit a risky link
- **Full-Page Block** — dangerous URLs are blocked with a warning page
- **Scan History** — browse your recent URL scans with scores
- **Cross-Browser** — Chrome, Edge, Firefox, Safari

## What It Detects

| Threat | How |
|--------|-----|
| Phishing URLs | Keyword analysis, brand impersonation, known pattern matching |
| Homograph attacks | Punycode/IDN detection, mixed-script analysis |
| DGA domains | Shannon entropy analysis on domain labels |
| Open redirects | Redirect parameter scanning |
| Malicious downloads | Dangerous file extension detection (.exe, .scr, .bat, etc.) |
| URL obfuscation | Double encoding, base64 params, IP-based URLs |
| Insecure connections | HTTP, FTP, non-standard port detection |
| Data exfiltration | Long query string analysis, suspicious fragments |

## Install

### From Release (Recommended)

1. Go to [Releases](https://github.com/aturzone/LinkGuard/releases)
2. Download the ZIP for your browser:
   - `linkguard-chrome-v1.0.0.zip` (also works for Edge, Brave, Opera)
   - `linkguard-firefox-v1.0.0.zip`
3. Install:

**Chrome / Edge / Brave:**
1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the extracted folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from the extracted folder

### Build From Source

```bash
# Clone
git clone git@github.com:aturzone/LinkGuard.git
cd LinkGuard

# Install dependencies
npm install

# Build for your browser
npm run build:chrome    # Chrome, Edge, Brave, Opera
npm run build:firefox   # Firefox
npm run build:safari    # Safari
npm run build:all       # All browsers

# Run tests
npm test
```

Built extensions are in `dist/<browser>/`.

## Enterprise Configuration

Managers can create and distribute config files to standardize link safety policies across an organization.

### Export Config
1. Click the Link Guard icon in your browser
2. Go to the **Config** tab
3. Click **Export Config**
4. Share the `.json` file with your team

### Import Config
1. Click the Link Guard icon
2. Go to the **Config** tab
3. Click **Import Config**
4. Select the `.json` file from your manager

### Config File Format

```json
{
    "version": "1.0.0",
    "organization": "Your Company SecOps",
    "rules": {
        "allowlist": ["yourcompany.com", "*.yourcompany.com"],
        "blocklist": ["known-malware.example.com"],
        "customPatterns": [
            {
                "id": "1",
                "name": "Block competitor phishing",
                "pattern": "yourcompany.*verify.*account",
                "action": "block",
                "description": "Blocks phishing attempts impersonating our company"
            }
        ]
    },
    "settings": {
        "interceptMode": "all",
        "warningThreshold": 80,
        "blockThreshold": 40,
        "showScoreAlways": false,
        "bypassAllowed": true,
        "notificationLevel": "all"
    },
    "metadata": {
        "createdBy": "Security Team",
        "createdAt": "2026-02-19T00:00:00.000Z",
        "description": "Corporate security policy"
    }
}
```

### Settings Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `interceptMode` | `"all"` | `"all"` = intercept everything, `"clicks"` = link clicks only, `"manual"` = right-click only |
| `warningThreshold` | `80` | Show warning overlay for scores below this |
| `blockThreshold` | `40` | Block navigation for scores below this |
| `showScoreAlways` | `false` | Show score badge on every link |
| `bypassAllowed` | `true` | Allow users to proceed past blocks |
| `notificationLevel` | `"all"` | `"all"`, `"warnings"`, `"blocks"`, or `"none"` |

## Scoring Engine

Each URL is analyzed by 5 independent analyzers. Their weighted scores produce the overall safety percentage:

| Analyzer | Weight | Checks |
|----------|--------|--------|
| Domain | 25% | Safe domain list, IP detection, punycode, entropy, subdomain depth, TLD reputation, brand impersonation |
| URL Structure | 25% | Length, encoding, shorteners, @-symbol attacks, base64 params, dangerous URIs |
| Protocol | 20% | HTTPS/HTTP, non-standard ports, FTP, blob/file protocols |
| Content Pattern | 15% | Phishing keywords, urgency language, dangerous file types, brand-in-path, pattern DB |
| Behavioral | 15% | Open redirects, data exfiltration, DGA subdomains, bidi attacks, control chars |

### Score Thresholds

| Score | Status | Action |
|-------|--------|--------|
| 80-100% | Safe | Green badge, no interruption |
| 40-79% | Warning | Yellow badge, warning overlay with details |
| 0-39% | Blocked | Red badge, navigation blocked, full-page warning |

## Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev:chrome
npm run dev:firefox

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Lint
npm run lint
```

### Project Structure

```
src/
├── engine/           # Scoring engine (pure TypeScript, no browser APIs)
│   ├── analyzers/    # 5 independent analyzers
│   ├── models/       # TypeScript interfaces
│   └── data/         # Bundled JSON pattern databases
├── background/       # Service worker (MV3) / background script (MV2)
├── content/          # Content scripts (link interception, overlay, tooltip)
├── popup/            # Extension popup UI
├── services/         # Config, storage, history, notifications
├── manifest/         # Browser-specific manifests
└── pages/            # Warning page for blocked URLs
```

## Tech Stack

- **TypeScript** — strict mode, full type safety
- **Webpack** — multi-browser build profiles
- **Jest** — 64 tests, 8 test suites
- **Manifest V3** (Chrome/Edge/Safari) + **V2** fallback (Firefox)

## License

[GNU General Public License v3.0](LICENSE) — matching the Bitwarden open-source ecosystem.

Copyright (C) 2026 kifpool.me SecOps

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Submit a Pull Request

---

Part of the [Bitwarden](https://bitwarden.com) open-source ecosystem.
