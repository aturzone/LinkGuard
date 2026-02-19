# Publishing LinkGuard to Browser Extension Stores

## Chrome Web Store (Chrome, Edge, Brave, Opera)

### Step 1: Register as a Developer
1. Go to https://chrome.google.com/webstore/devconsole/register
2. Sign in with your Google account
3. Pay the one-time $5 registration fee
4. Accept the developer agreement

### Step 2: Create New Item
1. Go to https://chrome.google.com/webstore/devconsole
2. Click **"New Item"**
3. Upload `releases/linkguard-chrome-v1.0.0.zip`

### Step 3: Fill in Store Listing
- **Name:** LinkGuard - Link Safety Checker
- **Summary:** Offline link safety scoring — check every URL before you click. No data sent to servers.
- **Description:** Copy from `store-assets/chrome/description.txt`
- **Category:** Productivity (or Security if available)
- **Language:** English

### Step 4: Upload Graphics
Upload from `store-assets/chrome/`:
- **Icon:** Already in the ZIP (128x128)
- **Screenshots:** Upload all 3 screenshot files (1280x800)
- **Small promo tile:** `promo-small-440x280.png`
- **Large promo tile:** `promo-large-920x680.png`
- **Marquee promo:** `promo-marquee-1400x560.png`

### Step 5: Privacy
- **Single purpose:** "Analyzes URL safety using offline heuristics to protect users from phishing and malicious links"
- **Privacy policy URL:** Host `store-assets/privacy-policy.html` on your site (e.g., https://kifpool.me/linkguard/privacy) or use a GitHub Pages URL
- **Permissions justification:**
  - `activeTab` — "Required to read the current tab's URL for safety analysis"
  - `storage` — "Stores user configuration and scan history locally"
  - `webNavigation` — "Intercepts navigation to check URLs before the page loads"
  - `declarativeNetRequest` — "Used for blocking navigation to dangerous URLs"
  - `notifications` — "Alerts users about dangerous links"
  - `host_permissions <all_urls>` — "Required to analyze links on all websites the user visits"

### Step 6: Submit for Review
Click **"Submit for Review"**. Google typically reviews within 1-3 business days.

---

## Firefox Add-ons (AMO)

### Step 1: Create Developer Account
1. Go to https://addons.mozilla.org/developers/
2. Create a free Mozilla account (or sign in)

### Step 2: Submit New Add-on
1. Click **"Submit a New Add-on"**
2. Choose **"On this site"** (listed on AMO)
3. Upload `releases/linkguard-firefox-v1.0.0.zip`

### Step 3: Upload Source Code
AMO requires source code for review when using build tools:
1. Create source ZIP: `zip -r linkguard-source.zip src/ package.json tsconfig.json webpack.config.js jest.config.ts _locales/ icons/ -x "node_modules/*"`
2. Upload this source ZIP when asked
3. Add build instructions: `npm install && npm run build:firefox`

### Step 4: Fill in Listing
- **Name:** LinkGuard - Link Safety Checker
- **Summary:** Offline link safety scoring for every URL. 100% private — no data sent to servers.
- **Description:** Copy from `store-assets/chrome/description.txt`
- **Categories:** Privacy & Security
- **Homepage:** https://github.com/aturzone/LinkGuard
- **Support URL:** https://github.com/aturzone/LinkGuard/issues

### Step 5: Upload Screenshots
Upload the same screenshots from `store-assets/firefox/`

### Step 6: Submit
Click Submit. Mozilla reviews typically take 1-5 business days.

---

## After Approval

Once approved, users can install with one click:
- **Chrome:** Visit your Chrome Web Store listing → Click "Add to Chrome"
- **Firefox:** Visit your AMO listing → Click "Add to Firefox"

Update the GitHub README with the store links once published.

---

## Quick Reference — Required Files

| Store | Upload | Screenshots | Promo Images |
|-------|--------|-------------|--------------|
| Chrome Web Store | `releases/linkguard-chrome-v1.0.0.zip` | 3 files (1280x800) | 3 files (440x280, 920x680, 1400x560) |
| Firefox AMO | `releases/linkguard-firefox-v1.0.0.zip` + source ZIP | 3 files | Not required |
