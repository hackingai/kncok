/**
 * firebase-sync.js — Cross-Device Real-Time Sync for Knock Portal
 * ─────────────────────────────────────────────────────────────────
 * • Admin changes sync to all guest phones within 15 seconds
 * • Guest visits appear in admin analytics in real-time
 * • Active Now updates every 1 second — no manual refresh needed
 * • Guest heartbeat every 5 seconds — stays Active Now while open
 * ─────────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCxLcclyUzbHjlT8ZrcvLxqA4r5MAACToM",
    authDomain:        "housewarming-a2f80.firebaseapp.com",
    databaseURL:       "https://housewarming-a2f80-default-rtdb.firebaseio.com",
    projectId:         "housewarming-a2f80",
    storageBucket:     "housewarming-a2f80.firebasestorage.app",
    messagingSenderId: "309736789076",
    appId:             "1:309736789076:web:1d5c3c5eda4afc479f09c1"
  };

  var db            = null;
  var isAdmin       = false;
  var lastCfgStr    = null;
  var cachedVisitors = null; // local cache for 1-second UI refresh

  /* ─── Detect page type ─────────────────────────── */
  function detectPageType() {
    var path = (window.location.pathname || '').toLowerCase();
    isAdmin = path.indexOf('admin') !== -1 ||
              document.getElementById('login-view') !== null;
  }

  /* ─── Sync status badge (admin only) ─────────────── */
  function setSyncStatus(text, live) {
    if (!isAdmin) return;
    var el  = document.getElementById('sync-status-text');
    var dot = document.querySelector('.status-dot');
    if (el)  el.textContent = text;
    if (dot) {
      dot.style.background  = live ? '' : '#f87171';
      dot.style.boxShadow   = live ? '' : '0 0 6px #f87171';
    }
  }

  /* ══════════════════════════════════════════════════
     FIREBASE INIT
  ══════════════════════════════════════════════════ */
  function initFirebase() {
    if (typeof firebase === 'undefined') {
      setSyncStatus('Firebase SDK missing', false);
      return;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.database();
    setSyncStatus('Connecting…', false);

    db.ref('.info/connected').on('value', function (snap) {
      if (snap.val() === true) {
        setSyncStatus('Live Sync Active ✓', true);
        if (isAdmin) pushConfigToFirebase();
      } else {
        setSyncStatus('Reconnecting…', false);
      }
    });
  }

  /* ══════════════════════════════════════════════════
     CONFIG SYNC — admin pushes, guests receive
  ══════════════════════════════════════════════════ */
  function pushConfigToFirebase(cfg) {
    if (!db || !isAdmin) return;
    var c = cfg || (window.KnockConfig ? window.KnockConfig.get() : null);
    if (!c) return;
    var safe = Object.assign({}, c);
    delete safe.adminName;
    delete safe.adminPass;
    delete safe.firebaseConfig;
    db.ref('knock/config').set(safe).catch(function(){});
  }

  function hookConfigSave() {
    if (!window.KnockConfig || !isAdmin) return;
    if (window.KnockConfig._fbHooked) return;
    window.KnockConfig._fbHooked = true;
    var orig = window.KnockConfig.save;
    window.KnockConfig.save = function (newCfg) {
      var result = orig.call(window.KnockConfig, newCfg);
      pushConfigToFirebase(result);
      return result;
    };
  }

  function listenForRemoteConfig() {
    if (!db || isAdmin) return;

    // Load once immediately on page open
    db.ref('knock/config').once('value', function (snap) {
      applyRemoteConfig(snap.val());
    });

    // Then poll every 15 seconds silently — no visible change to guest
    setInterval(function () {
      db.ref('knock/config').once('value', function (snap) {
        applyRemoteConfig(snap.val());
      });
    }, 15000);
  }

  function applyRemoteConfig(remote) {
    if (!remote || !window.KnockConfig) return;
    var str = JSON.stringify(remote);
    if (lastCfgStr === str) return; // nothing changed
    lastCfgStr = str;
    var local  = window.KnockConfig.get();
    var merged = Object.assign({}, local, remote, {
      adminName: local.adminName,
      adminPass: local.adminPass
    });
    window.KnockConfig.save(merged);
  }

  /* ══════════════════════════════════════════════════
     GUEST HEARTBEAT — pushes presence to Firebase
     Every 5 seconds so Active Now stays alive
  ══════════════════════════════════════════════════ */
  function startGuestHeartbeat() {
    if (!db || isAdmin) return;

    pushHeartbeat(); // immediate
    setInterval(pushHeartbeat, 5000);
  }

  function pushHeartbeat() {
    if (!db || isAdmin) return;
    var vid = null;
    try { vid = localStorage.getItem('knock_visitor_uid_v1'); } catch(e){}
    if (!vid) return;

    var device   = window.KnockAnalytics ? window.KnockAnalytics.detectDevice()   : 'desktop';
    var platform = window.KnockAnalytics ? window.KnockAnalytics.detectPlatform() : 'other';
    var today    = window.KnockAnalytics ? window.KnockAnalytics.getTodayDateKey() : new Date().toISOString().slice(0,10);

    // Write visitor heartbeat node
    db.ref('knock/visitors/' + vid).set({
      lastSeen: Date.now(),
      device:   device,
      platform: platform,
      screen:   (window.screen.width || window.innerWidth) + 'x' + (window.screen.height || window.innerHeight),
      date:     today
    }).catch(function(){});

    // Write into daily unique visitor map (one write per visitor per day)
    db.ref('knock/daily/' + today + '/' + vid).set({
      device:   device,
      platform: platform,
      ts:       Date.now()
    }).catch(function(){});
  }

  /* ══════════════════════════════════════════════════
     ADMIN ANALYTICS — real-time + 1-second UI refresh
  ══════════════════════════════════════════════════ */
  function startAdminAnalytics() {
    if (!db || !isAdmin) return;

    // Firebase real-time listeners — fire instantly when data changes
    // These are the ONLY Firebase reads — no polling
    db.ref('knock/visitors').on('value', function (snap) {
      cachedVisitors = snap.val() || {};
      rebuildVisitorUI();
    });

    db.ref('knock/daily').on('value', function (snap) {
      rebuildDailyUI(snap.val());
    });

    // 1-second tick — ONLY re-renders from cached data, zero Firebase reads
    // This keeps Active Now / Past status fresh as time passes
    setInterval(function () {
      rebuildVisitorUI();
    }, 1000);
  }

  function rebuildVisitorUI() {
    var visitors = cachedVisitors;
    if (!visitors) {
      setEl('kpi-active-now',   '0');
      setEl('kpi-active-tabs',  '0');
      renderVisitorTable([]);
      return;
    }

    var now        = Date.now();
    var activeNow  = 0;
    var todayKey   = window.KnockAnalytics ? window.KnockAnalytics.getTodayDateKey() : new Date().toISOString().slice(0,10);
    var devCounts  = { mobile:0, desktop:0, tablet:0, tv:0 };
    var platCounts = { android:0, ios:0, windows:0, mac:0, smart_tv:0, other:0 };
    var rows       = [];

    var todayVisitors = 0;
    Object.keys(visitors).forEach(function(vid) {
      var v = visitors[vid];
      if (!v) return;
      var age      = now - (v.lastSeen || 0);
      var isActive = age < 60000; // 60s window — handles Android background tab pausing JS
      if (isActive) activeNow++;

      // Count ALL visitors who visited today for unique count + device/platform bars
      if (v.date === todayKey) {
        todayVisitors++;
        if (devCounts.hasOwnProperty(v.device))     devCounts[v.device]++;
        if (platCounts.hasOwnProperty(v.platform))  platCounts[v.platform]++;
      }

      rows.push({
        id:       vid.slice(0, 10),
        device:   v.device   || 'desktop',
        platform: v.platform || 'other',
        screen:   v.screen   || '—',
        time:     new Date(v.lastSeen || now).toISOString(),
        isActive: isActive
      });
    });

    rows.sort(function(a,b){ return new Date(b.time) - new Date(a.time); });

    setEl('kpi-active-now',   activeNow);
    setEl('kpi-active-tabs',  activeNow);
    setEl('kpi-today-unique', todayVisitors);

    // Device bars
    var dTotal = (devCounts.mobile + devCounts.desktop + devCounts.tablet + devCounts.tv) || 1;
    renderBar('dev-mobile',  devCounts.mobile,  dTotal);
    renderBar('dev-desktop', devCounts.desktop, dTotal);
    renderBar('dev-tablet',  devCounts.tablet,  dTotal);
    renderBar('dev-tv',      devCounts.tv,      dTotal);

    // Platform bars
    var pOther = (platCounts.windows||0) + (platCounts.mac||0) + (platCounts.other||0);
    var pTotal = (platCounts.android + platCounts.ios + pOther + platCounts.smart_tv) || 1;
    renderBar('plat-android', platCounts.android,   pTotal);
    renderBar('plat-ios',     platCounts.ios,        pTotal);
    renderBar('plat-other',   pOther,                pTotal, pOther);
    renderBar('plat-tv',      platCounts.smart_tv,   pTotal);

    renderVisitorTable(rows);
  }

  function rebuildDailyUI(daily) {
    if (!daily) return;
    var todayKey = window.KnockAnalytics ? window.KnockAnalytics.getTodayDateKey() : new Date().toISOString().slice(0,10);
    var list = [];
    var totalViews = 0;

    Object.keys(daily).forEach(function(dateKey) {
      var visitorMap = daily[dateKey] || {};
      var uCount = Object.keys(visitorMap).length;
      var devs = { mobile:0, desktop:0, tablet:0, tv:0 };
      Object.keys(visitorMap).forEach(function(vid) {
        var d = visitorMap[vid].device;
        if (devs.hasOwnProperty(d)) devs[d]++;
      });
      list.push({ date: dateKey, uniqueVisitors: uCount, totalViews: uCount, devices: devs });
      totalViews += uCount;
    });

    list.sort(function(a,b){ return b.date.localeCompare(a.date); });

    // Update KPIs
    var todayEntry = null;
    for (var i=0; i<list.length; i++) { if(list[i].date===todayKey){ todayEntry=list[i]; break; } }
    if (todayEntry) setEl('kpi-today-unique', todayEntry.uniqueVisitors);
    setEl('kpi-total-views', totalViews);

    // Daily history table
    var tbody = document.getElementById('daily-history-tbody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:18px;">No visitor history yet.</td></tr>';
      return;
    }
    var html = '';
    list.forEach(function(item) {
      var isToday    = item.date === todayKey;
      var dateLabel  = fmtDate(item.date);
      var todayBadge = isToday ? '<span class="badge-pill badge-pill--today" style="margin-left:8px;">Today</span>' : '';
      var d          = item.devices;
      var parts      = [];
      if(d.mobile)  parts.push('📱 '+d.mobile);
      if(d.desktop) parts.push('💻 '+d.desktop);
      if(d.tablet)  parts.push('📟 '+d.tablet);
      if(d.tv)      parts.push('📺 '+d.tv);
      var devStr = parts.length ? parts.join(' · ') : '<span style="color:var(--text-dim)">—</span>';
      html += '<tr'+(isToday?' class="row-today-highlight"':'')+'>'+
        '<td><strong>'+dateLabel+'</strong>'+todayBadge+'</td>'+
        '<td><span class="visitor-count-highlight">'+item.uniqueVisitors+'</span></td>'+
        '<td>'+item.totalViews+'</td>'+
        '<td>'+devStr+'</td>'+
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  function renderVisitorTable(rows) {
    var tbody = document.getElementById('visitor-log-tbody');
    if (!tbody) return;
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:20px;">No guest visits yet. Open the invite on a phone to test!</td></tr>';
      return;
    }
    var html = '';
    rows.slice(0, 50).forEach(function(v) {
      var devIcon  = v.device==='mobile'  ? '📱 Mobile'
                   : v.device==='tablet'  ? '📟 Tablet'
                   : v.device==='tv'      ? '📺 Smart TV'
                   :                        '💻 Desktop';
      var platIcon = v.platform==='android'  ? '🤖 Android'
                   : v.platform==='ios'      ? '🍏 iOS'
                   : v.platform==='smart_tv' ? '📺 Smart TV OS'
                   :                           '🪟 ' + (v.platform || 'Other');
      var status   = v.isActive
        ? '<span class="status-live-pill">🟢 Active Now</span>'
        : '<span class="status-past-pill">⚪ Past</span>';
      html += '<tr>'+
        '<td><code>'+v.id+'</code></td>'+
        '<td><span class="visitor-badge">'+devIcon+'</span></td>'+
        '<td>'+platIcon+'</td>'+
        '<td>'+v.screen+'</td>'+
        '<td>'+fmtTime(v.time)+'</td>'+
        '<td>'+status+'</td>'+
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  /* ─── Helpers ──────────────────────────────────── */
  function setEl(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function renderBar(prefix, count, total, overrideCount) {
    var pct     = Math.round((count / total) * 100);
    var display = overrideCount !== undefined ? overrideCount : count;
    var pEl     = document.getElementById(prefix + '-pct');
    var bEl     = document.getElementById(prefix + '-bar');
    if (pEl) pEl.textContent  = pct + '% (' + display + ')';
    if (bEl) bEl.style.width  = pct + '%';
  }

  function fmtTime(iso) {
    try {
      var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diff < 5)     return 'Just now';
      if (diff < 60)    return diff + 's ago';
      if (diff < 3600)  return Math.floor(diff/60)   + 'm ago';
      if (diff < 86400) return Math.floor(diff/3600)  + 'h ago';
      return Math.floor(diff/86400) + 'd ago';
    } catch(e) { return 'Recently'; }
  }

  function fmtDate(str) {
    try {
      var p = str.split('-');
      return new Date(+p[0], +p[1]-1, +p[2]).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
    } catch(e) { return str; }
  }

  /* ══════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════ */
  function init() {
    detectPageType();

    // Hook config save immediately — never miss an admin save
    if (isAdmin) hookConfigSave();

    initFirebase();

    if (isAdmin) {
      // Wait for db to be ready then start analytics
      var wait = setInterval(function() {
        if (db) { clearInterval(wait); startAdminAnalytics(); }
      }, 200);
    } else {
      // Guest: load remote config + start heartbeat
      var wait2 = setInterval(function() {
        if (db) {
          clearInterval(wait2);
          listenForRemoteConfig();
          startGuestHeartbeat();
        }
      }, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.KnockSync = {
    push: pushConfigToFirebase,
    isConnected: function() { return db !== null; },
    clearAnalytics: function() {
      if (!db) return;
      db.ref('knock/visitors').remove().catch(function(){});
      db.ref('knock/daily').remove().catch(function(){});
    }
  };

})(window);
