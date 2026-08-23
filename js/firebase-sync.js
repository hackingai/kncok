/**
 * firebase-sync.js — Cross-Device Cloud Sync for Knock Portal
 * ─────────────────────────────────────────────────────────────
 * Bridges Firebase Realtime Database with KnockConfig and
 * KnockAnalytics so that admin changes on any device instantly
 * appear on all guest phones — no page refresh needed.
 *
 * HOW TO SET UP (one time, ~3 minutes):
 *   1. Go to https://console.firebase.google.com
 *   2. Create a new project (free "Spark" plan is enough)
 *   3. Click "Realtime Database" → Create database → Start in TEST mode
 *   4. Copy your config values into FIREBASE_CONFIG below
 *   5. Deploy — done. Cross-device sync is live.
 *
 * SECURITY (before event day):
 *   In Firebase Console → Realtime Database → Rules, set:
 *   {
 *     "rules": {
 *       "config": { ".read": true, ".write": true },
 *       "analytics": { ".read": true, ".write": true }
 *     }
 *   }
 * ─────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  /* ══════════════════════════════════════════════
     STEP 1 — PASTE YOUR FIREBASE CONFIG HERE
     Get this from Firebase Console →
     Project Settings → Your Apps → SDK setup and configuration
  ═══════════════════════════════════════════════ */
  var FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCxLcclyUzbHjlT8ZrcvLxqA4r5MAACToM",
    authDomain:        "housewarming-a2f80.firebaseapp.com",
    databaseURL:       "https://housewarming-a2f80-default-rtdb.firebaseio.com",
    projectId:         "housewarming-a2f80",
    storageBucket:     "housewarming-a2f80.firebasestorage.app",
    messagingSenderId: "309736789076",
    appId:             "1:309736789076:web:1d5c3c5eda4afc479f09c1"
  };

  /* ══════════════════════════════════════════════
     INTERNAL STATE
  ═══════════════════════════════════════════════ */
  var db = null;
  var isConfigured = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
  var isAdmin = false;
  var syncStatusEl = null;
  var lastRemoteConfig = null;
  var analyticsThrottleTimer = null;

  /* ══════════════════════════════════════════════
     DETECT PAGE TYPE
  ═══════════════════════════════════════════════ */
  function detectPageType() {
    var path = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
    isAdmin = path.indexOf('admin') !== -1 ||
              (document.getElementById('login-view') !== null);
  }

  /* ══════════════════════════════════════════════
     UPDATE SYNC STATUS UI (admin only)
  ═══════════════════════════════════════════════ */
  function setSyncStatus(text, isLive) {
    if (!isAdmin) return;
    if (!syncStatusEl) {
      syncStatusEl = document.getElementById('sync-status-text');
    }
    if (syncStatusEl) {
      syncStatusEl.textContent = text;
    }
    // Also update the status dot color
    var dot = document.querySelector('.status-dot');
    if (dot) {
      dot.style.background = isLive ? '' : '#f87171';
      dot.style.boxShadow = isLive ? '' : '0 0 6px #f87171';
    }
  }

  /* ══════════════════════════════════════════════
     FIREBASE INIT
  ═══════════════════════════════════════════════ */
  function initFirebase() {
    if (!isConfigured) {
      setSyncStatus('Local Only (Firebase not configured)', false);
      console.info('[KnockSync] Firebase not configured — running in local-only mode.');
      return;
    }

    try {
      // Use compat SDK loaded via CDN (see index.html / admin.html script tags)
      if (typeof firebase === 'undefined') {
        console.warn('[KnockSync] Firebase SDK not loaded. Add the script tags to your HTML files.');
        setSyncStatus('Firebase SDK missing', false);
        return;
      }

      // Prevent double-init
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }

      db = firebase.database();
      setSyncStatus('Connecting…', false);

      // Test connectivity
      db.ref('.info/connected').on('value', function (snap) {
        if (snap.val() === true) {
          setSyncStatus('Live Sync Active ✓', true);
          if (isAdmin) {
            // Admin: push current local config to Firebase on connect
            pushConfigToFirebase();
          }
        } else {
          setSyncStatus('Reconnecting…', false);
        }
      });

      listenForRemoteConfig();

      if (!isAdmin) {
        listenForAnalyticsSyncNeeds();
      }

    } catch (err) {
      console.error('[KnockSync] Firebase init error:', err);
      setSyncStatus('Sync Error — using local', false);
    }
  }

  /* ══════════════════════════════════════════════
     PUSH CONFIG TO FIREBASE (admin writes)
  ═══════════════════════════════════════════════ */
  function pushConfigToFirebase(config) {
    if (!db || !isAdmin) return;

    var cfg = config || (window.KnockConfig ? window.KnockConfig.get() : null);
    if (!cfg) return;

    // Don't push admin credentials to Firebase
    var safeCfg = Object.assign({}, cfg);
    delete safeCfg.adminName;
    delete safeCfg.adminPass;
    delete safeCfg.firebaseConfig;

    db.ref('knock/config').set(safeCfg).catch(function (err) {
      console.warn('[KnockSync] Failed to push config:', err);
    });
  }

  /* ══════════════════════════════════════════════
     LISTEN FOR REMOTE CONFIG CHANGES (guest phones receive)
  ═══════════════════════════════════════════════ */
  function listenForRemoteConfig() {
    if (!db) return;

    // Guests: read config ONCE then disconnect to free up the 100 connection limit
    // This means ~2 seconds connected per guest instead of staying open forever
    db.ref('knock/config').once('value', function (snap) {
      var remoteConfig = snap.val();
      if (!remoteConfig) return;

      var remoteStr = JSON.stringify(remoteConfig);
      if (lastRemoteConfig === remoteStr) return;
      lastRemoteConfig = remoteStr;

      if (isAdmin) return;

      // Guest phone: merge remote config into local and trigger DOM update
      if (window.KnockConfig) {
        var localCfg = window.KnockConfig.get();
        var merged = Object.assign({}, localCfg, remoteConfig, {
          adminName: localCfg.adminName,
          adminPass: localCfg.adminPass
        });
        window.KnockConfig.save(merged);
      }

      // After initial load, poll every 15 seconds silently in background
      // Guest never sees a "change" — content just stays current
      // 1000 devices × every 15s × 14 days = ~48 MB (well within 10 GB free limit)
      // Simultaneous connections: only 2-5 at any moment (connect → read → disconnect)
      setInterval(function () {
        db.ref('knock/config').once('value', function (snap2) {
          var cfg2 = snap2.val();
          if (!cfg2) return;
          var str2 = JSON.stringify(cfg2);
          if (lastRemoteConfig === str2) return; // nothing changed, do nothing
          lastRemoteConfig = str2;
          if (window.KnockConfig) {
            var local = window.KnockConfig.get();
            var m = Object.assign({}, local, cfg2, {
              adminName: local.adminName,
              adminPass: local.adminPass
            });
            window.KnockConfig.save(m); // silently updates DOM — guest sees no flash
          }
        });
      }, 15000); // 15 seconds — fast enough, light enough

    }, function (err) {
      console.warn('[KnockSync] Config read error:', err);
    });
  }

  /* ══════════════════════════════════════════════
     ANALYTICS SYNC — push from guest phones to Firebase
     so admin dashboard shows real visitor counts
  ═══════════════════════════════════════════════ */
  function listenForAnalyticsSyncNeeds() {
    if (!db || isAdmin) return;

    // When analytics changes locally (visitor tracked), push to Firebase
    // Use throttle to avoid hammering Firebase on every heartbeat
    var ANALYTICS_KEY = 'knock_invitation_analytics_v1';

    // Watch for localStorage changes to analytics (cross-tab)
    window.addEventListener('storage', function (e) {
      if (e.key === ANALYTICS_KEY) {
        throttledPushAnalytics();
      }
    });

    // Also push once on load (this visit)
    setTimeout(throttledPushAnalytics, 2000);
  }

  function throttledPushAnalytics() {
    if (analyticsThrottleTimer) return;
    analyticsThrottleTimer = setTimeout(function () {
      analyticsThrottleTimer = null;
      pushAnalyticsToFirebase();
    }, 3000); // push at most once every 3s
  }

  function pushAnalyticsToFirebase() {
    if (!db || isAdmin || !window.KnockAnalytics) return;

    var stats = window.KnockAnalytics.getStats();
    var visitorId = null;
    try {
      visitorId = localStorage.getItem('knock_visitor_uid_v1');
    } catch (e) {}

    if (!visitorId) return;

    // Each visitor writes to their own node — no read-modify-write conflicts
    var payload = {
      lastSeen: Date.now(),
      device: window.KnockAnalytics.detectDevice ? window.KnockAnalytics.detectDevice() : 'unknown',
      platform: window.KnockAnalytics.detectPlatform ? window.KnockAnalytics.detectPlatform() : 'unknown',
      screen: window.innerWidth + 'x' + window.innerHeight,
      date: window.KnockAnalytics.getTodayDateKey ? window.KnockAnalytics.getTodayDateKey() : new Date().toISOString().slice(0, 10)
    };

    db.ref('knock/visitors/' + visitorId).set(payload).catch(function () {});

    // Push aggregated daily stats (written by the visitor owning that day entry)
    var today = stats.today;
    if (today && today.date) {
      db.ref('knock/dailyStats/' + today.date).transaction(function (current) {
        if (!current) {
          return {
            date: today.date,
            totalViews: today.totalViews || 1,
            uniqueVisitors: today.uniqueVisitors || 1,
            devices: today.devices || { mobile: 0, desktop: 0, tablet: 0, tv: 0 }
          };
        }
        // Merge: take max unique visitors and sum total views
        return {
          date: today.date,
          totalViews: Math.max(current.totalViews || 0, today.totalViews || 0),
          uniqueVisitors: Math.max(current.uniqueVisitors || 0, today.uniqueVisitors || 0),
          devices: {
            mobile:  Math.max((current.devices && current.devices.mobile)  || 0, (today.devices && today.devices.mobile)  || 0),
            desktop: Math.max((current.devices && current.devices.desktop) || 0, (today.devices && today.devices.desktop) || 0),
            tablet:  Math.max((current.devices && current.devices.tablet)  || 0, (today.devices && today.devices.tablet)  || 0),
            tv:      Math.max((current.devices && current.devices.tv)      || 0, (today.devices && today.devices.tv)      || 0)
          }
        };
      }).catch(function () {});
    }
  }

  /* ══════════════════════════════════════════════
     ADMIN ANALYTICS READER — pull from Firebase
  ═══════════════════════════════════════════════ */
  function listenForAnalyticsOnAdmin() {
    if (!db || !isAdmin) return;

    // Listen for live visitor presence
    db.ref('knock/visitors').on('value', function (snap) {
      var visitors = snap.val();
      if (!visitors) return;

      var now = Date.now();
      var activeNow = 0;
      var deviceCounts = { mobile: 0, desktop: 0, tablet: 0, tv: 0 };
      var recentList = [];

      Object.keys(visitors).forEach(function (vid) {
        var v = visitors[vid];
        if (!v) return;

        var age = now - (v.lastSeen || 0);
        var isActive = age < 10000; // 10s window for cross-device
        if (isActive) activeNow++;

        if (v.device && deviceCounts.hasOwnProperty(v.device)) {
          deviceCounts[v.device]++;
        }

        recentList.push({
          id: vid.slice(0, 10),
          fullId: vid,
          time: new Date(v.lastSeen || now).toISOString(),
          device: v.device || 'desktop',
          platform: v.platform || 'other',
          screen: v.screen || 'unknown',
          isActive: isActive
        });
      });

      // Sort newest first
      recentList.sort(function (a, b) {
        return new Date(b.time) - new Date(a.time);
      });

      // Inject into admin KPI elements directly
      var kpiActiveNow = document.getElementById('kpi-active-now');
      if (kpiActiveNow) kpiActiveNow.textContent = activeNow;

      // Update recent visitor table if it exists
      renderFirebaseVisitorTable(recentList);

    }, function (err) {
      console.warn('[KnockSync] Analytics listener error:', err);
    });

    // Listen for daily stats
    db.ref('knock/dailyStats').on('value', function (snap) {
      var dailyData = snap.val();
      if (!dailyData) return;

      var todayKey = window.KnockAnalytics ? window.KnockAnalytics.getTodayDateKey() : new Date().toISOString().slice(0, 10);
      var todayData = dailyData[todayKey];

      if (todayData) {
        var kpiToday = document.getElementById('kpi-today-unique');
        if (kpiToday) kpiToday.textContent = todayData.uniqueVisitors || 0;

        var kpiTotal = document.getElementById('kpi-total-views');
        if (kpiTotal) kpiTotal.textContent = todayData.totalViews || 0;
      }

      // Render historical daily table from Firebase
      renderFirebaseDailyTable(dailyData, todayKey);

    }, function (err) {
      console.warn('[KnockSync] Daily stats listener error:', err);
    });
  }

  function renderFirebaseVisitorTable(recentList) {
    var tbody = document.getElementById('visitor-log-tbody');
    if (!tbody) return;

    if (recentList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-dim); padding: 20px;">No guest visits recorded yet. Open the invitation on a phone to test!</td></tr>';
      return;
    }

    var html = '';
    recentList.slice(0, 35).forEach(function (v) {
      var devIcon = '💻 Desktop';
      if (v.device === 'tv') devIcon = '📺 Smart TV';
      else if (v.device === 'tablet') devIcon = '📟 Tablet';
      else if (v.device === 'mobile') devIcon = '📱 Mobile';

      var platBadge = '🪟 ' + (v.platform || 'Other');
      if (v.platform === 'android') platBadge = '🤖 Android';
      else if (v.platform === 'ios') platBadge = '🍏 iOS';
      else if (v.platform === 'smart_tv') platBadge = '📺 Smart TV OS';

      var statusBadge = v.isActive
        ? '<span class="status-live-pill">🟢 Active Now</span>'
        : '<span class="status-past-pill">⚪ Past</span>';

      var timeAgo = formatRelTime(v.time);

      html += '<tr>' +
        '<td><code>' + v.id + '</code></td>' +
        '<td><span class="visitor-badge">' + devIcon + '</span></td>' +
        '<td>' + platBadge + '</td>' +
        '<td>' + (v.screen || 'Auto') + '</td>' +
        '<td>' + timeAgo + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '</tr>';
    });

    tbody.innerHTML = html;
  }

  function renderFirebaseDailyTable(dailyData, todayKey) {
    var tbody = document.getElementById('daily-history-tbody');
    if (!tbody) return;

    var list = [];
    Object.keys(dailyData).forEach(function (dateKey) {
      var d = dailyData[dateKey];
      list.push({
        date: dateKey,
        uniqueVisitors: d.uniqueVisitors || 0,
        totalViews: d.totalViews || 0,
        devices: d.devices || { mobile: 0, desktop: 0, tablet: 0, tv: 0 }
      });
    });

    list.sort(function (a, b) { return b.date.localeCompare(a.date); });

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-dim); padding: 18px;">No visitor history yet.</td></tr>';
      return;
    }

    var html = '';
    list.forEach(function (item) {
      var isToday = item.date === todayKey;
      var dateLabel = formatDate(item.date);
      var todayBadge = isToday ? '<span class="badge-pill badge-pill--today" style="margin-left:8px;">Today</span>' : '';

      var devs = item.devices;
      var devParts = [];
      if (devs.mobile)  devParts.push('📱 ' + devs.mobile);
      if (devs.desktop) devParts.push('💻 ' + devs.desktop);
      if (devs.tablet)  devParts.push('📟 ' + devs.tablet);
      if (devs.tv)      devParts.push('📺 ' + devs.tv);
      var devStr = devParts.length > 0 ? devParts.join(' · ') : '<span style="color:var(--text-dim)">—</span>';

      html += '<tr' + (isToday ? ' class="row-today-highlight"' : '') + '>' +
        '<td><strong>' + dateLabel + '</strong>' + todayBadge + '</td>' +
        '<td><span class="visitor-count-highlight">' + item.uniqueVisitors + '</span></td>' +
        '<td>' + item.totalViews + '</td>' +
        '<td>' + devStr + '</td>' +
        '</tr>';
    });

    tbody.innerHTML = html;
  }

  function formatRelTime(isoStr) {
    try {
      var diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return Math.floor(diff / 86400) + 'd ago';
    } catch (e) { return 'Recently'; }
  }

  function formatDate(dateStr) {
    try {
      var parts = dateStr.split('-');
      var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return dateStr; }
  }

  /* ══════════════════════════════════════════════
     HOOK INTO KnockConfig.save (admin pushes changes)
  ═══════════════════════════════════════════════ */
  function hookConfigSave() {
    if (!window.KnockConfig || !isAdmin) return;

    var originalSave = window.KnockConfig.save;
    window.KnockConfig.save = function (newConfig) {
      var result = originalSave.call(window.KnockConfig, newConfig);
      // Push to Firebase after local save
      if (db) {
        setTimeout(function () { pushConfigToFirebase(result); }, 50);
      }
      return result;
    };
  }

  /* ══════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════ */
  function init() {
    detectPageType();

    function run() {
      initFirebase();
      if (isAdmin && db) {
        hookConfigSave();
        // Small delay to let admin dashboard DOM render first
        setTimeout(listenForAnalyticsOnAdmin, 800);
      }
    }

    // Wait for KnockConfig to be available
    if (window.KnockConfig) {
      run();
    } else {
      var attempts = 0;
      var waitForConfig = setInterval(function () {
        attempts++;
        if (window.KnockConfig) {
          clearInterval(waitForConfig);
          run();
        } else if (attempts > 20) {
          clearInterval(waitForConfig);
          console.warn('[KnockSync] KnockConfig not available, sync disabled.');
        }
      }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.KnockSync = {
    push: pushConfigToFirebase,
    isConfigured: function () { return isConfigured; },
    isConnected: function () { return db !== null; }
  };

})(window);
