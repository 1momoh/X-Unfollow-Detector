# 𝕏 Unfollow Detector 🌵

A Chrome extension that scans your 𝕏 (Twitter) Following list in real time and reveals every account that **isn't following you back** — so you can clean house in seconds.

No API keys. No third-party servers. Everything runs locally in your browser using your own session.

---

## Features

- 👻 **Ghost Detection** — Scans accounts as you scroll, flags anyone not following back instantly
- ☠️ **One-click Unfollow** — Drop a ghost with the `Drop` button
- 💀 **Bulk Unfollow All** — Drop every ghost at once with built-in random delays (2–4.5s) so X doesn't flag you as a bot
- ☆ **Whitelist** — Protect accounts you never want to drop. Persists across sessions
- 🔍 **Search & Filter** — Filter ghosts by name or handle in real time
- ↕️ **Sort** — Toggle between detection order or highest followers first
- 📊 **Live Stats** — Scanned / Not Following Back / Dropped counter always visible
- 📍 **Always Fixed** — Panel stays pinned while you scroll. Draggable. ⊙ resets position to top-right

---

## Install on Chrome

1. **Download** this repo as a ZIP
   - Click the green **Code** button → **Download ZIP**
   - Unzip the downloaded file

2. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```

3. Enable **Developer Mode** using the toggle in the top-right corner

4. Click **Load unpacked**

5. Select the unzipped `smooth-gunner-ext` folder

6. Done ✅ — the extension is now active in Chrome

> Tip: Pin it from the Chrome toolbar puzzle-piece icon for easy access.

---

## How to Use

1. Make sure you're **logged into X**

2. Go to your Following page:
   ```
   https://x.com/YOUR_USERNAME/following
   ```

3. The **𝕏 Unfollow Detector** panel appears automatically in the top-right corner

4. **Scroll the page** — the extension scans each account as X loads them

5. Anyone not following you back appears in the panel instantly

### Panel Controls

| Action | How |
|--------|-----|
| Unfollow one account | Click **Drop** on their row |
| Unfollow everyone | Click the red **Unfollow All** button |
| Protect an account | Click **☆** to whitelist them |
| Filter the list | Type in the search bar |
| Sort by followers | Click **↓ Followers** toggle |
| Move the panel | Drag the header bar |
| Reset panel to top-right | Click **⊙** in the header |
| Minimize | Click **─** |

---

## How It Works

The extension uses a `MutationObserver` on `[data-testid="UserCell"]` — X's own DOM nodes for each account row — and checks for the **"Follows you"** badge text. If it's absent, the account is a ghost.

Unfollow works by clicking X's own **Following button** in the page DOM and confirming the native modal or dropdown menu that appears — no direct API calls, so it never breaks when X updates their internal API.

A GraphQL interceptor runs in the background purely to enrich follower/following counts in the cache.

---

## Notes

- Only activates on `/following` pages
- Scroll the **main page** (not the panel) to load accounts — X loads them lazily
- Whitelist is saved via `chrome.storage.local` — survives page reloads
- Nothing is sent anywhere — all logic runs entirely in your browser

---

## Built By

**.87 🌵**

I build tools that solve my own problems.

→ **𝕏:** [@ofalamin](https://x.com/ofalamin)  
→ **Telegram Channel:** [t.me/Labs87](https://t.me/Labs87)  
→ **Telegram DM:** [@ofalamin](https://t.me/ofalamin)  
→ **GitHub:** [github.com/1momoh](https://github.com/1momoh)

---

*If this saved you time, share it. And follow back the people who support you 🌵*
