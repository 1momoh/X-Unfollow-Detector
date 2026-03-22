// content.js — 𝕏 Unfollow Detector v5
// • Unfollow: handles BOTH X modal AND dropdown menu flows
// • UI: wallpaper-inspired — dusty blue, warm amber, dark navy, cream
// • Features: whitelist, search, sort, bulk with anti-bot delay, progress bar
// By .87🌵 | @ofalamin | t.me/Labs87

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────────
  const PANEL_ID  = 'xud-panel';
  const ghosts    = new Map();
  const unfollowed = new Set();
  const processed  = new Set();
  const statsCache = new Map();
  let   whitelist  = new Set();
  let   totalScanned = 0;
  let   panelReady   = false;
  let   minimized    = false;
  let   sortMode     = 'detected';
  let   searchQuery  = '';
  let   bulkRunning  = false;

  try {
    chrome.storage.local.get(['xud_wl'], r => {
      if (r?.xud_wl) whitelist = new Set(r.xud_wl);
    });
  } catch (_) {}

  const saveWL = () => { try { chrome.storage.local.set({ xud_wl: [...whitelist] }); } catch (_) {} };

  // ─── Styles — wallpaper palette ──────────────────────────────────────────────
  const STYLE = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');

    :root {
      --bg:       #dce6f0;
      --surf:     #e8eff7;
      --surf2:    #f0f5fa;
      --card:     #f5f8fc;
      --border:   rgba(45,58,74,0.1);
      --border2:  rgba(45,58,74,0.06);
      --navy:     #2d3a4a;
      --navy2:    #4a5e74;
      --navy3:    #8a9eb4;
      --amber:    #d4891a;
      --amber-hi: #e8a030;
      --amber-lo: rgba(212,137,26,0.12);
      --amber-md: rgba(212,137,26,0.22);
      --cream:    #f0dcc4;
      --red:      #c4504a;
      --red-lo:   rgba(196,80,74,0.1);
      --green:    #3a8a5c;
      --green-lo: rgba(58,138,92,0.1);
      --text:     #2d3a4a;
      --text2:    #6a7e92;
      --text3:    #a8bac8;
      --r:        16px;
      --sans:     'Nunito', sans-serif;
      --mono:     'JetBrains Mono', monospace;
    }

    #xud-panel, #xud-panel * { box-sizing: border-box; margin: 0; padding: 0; }

    #xud-panel {
      position: fixed; right: 14px; top: 64px;
      width: 354px;
      max-height: calc(100vh - 80px);
      background: var(--bg);
      border: 1.5px solid rgba(45,58,74,0.12);
      border-radius: var(--r);
      z-index: 999999;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.5),
        0 20px 60px rgba(45,58,74,0.18),
        0 4px 12px rgba(45,58,74,0.1);
      transition: max-height 0.3s cubic-bezier(0.4,0,0.2,1);
      font-family: var(--sans);
    }
    #xud-panel.xud-min { max-height: 52px; }

    /* ── Header ── */
    .xud-hd {
      display: flex; align-items: center; justify-content: space-between;
      padding: 13px 14px 12px;
      background: linear-gradient(160deg, var(--navy) 0%, #3a4e64 100%);
      cursor: move; flex-shrink: 0;
      border-radius: calc(var(--r) - 1px) calc(var(--r) - 1px) 0 0;
    }
    .xud-hd-l { display: flex; align-items: center; gap: 9px; }

    .xud-logo {
      width: 28px; height: 28px; border-radius: 8px;
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-family: var(--sans); font-weight: 900;
      color: #fff; flex-shrink: 0;
    }

    .xud-wordmark {
      font-family: var(--sans); font-weight: 900; font-size: 12px;
      letter-spacing: 0.04em; text-transform: uppercase;
      color: rgba(255,255,255,0.9);
    }
    .xud-wordmark em { color: var(--amber-hi); font-style: normal; }

    .xud-badge {
      font-family: var(--mono); font-size: 9.5px; font-weight: 500;
      background: rgba(232,160,48,0.25); border: 1px solid rgba(232,160,48,0.4);
      color: #f0c060; border-radius: 20px; padding: 2px 9px;
    }
    .xud-badge.scan { animation: xud-blink 1.8s ease infinite; }
    @keyframes xud-blink { 0%,100%{opacity:1}50%{opacity:0.2} }

    .xud-hd-r { display: flex; gap: 2px; }
    .xud-ibtn {
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,0.3); width: 26px; height: 26px;
      border-radius: 6px; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      transition: color 0.12s, background 0.12s;
    }
    .xud-ibtn:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.1); }

    /* ── Stats ── */
    .xud-stats {
      display: grid; grid-template-columns: repeat(3,1fr);
      background: var(--navy); border-bottom: 2px solid rgba(0,0,0,0.15);
      flex-shrink: 0;
    }
    .xud-stat { padding: 12px 0 12px 14px; border-right: 1px solid rgba(255,255,255,0.07); }
    .xud-stat:last-child { border-right: none; }
    .xud-sl {
      font-size: 8.5px; color: rgba(255,255,255,0.4); letter-spacing: 0.1em;
      text-transform: uppercase; margin-bottom: 4px; font-family: var(--mono); font-weight: 500;
    }
    .xud-sv {
      font-family: var(--sans); font-weight: 900; font-size: 26px;
      color: rgba(255,255,255,0.9); line-height: 1;
    }
    .xud-sv.amber { color: #f0b040; }
    .xud-sv.green { color: #5ecf8a; }

    /* ── Toolbar ── */
    .xud-toolbar {
      display: flex; gap: 7px; padding: 8px 12px;
      background: var(--surf2); border-bottom: 1.5px solid var(--border);
      flex-shrink: 0;
    }
    .xud-search {
      flex: 1; background: var(--card); border: 1.5px solid var(--border);
      border-radius: 9px; color: var(--text); font-family: var(--mono);
      font-size: 10px; padding: 6px 10px; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .xud-search::placeholder { color: var(--text3); }
    .xud-search:focus { border-color: rgba(212,137,26,0.35); box-shadow: 0 0 0 3px rgba(212,137,26,0.08); }

    .xud-sort {
      background: var(--card); border: 1.5px solid var(--border);
      border-radius: 9px; color: var(--text2); font-family: var(--mono);
      font-size: 8.5px; padding: 6px 9px; cursor: pointer;
      text-transform: uppercase; letter-spacing: 0.06em;
      transition: all 0.13s; white-space: nowrap;
    }
    .xud-sort:hover, .xud-sort.on {
      border-color: rgba(58,138,92,0.3); color: var(--green); background: var(--green-lo);
    }

    /* ── Hint ── */
    .xud-hint {
      padding: 8px 13px; font-size: 10px; color: var(--text3);
      border-bottom: 1.5px solid var(--border2); flex-shrink: 0;
      font-family: var(--mono); line-height: 1.65;
    }
    .xud-hint b { color: var(--amber); font-weight: 500; }

    /* ── Progress ── */
    .xud-prog {
      display: none; flex-shrink: 0;
      border-bottom: 1.5px solid var(--border2);
      background: var(--surf2);
    }
    .xud-prog.on { display: block; }
    .xud-prog-track { height: 3px; background: var(--border); }
    .xud-prog-fill  {
      height: 100%;
      background: linear-gradient(90deg, var(--amber-hi), var(--amber));
      transition: width 0.4s ease; border-radius: 2px;
    }
    .xud-prog-row {
      display: flex; justify-content: space-between;
      padding: 4px 13px 7px; font-size: 9px; font-family: var(--mono);
      color: var(--text3);
    }
    .xud-prog-row span { color: var(--amber); }

    /* ── List ── */
    .xud-list {
      flex: 1; overflow-y: auto; padding: 5px 0;
      scrollbar-width: thin; scrollbar-color: rgba(45,58,74,0.12) transparent;
    }
    .xud-list::-webkit-scrollbar { width: 3px; }
    .xud-list::-webkit-scrollbar-thumb { background: rgba(45,58,74,0.12); border-radius: 2px; }

    /* ── Empty ── */
    .xud-empty {
      padding: 36px 20px; text-align: center;
      color: var(--text3); font-size: 10px; line-height: 2.2; font-family: var(--mono);
    }
    .xud-empty i { font-size: 28px; display: block; margin-bottom: 10px; opacity: 0.35; font-style: normal; }

    /* ── Row ── */
    .xud-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border2);
      background: transparent;
      transition: background 0.12s;
      position: relative; overflow: hidden;
      animation: xud-in 0.18s ease both;
    }
    @keyframes xud-in { from{opacity:0;transform:translateX(6px)} to{opacity:1;transform:none} }
    .xud-row:hover { background: rgba(255,255,255,0.55); }
    .xud-row::before {
      content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
      background: var(--amber); border-radius: 0 2px 2px 0;
      opacity: 0; transition: opacity 0.15s;
    }
    .xud-row:hover::before { opacity: 1; }
    .xud-row.wl::before { background: var(--green); opacity: 0.6; }
    .xud-row.fading { opacity: 0; transform: translateX(10px) scale(0.98); transition: all 0.22s; pointer-events: none; }

    /* Initials avatar */
    .xud-ava {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: var(--sans); font-weight: 900; font-size: 13px;
      flex-shrink: 0; border: 2px solid rgba(255,255,255,0.7);
      box-shadow: 0 1px 4px rgba(45,58,74,0.15);
    }

    .xud-info { flex: 1; min-width: 0; }
    .xud-name {
      font-family: var(--sans); font-weight: 800; font-size: 12.5px;
      color: var(--navy); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .xud-handle {
      font-family: var(--mono); font-size: 9.5px; color: var(--text2);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;
    }
    /* Actions */
    .xud-actions { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }

    .xud-wl {
      width: 28px; height: 28px; border-radius: 8px;
      background: var(--card); border: 1.5px solid var(--border);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 13px; transition: all 0.13s; color: var(--text3);
    }
    .xud-wl:hover    { border-color: rgba(58,138,92,0.35); color: var(--green); background: var(--green-lo); }
    .xud-wl.on       { border-color: rgba(58,138,92,0.4); color: var(--green); background: var(--green-lo); }

    .xud-drop {
      height: 28px; padding: 0 12px;
      background: var(--red-lo); border: 1.5px solid rgba(196,80,74,0.22);
      border-radius: 8px; color: var(--red);
      font-family: var(--sans); font-size: 11px; font-weight: 700;
      cursor: pointer; transition: all 0.13s; display: flex; align-items: center; gap: 4px;
    }
    .xud-drop:hover {
      background: rgba(196,80,74,0.18); border-color: rgba(196,80,74,0.45);
      box-shadow: 0 3px 10px rgba(196,80,74,0.15); transform: translateY(-1px);
    }
    .xud-drop:active { transform: none; }
    .xud-drop.busy { opacity: 0.4; pointer-events: none; }
    .xud-drop.ok   { background: var(--green-lo); border-color: rgba(58,138,92,0.25); color: var(--green); pointer-events: none; }
    .xud-drop.err  { background: rgba(180,120,0,0.08); border-color: rgba(180,120,0,0.2); color: var(--amber); pointer-events: none; }

    /* Footer */
    .xud-ft {
      display: flex; flex-direction: column; gap: 7px;
      padding: 9px 11px 10px; border-top: 1.5px solid var(--border);
      background: var(--surf); flex-shrink: 0;
    }
    .xud-all {
      width: 100%;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: linear-gradient(135deg, #c4504a 0%, #a83a34 100%);
      border: none; border-radius: 11px;
      color: #fff; font-family: var(--sans); font-size: 13px; font-weight: 900;
      letter-spacing: 0.03em; padding: 11px 18px; cursor: pointer;
      transition: all 0.15s;
      box-shadow: 0 4px 16px rgba(196,80,74,0.4), 0 1px 0 rgba(255,255,255,0.12) inset;
    }
    .xud-all:hover {
      background: linear-gradient(135deg, #d45a54, #b84440);
      box-shadow: 0 6px 22px rgba(196,80,74,0.55);
      transform: translateY(-1px);
    }
    .xud-all:active { transform: none; }
    .xud-all .dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      background: rgba(255,255,255,0.7);
      box-shadow: 0 0 8px rgba(255,255,255,0.5);
      animation: xud-dot-pulse 2s ease infinite;
    }
    @keyframes xud-dot-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.65)} }
    .xud-all.running {
      background: linear-gradient(135deg, #3a7a50, #2e6040);
      box-shadow: 0 4px 16px rgba(58,122,80,0.4);
      transform: none; cursor: default;
    }
    .xud-credit { font-family: var(--mono); font-size: 8px; color: var(--text3); text-align: center; }
    .xud-credit a { color: var(--amber); text-decoration: none; transition: color 0.15s; }
    .xud-credit a:hover { color: var(--navy); }

    /* Spinner */
    .xud-spin {
      width: 10px; height: 10px; border-radius: 50%;
      border: 2px solid rgba(196,80,74,0.15); border-top-color: var(--red);
      animation: xud-rot 0.5s linear infinite; display: inline-block; flex-shrink: 0;
    }
    @keyframes xud-rot { to { transform: rotate(360deg); } }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  // ─── Avatar palette (warm, cream, navy tones from wallpaper) ─────────────────
  const AVA_COLORS = [
    ['#2d3a4a','#e8c080'], ['#c8780a','#fff0d0'], ['#3a5c3a','#b0e0c0'],
    ['#5a3a2a','#f0c8a0'], ['#2a3a5a','#a0c0e8'], ['#5a2a2a','#f0a0a0'],
    ['#3a4a2a','#c0d8a0'], ['#4a3a1a','#e0c880'],
  ];
  function avaStyle(h) {
    let v = 0; for (let i = 0; i < h.length; i++) v = (v * 31 + h.charCodeAt(i)) & 0xffffffff;
    const [bg, fg] = AVA_COLORS[Math.abs(v) % AVA_COLORS.length];
    return { bg, fg, ini: h.slice(0, 2).toUpperCase() };
  }

  // ─── Panel ───────────────────────────────────────────────────────────────────
  function savedPos() {
    try {
      const s = sessionStorage.getItem('xud_pos');
      if (s) {
        const { left, top } = JSON.parse(s);
        // Clamp to safe area before applying
        const maxX = window.innerWidth  - 354 - 8;
        const maxY = window.innerHeight - 200 - 8;  // panel must show at least 200px
        return {
          left: Math.max(8,  Math.min(maxX, left)),
          top:  Math.max(56, Math.min(maxY, top)),
        };
      }
    } catch (_) {}
    return null;
  }

  function mountPanel() {
    if (document.getElementById(PANEL_ID)) { panelReady = true; return; }
    const p = document.createElement('div');
    p.id = PANEL_ID;
    p.innerHTML = `
      <div class="xud-hd" id="xud-hd">
        <div class="xud-hd-l">
          <div class="xud-logo">𝕏</div>
          <div class="xud-wordmark">Unfollow<em>Detector</em></div>
          <div class="xud-badge scan" id="xud-badge">0</div>
        </div>
        <div class="xud-hd-r">
          <button class="xud-ibtn" id="xud-reset" title="Reset position">⊙</button>
          <button class="xud-ibtn" id="xud-min">─</button>
          <button class="xud-ibtn" id="xud-close">✕</button>
        </div>
      </div>
      <div class="xud-stats">
        <div class="xud-stat"><div class="xud-sl">Scanned</div><div class="xud-sv" id="xud-sc">0</div></div>
        <div class="xud-stat"><div class="xud-sl">Not Following Back</div><div class="xud-sv amber" id="xud-gh">0</div></div>
        <div class="xud-stat"><div class="xud-sl">Dropped</div><div class="xud-sv green" id="xud-uf">0</div></div>
      </div>
      <div class="xud-toolbar">
        <input class="xud-search" id="xud-search" type="text" placeholder="Filter ghosts…" autocomplete="off" spellcheck="false">
        <button class="xud-sort" id="xud-sort">↓ Followers</button>
      </div>
      <div class="xud-hint" id="xud-hint"><b>↓ Scroll</b> to scan — ghosts appear instantly. ☆ = whitelist.</div>
      <div class="xud-prog" id="xud-prog">
        <div class="xud-prog-track"><div class="xud-prog-fill" id="xud-prog-fill" style="width:0%"></div></div>
        <div class="xud-prog-row"><span id="xud-prog-txt">Dropping…</span><span id="xud-prog-cnt">0/0</span></div>
      </div>
      <div class="xud-list" id="xud-list">
        <div class="xud-empty" id="xud-empty"><i>👻</i>Scroll down to start scanning…</div>
      </div>
      <div class="xud-ft">
        <button class="xud-all" id="xud-all"><span class="dot"></span>Unfollow All</button>
        <div class="xud-credit">.87🌵 <a href="https://x.com/ofalamin" target="_blank">@ofalamin</a></div>
      </div>
    `;
    document.body.appendChild(p);

    // Restore saved position or default to top-right
    const pos = savedPos();
    if (pos) {
      p.style.right = 'auto';
      p.style.left  = pos.left + 'px';
      p.style.top   = pos.top  + 'px';
    }
    // else CSS default (right:14px, top:64px) applies

    panelReady = true;

    document.getElementById('xud-close').onclick = e => { e.stopPropagation(); p.remove(); panelReady = false; };
    document.getElementById('xud-min').onclick = e => {
      e.stopPropagation(); minimized = !minimized;
      p.classList.toggle('xud-min', minimized);
      e.currentTarget.textContent = minimized ? '□' : '─';
    };
    document.getElementById('xud-search').oninput = e => {
      searchQuery = e.target.value.toLowerCase().trim(); applyFilter();
    };
    document.getElementById('xud-sort').onclick = e => {
      sortMode = sortMode === 'detected' ? 'followers' : 'detected';
      e.currentTarget.textContent = sortMode === 'followers' ? '↑ Recent' : '↓ Followers';
      e.currentTarget.classList.toggle('on', sortMode === 'followers');
      rebuildList();
    };
    document.getElementById('xud-all').onclick = () => {
      if (bulkRunning) return;
      const targets = sortedGhosts().filter(g => !whitelist.has(g.screen_name));
      if (!targets.length) return;
      if (!confirm(`Drop ${targets.length} accounts not following you back?\n\nEach unfollow is spaced ~3s apart to stay safe.`)) return;
      runBulk(targets);
    };

    document.getElementById('xud-reset').onclick = e => {
      e.stopPropagation();
      try { sessionStorage.removeItem('xud_pos'); } catch (_) {}
      p.style.transition = 'left 0.3s cubic-bezier(0.4,0,0.2,1), top 0.3s cubic-bezier(0.4,0,0.2,1), right 0.3s';
      p.style.left  = 'auto';
      p.style.right = '14px';
      p.style.top   = '64px';
      setTimeout(() => { p.style.transition = ''; }, 350);
    };

    makeDraggable(p, document.getElementById('xud-hd'));
  }

  function makeDraggable(el, handle) {
    let ox, oy, sx, sy, drag = false;
    const PAD   = 8;
    const TOP   = 56;                    // below X navbar
    const BOT   = 200;                   // panel must always show ≥200px height in viewport

    handle.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      el.style.transition = 'none'; e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!drag) return;
      const newX = Math.max(PAD, Math.min(window.innerWidth  - el.offsetWidth  - PAD, ox + e.clientX - sx));
      const newY = Math.max(TOP, Math.min(window.innerHeight - BOT,                    oy + e.clientY - sy));
      el.style.right = 'auto';
      el.style.left  = newX + 'px';
      el.style.top   = newY + 'px';
      try { sessionStorage.setItem('xud_pos', JSON.stringify({ left: newX, top: newY })); } catch (_) {}
    });
    document.addEventListener('mouseup', () => { drag = false; });
  }

  // ─── Stats cache enrichment ───────────────────────────────────────────────────
  window.addEventListener('__xud_stats', e => {
    try {
      for (const u of JSON.parse(e.detail)) {
        if (!u.screen_name) continue;
        const key = u.screen_name.toLowerCase();
        statsCache.set(key, { ...statsCache.get(key), ...u });
        if (ghosts.has(u.screen_name)) {
          const g = ghosts.get(u.screen_name);
          if (!g.name || g.name === g.screen_name) g.name = u.name || g.name;
          g.id = g.id || u.id;
          g.followers_count = u.followers_count ?? g.followers_count;
          g.friends_count   = u.friends_count   ?? g.friends_count;
          refreshRowData(u.screen_name);
        }
      }
    } catch (_) {}
  });

  function refreshRowData(handle) {
    const row = document.querySelector(`[data-xud="${CSS.escape(handle)}"]`);
    if (!row) return;
    const g = ghosts.get(handle);
    if (!g) return;
    const n = row.querySelector('.xud-name'); if (n && g.name !== handle) n.textContent = g.name;
  }

  // ─── Name extraction ─────────────────────────────────────────────────────────
  function extractName(cell, handle) {
    // data-testid="User-Name" → first span child that's pure text, not @handle
    const nc = cell.querySelector('[data-testid="User-Name"]');
    if (nc) {
      for (const span of nc.querySelectorAll('span')) {
        const t = span.childNodes.length === 1 && span.childNodes[0].nodeType === 3
          ? span.textContent.trim() : '';
        if (t && !t.startsWith('@') && t.toLowerCase() !== handle.toLowerCase() && t.length > 0)
          return t;
      }
    }
    // Fallback: links to /handle, non-@ text
    for (const a of cell.querySelectorAll(`a[href="/${handle}"]`)) {
      const t = a.textContent.trim();
      if (t && !t.startsWith('@') && t.toLowerCase() !== handle.toLowerCase()) return t;
    }
    return handle;
  }

  // ─── DOM scan ────────────────────────────────────────────────────────────────
  function processCell(cell) {
    if (cell.__xud) return;
    const profileLink = [...cell.querySelectorAll('a[href]')]
      .find(a => /^\/[A-Za-z0-9_]{1,50}$/.test(a.getAttribute('href')));
    if (!profileLink) return;

    const handle = profileLink.getAttribute('href').slice(1);
    if (!handle || processed.has(handle) || unfollowed.has(handle) || whitelist.has(handle)) {
      cell.__xud = true; return;
    }

    processed.add(handle); cell.__xud = true; totalScanned++;

    const followsBack = (cell.innerText || cell.textContent || '').includes('Follows you');
    if (!followsBack) {
      const stats = statsCache.get(handle.toLowerCase()) || {};
      ghosts.set(handle, {
        id: stats.id || null, screen_name: handle,
        name: extractName(cell, handle),
        followers_count: stats.followers_count,
        friends_count:   stats.friends_count,
        detected_at:     Date.now(),
        _cell:           new WeakRef(cell),
      });
      addRow(handle);
    }
    refreshStats();
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────
  function sortedGhosts() {
    const arr = [...ghosts.values()];
    return sortMode === 'followers'
      ? arr.sort((a,b) => (b.followers_count||0) - (a.followers_count||0))
      : arr.sort((a,b) => (a.detected_at||0) - (b.detected_at||0));
  }

  function addRow(handle) {
    if (!panelReady) return;
    const list = document.getElementById('xud-list');
    if (!list || list.querySelector(`[data-xud="${CSS.escape(handle)}"]`)) return;
    const g = ghosts.get(handle);
    if (!g) return;
    if (searchQuery && !matchSearch(g)) return;

    document.getElementById('xud-empty')?.style.setProperty('display','none');

    const { bg, fg, ini } = avaStyle(handle);
    const isWL = whitelist.has(handle);

    const row = document.createElement('div');
    row.className  = 'xud-row' + (isWL ? ' wl' : '');
    row.dataset.xud = handle;
    row.innerHTML = `
      <div class="xud-ava" style="background:${bg};color:${fg}">${ini}</div>
      <div class="xud-info">
        <div class="xud-name">${esc(g.name)}</div>
        <div class="xud-handle">@${esc(handle)}</div>
      </div>
      <div class="xud-actions">
        <button class="xud-wl${isWL?' on':''}" title="${isWL?'Remove whitelist':'Whitelist'}">☆</button>
        <button class="xud-drop${isWL?' ok':''}">${isWL?'Protected':'Drop'}</button>
      </div>
    `;

    const wlBtn   = row.querySelector('.xud-wl');
    const dropBtn = row.querySelector('.xud-drop');

    wlBtn.onclick = e => { e.stopPropagation(); toggleWL(handle, row, wlBtn, dropBtn); };
    dropBtn.onclick = e => { e.stopPropagation(); if (!whitelist.has(handle)) startUnfollow(handle, row); };

    list.appendChild(row);
  }

  function rebuildList() {
    if (!panelReady) return;
    document.querySelectorAll('#xud-list .xud-row').forEach(r => r.remove());
    sortedGhosts().filter(g => !searchQuery || matchSearch(g)).forEach(g => addRow(g.screen_name));
    const list = document.getElementById('xud-list');
    const empty = document.getElementById('xud-empty');
    if (empty && list) empty.style.display = list.querySelectorAll('.xud-row').length ? 'none' : '';
  }

  function applyFilter() {
    let vis = 0;
    document.querySelectorAll('#xud-list .xud-row').forEach(row => {
      const g = ghosts.get(row.dataset.xud||'');
      const show = !searchQuery || (g && matchSearch(g));
      row.style.display = show ? '' : 'none';
      if (show) vis++;
    });
    const empty = document.getElementById('xud-empty');
    if (empty) empty.style.display = vis ? 'none' : '';
  }

  function matchSearch(g) {
    return g.screen_name.toLowerCase().includes(searchQuery) ||
           (g.name||'').toLowerCase().includes(searchQuery);
  }

  function toggleWL(handle, row, wlBtn, dropBtn) {
    if (whitelist.has(handle)) {
      whitelist.delete(handle);
      wlBtn.classList.remove('on'); wlBtn.title = 'Whitelist';
      dropBtn.textContent = 'Drop'; dropBtn.classList.remove('ok');
      row.classList.remove('wl');
    } else {
      whitelist.add(handle);
      wlBtn.classList.add('on'); wlBtn.title = 'Remove whitelist';
      dropBtn.textContent = 'Protected'; dropBtn.classList.add('ok');
      row.classList.add('wl');
    }
    saveWL();
  }

  // ─── Unfollow engine ─────────────────────────────────────────────────────────
  async function startUnfollow(handle, rowEl) {
    const btn = rowEl?.querySelector('.xud-drop');
    if (btn) { btn.innerHTML = '<span class="xud-spin"></span>'; btn.classList.add('busy'); }

    const ok = await doUnfollow(handle);
    if (ok) {
      onSuccess(handle, rowEl, btn);
    } else {
      if (btn) {
        btn.textContent = 'Retry';
        btn.classList.remove('busy','err');
        btn.classList.add('err');
        // After 3s reset so they can try again
        setTimeout(() => {
          if (ghosts.has(handle)) {
            btn.textContent = 'Drop';
            btn.classList.remove('err','busy');
          }
        }, 3000);
      }
    }
    return ok;
  }

  // Master unfollow: try DOM click first, API second
  async function doUnfollow(handle) {
    // Method 1: Click Following button in DOM
    const domOk = await clickFollowingButton(handle);
    if (domOk) return true;

    // Method 2: REST API
    return await apiUnfollow(handle);
  }

  // ── DOM method ───────────────────────────────────────────────────────────────
  async function clickFollowingButton(handle) {
    const cell = findCell(handle);
    if (!cell) return false;

    // Find the "Following" button — try multiple strategies
    const followingBtn = findFollowingBtn(cell);
    if (!followingBtn) return false;

    followingBtn.click();

    // Wait for any kind of confirm UI: modal sheet OR dropdown menu
    const confirmed = await waitAndConfirm(handle);
    return confirmed;
  }

  function findFollowingBtn(cell) {
    const btns = [...cell.querySelectorAll('button, [role="button"]')];

    // Strategy 1: aria-label contains "following"
    let btn = btns.find(b => (b.getAttribute('aria-label')||'').toLowerCase().includes('following'));
    if (btn) return btn;

    // Strategy 2: text content exactly "Following"
    btn = btns.find(b => (b.innerText||b.textContent||'').trim().toLowerCase() === 'following');
    if (btn) return btn;

    // Strategy 3: any button whose text includes "following"
    btn = btns.find(b => (b.innerText||b.textContent||'').toLowerCase().includes('following'));
    return btn || null;
  }

  async function waitAndConfirm(handle, timeout = 5000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      await sleep(60);

      // Find ANY button anywhere on the page that says "Unfollow"
      // This covers BOTH modal sheets AND dropdown menus
      const allBtns = [...document.querySelectorAll(
        'button, [role="button"], [role="menuitem"], [data-testid]'
      )];

      for (const btn of allBtns) {
        // Skip our own panel
        if (btn.closest('#xud-panel')) continue;

        const text  = (btn.innerText || btn.textContent || '').trim().toLowerCase();
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const tid   = (btn.getAttribute('data-testid') || '').toLowerCase();

        const isUnfollowBtn =
          tid === 'confirmationsheetconfirm' ||
          tid === 'unfollow' ||
          text === `unfollow @${handle.toLowerCase()}` ||
          text === 'unfollow' ||
          (text.startsWith('unfollow') && text.length < 60) ||
          label.includes('unfollow');

        if (isUnfollowBtn && btn.offsetParent !== null) {
          btn.click();
          return true;
        }
      }
    }

    // Timed out — this might mean X unfollowed without a confirmation prompt
    // (sometimes happens for low-follower accounts)
    // Check if the "Following" button is gone from the cell
    const cell = findCell(handle);
    if (!cell) return true; // cell gone = likely worked
    const stillFollowing = findFollowingBtn(cell);
    if (!stillFollowing) return true; // button gone = worked

    return false;
  }

  function findCell(handle) {
    const g = ghosts.get(handle);
    if (g?._cell) {
      try { const c = g._cell.deref(); if (c && document.contains(c)) return c; } catch (_) {}
    }
    for (const cell of document.querySelectorAll('[data-testid="UserCell"]')) {
      if ([...cell.querySelectorAll('a[href]')].some(a => a.getAttribute('href') === '/'+handle))
        return cell;
    }
    return null;
  }

  // ── API method (fallback) ────────────────────────────────────────────────────
  async function apiUnfollow(handle) {
    const csrf = document.cookie.match(/ct0=([^;]+)/)?.[1];
    if (!csrf) return false;

    const g    = ghosts.get(handle);
    const body = g?.id
      ? `user_id=${encodeURIComponent(g.id)}`
      : `screen_name=${encodeURIComponent(handle)}`;

    try {
      const res = await fetch('https://x.com/i/api/1.1/friendships/destroy.json', {
        method: 'POST', credentials: 'include',
        headers: {
          'Content-Type':              'application/x-www-form-urlencoded',
          'X-CSRF-Token':              csrf,
          'Authorization':             'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I/jej5ICi54=',
          'X-Twitter-Auth-Type':       'OAuth2Session',
          'X-Twitter-Active-User':     'yes',
          'X-Twitter-Client-Language': 'en',
          'Referer':                   location.href,
          'Origin':                    'https://x.com',
        },
        body,
      });
      return res.ok;
    } catch (_) { return false; }
  }

  function onSuccess(handle, rowEl, btn) {
    ghosts.delete(handle); unfollowed.add(handle);
    if (btn) { btn.innerHTML = '✓'; btn.classList.remove('busy'); btn.classList.add('ok'); }
    setTimeout(() => {
      rowEl?.classList.add('fading');
      setTimeout(() => { rowEl?.remove(); refreshStats(); }, 240);
      refreshStats();
    }, 700);
  }

  // ─── Bulk unfollow ────────────────────────────────────────────────────────────
  async function runBulk(targets) {
    bulkRunning = true;
    const allBtn = document.getElementById('xud-all');
    const prog   = document.getElementById('xud-prog');
    const fill   = document.getElementById('xud-prog-fill');
    const ptxt   = document.getElementById('xud-prog-txt');
    const pcnt   = document.getElementById('xud-prog-cnt');

    if (allBtn) { allBtn.innerHTML = '<span class="dot"></span>Running…'; allBtn.classList.add('running'); }
    if (prog)   prog.classList.add('on');

    let done = 0;
    const total = targets.length;

    for (const g of targets) {
      if (whitelist.has(g.screen_name) || unfollowed.has(g.screen_name)) continue;

      const row = document.querySelector(`[data-xud="${CSS.escape(g.screen_name)}"]`);
      const btn = row?.querySelector('.xud-drop');
      if (btn) { btn.innerHTML = '<span class="xud-spin"></span>'; btn.classList.add('busy'); }

      const ok = await doUnfollow(g.screen_name);
      if (ok) onSuccess(g.screen_name, row, btn);
      else if (btn) { btn.textContent = 'Skip'; btn.classList.remove('busy'); btn.classList.add('err'); }

      done++;
      const pct = Math.round((done/total)*100);
      if (fill) fill.style.width = pct + '%';
      if (pcnt) pcnt.textContent = `${done}/${total}`;
      if (ptxt) ptxt.innerHTML   = ok
        ? `Dropped <span>@${esc(g.screen_name)}</span>`
        : `Skipped <span>@${esc(g.screen_name)}</span>`;

      // Anti-bot delay: 2–4.5s random jitter between each unfollow
      if (done < total) await sleep(2000 + Math.random() * 2500);
    }

    bulkRunning = false;
    if (allBtn) { allBtn.innerHTML = '<span class="dot"></span>Unfollow All'; allBtn.classList.remove('running'); }
    setTimeout(() => { if (prog) prog.classList.remove('on'); }, 2500);
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────
  function refreshStats() {
    if (!panelReady) return;
    const sc = document.getElementById('xud-sc'); if (sc) sc.textContent = fmt(totalScanned);
    const gh = document.getElementById('xud-gh'); if (gh) gh.textContent = ghosts.size;
    const uf = document.getElementById('xud-uf'); if (uf) uf.textContent = unfollowed.size;
    const b  = document.getElementById('xud-badge');
    if (b) { b.textContent = ghosts.size; b.classList.toggle('scan', totalScanned === 0); }
    const hint  = document.getElementById('xud-hint');
    if (hint && totalScanned > 5) hint.style.display = 'none';
    const list  = document.getElementById('xud-list');
    const empty = document.getElementById('xud-empty');
    if (list && empty) empty.style.display = list.querySelectorAll('.xud-row').length ? 'none' : '';
  }

  // ─── MutationObserver ─────────────────────────────────────────────────────────
  const observer = new MutationObserver(muts => {
    if (!panelReady) return;
    for (const m of muts) for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches?.('[data-testid="UserCell"]')) processCell(node);
      else node.querySelectorAll?.('[data-testid="UserCell"]').forEach(processCell);
    }
  });

  function init() {
    mountPanel();
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('[data-testid="UserCell"]').forEach(processCell);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 900));
  } else {
    setTimeout(init, 900);
  }

  // ─── Utils ────────────────────────────────────────────────────────────────────
  function fmt(n) {
    if (n == null) return '—';
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
    return String(n);
  }
  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function sleep(ms) { return new Promise(r => setTimeout(r,ms)); }

})();
