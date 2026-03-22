// interceptor.js — 𝕏 Unfollow Detector v5
// MAIN world: captures GraphQL stats into cache for name + counts enrichment.
// By .87🌵 | @ofalamin

(function () {
  'use strict';

  const ENDPOINTS = ['/Following', 'Following?variables', 'followers/following'];

  function extractUsers(data) {
    const users = [];
    const instructions =
      data?.data?.user?.result?.timeline?.timeline?.instructions ||
      data?.data?.user?.result?.timeline_v2?.timeline?.instructions || [];
    for (const inst of instructions) {
      for (const entry of (inst.entries || [])) {
        const u1 = entry?.content?.itemContent?.user_results?.result;
        if (u1?.legacy) users.push(u1);
        for (const item of (entry?.content?.items || [])) {
          const u2 = item?.item?.itemContent?.user_results?.result;
          if (u2?.legacy) users.push(u2);
        }
      }
    }
    return users;
  }

  function dispatch(users) {
    const payload = users
      .filter(u => u.legacy?.screen_name)
      .map(u => ({
        id:              u.rest_id,
        screen_name:     u.legacy.screen_name,
        name:            u.legacy.name,
        followers_count: u.legacy.followers_count,
        friends_count:   u.legacy.friends_count,
      }));
    if (payload.length)
      window.dispatchEvent(new CustomEvent('__xud_stats', { detail: JSON.stringify(payload) }));
  }

  const _fetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    const res = await _fetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      if (ENDPOINTS.some(ep => url.includes(ep)))
        res.clone().json().then(d => dispatch(extractUsers(d))).catch(() => {});
    } catch (_) {}
    return res;
  };

  const _open = XMLHttpRequest.prototype.open;
  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u, ...r) { this.__xud = u; return _open.call(this, m, u, ...r); };
  XMLHttpRequest.prototype.send = function (...a) {
    if (this.__xud && ENDPOINTS.some(ep => this.__xud.includes(ep)))
      this.addEventListener('load', () => { try { dispatch(extractUsers(JSON.parse(this.responseText))); } catch (_) {} });
    return _send.apply(this, a);
  };
})();
