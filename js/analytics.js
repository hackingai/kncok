/**
 * analytics.js — Guest Visitor Analytics & Realtime Presence Tracker
 * ──────────────────────────────────────────────────────────────────
 * Precision tracking system for Knock Invitation & Admin Portal.
 * • Daily Unique Visitors with automatic midnight reset (IST / UTC+5:30)
 * • Persistent device identification across Wi-Fi/Mobile data/IP changes
 * • Real-time Active Now (unique visitors) and Active Tabs (open tabs)
 * • 4-tier device classification: 📱 Mobile, 💻 Desktop, 📟 Tablet, 📺 Smart TV
 * • Historical daily visitor retention & interaction analytics
 * ──────────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  var STATS_KEY = 'knock_invitation_analytics_v1';
  var VISITOR_ID_KEY = 'knock_visitor_uid_v1';
  var ACTIVE_SESSIONS_KEY = 'knock_active_sessions_v1';
  var BROADCAST_CHANNEL_NAME = 'knock_invitation_channel';

  // Unique tab ID for the current browsing session
  var TAB_ID = 'tab_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);

  var DEFAULT_STATS = {
    totalViews: 0,
    uniqueVisitorsAllTime: 0,
    calendarClicks: 0,
    locationClicks: 0,
    audioPlays: 0,
    devices: {
      mobile: 0,
      desktop: 0,
      tablet: 0,
      tv: 0
    },
    platforms: {
      android: 0,
      ios: 0,
      windows: 0,
      mac: 0,
      smart_tv: 0,
      other: 0
    },
    dailyStats: {}, // maps "YYYY-MM-DD" -> { date, uniqueVisitors, totalViews, devices: {mobile,desktop,tablet,tv}, visitorIds: {} }
    recentVisitors: [] // array of { id, fullId, time, device, platform, screen }
  };

  var channel = null;
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }
  } catch (e) {}

  /**
   * Returns current date key formatted as "YYYY-MM-DD" in project's timezone (Asia/Kolkata, UTC+5:30).
   * Ensures daily counts reset cleanly at local midnight.
   */
  function getTodayDateKey() {
    try {
      var formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(new Date()); // returns "YYYY-MM-DD"
    } catch (e) {
      var now = new Date();
      var istOffsetMs = 5.5 * 60 * 60 * 1000;
      var istDate = new Date(now.getTime() + istOffsetMs + (now.getTimezoneOffset() * 60000));
      return istDate.toISOString().slice(0, 10);
    }
  }

  /**
   * Categorizes client device into one of 4 strict categories:
   * 1. 'tv'      — 📺 Smart TV / Set-top box
   * 2. 'tablet'  — 📟 Tablet / iPad
   * 3. 'mobile'  — 📱 Mobile Phone
   * 4. 'desktop' — 💻 Desktop / Laptop
   *
   * NOTE: Uses both UA string AND screen dimensions for accuracy.
   * UA alone misses many Android tablets. Screen width alone misses
   * desktop browsers opened narrow. Combined check is most reliable.
   */
  function detectDevice() {
    var ua = navigator.userAgent || '';

    // 1. Smart TV Detection
    var isTv = /smart[-_]?tv|tizen|web0s|webos|netcast|vizio|bravia|googletv|androidtv|android tv|appletv|apple tv|roku|crkey|hbbtv|aftt|aftm|aftb|amazon_fire_tv|firetv|pov_tv|hisense|vidaa|mitv|inettvbrowser|operatv|philips|playstation|xbox|nintendo|large-screen|smarttv/i.test(ua);
    if (isTv) return 'tv';

    // 2. iPad (modern iPads report as "Macintosh" with touch points)
    var isIpad = /ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (isIpad) return 'tablet';

    // 3. Android tablet: has "Android" but NOT "Mobile" in UA
    var isAndroidTablet = /android/i.test(ua) && !/mobile/i.test(ua);
    if (isAndroidTablet) return 'tablet';

    // 4. Other tablets (Kindle, Silk, PlayBook)
    var isOtherTablet = /tablet|playbook|silk|kindle/i.test(ua);
    if (isOtherTablet) return 'tablet';

    // 5. Mobile phones: UA-based check is primary (most reliable on phones)
    var isMobileUA = /mobile|iphone|ipod|blackberry|iemobile|opera mini|windows phone/i.test(ua) ||
                     (/android/i.test(ua) && /mobile/i.test(ua));
    if (isMobileUA) return 'mobile';

    // 6. Narrow screen fallback: catches mobile browsers with unusual UAs
    // Only use this if UA didn't match anything above
    var screenW = window.screen ? window.screen.width : window.innerWidth;
    var screenH = window.screen ? window.screen.height : window.innerHeight;
    var shortSide = Math.min(screenW, screenH);
    if (shortSide <= 480) return 'mobile';
    if (shortSide <= 900 && navigator.maxTouchPoints > 0) return 'tablet';

    // 7. Desktop fallback
    return 'desktop';
  }

  /**
   * Categorizes operating system / environment
   */
  function detectPlatform() {
    var ua = (navigator.userAgent || '').toLowerCase();
    if (/smart[-_]?tv|tizen|webos|hbbtv|roku|bravia|googletv|apple tv|firetv|vizio|hisense/i.test(ua)) return 'smart_tv';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua))) return 'ios';
    if (/windows/i.test(ua)) return 'windows';
    if (/macintosh|mac os/i.test(ua)) return 'mac';
    if (/linux/i.test(ua)) return 'linux';
    return 'other';
  }

  /**
   * Retrieves or creates a permanent anonymous visitor UUID in localStorage.
   * Persistent across Wi-Fi ↔ Mobile Data changes and IP reallocations.
   */
  function getOrCreateVisitorId() {
    var vid = null;
    try {
      vid = localStorage.getItem(VISITOR_ID_KEY);
      if (!vid) {
        vid = 'v_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem(VISITOR_ID_KEY, vid);
        return { id: vid, isNew: true };
      }
      return { id: vid, isNew: false };
    } catch (e) {
      return { id: 'v_guest_' + Date.now().toString(36), isNew: false };
    }
  }

  /**
   * Reads raw stored analytics data from localStorage
   */
  function getRawStats() {
    try {
      var data = localStorage.getItem(STATS_KEY);
      if (data) {
        var parsed = JSON.parse(data);
        return Object.assign({}, DEFAULT_STATS, parsed);
      }
    } catch (e) {
      console.warn('Could not read raw analytics stats:', e);
    }
    return Object.assign({}, DEFAULT_STATS);
  }

  /**
   * Saves analytics state to localStorage and broadcasts update event
   */
  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {}

    if (channel) {
      try {
        channel.postMessage({ type: 'ANALYTICS_UPDATED', payload: getStats() });
      } catch (e) {}
    }
  }

  /**
   * Realtime Active Presence Calculation:
   * Prunes sessions with heartbeat older than 8 seconds, and computes:
   * • activeTabs: Total open, active tabs
   * • activeNow: Distinct unique visitors across active tabs
   */
  function getActivePresence(optSessions) {
    var now = Date.now();
    var sessions = optSessions;
    if (!sessions) {
      try {
        var raw = localStorage.getItem(ACTIVE_SESSIONS_KEY);
        if (raw) sessions = JSON.parse(raw);
        else sessions = {};
      } catch (e) {
        sessions = {};
      }
    }

    var activeTabsCount = 0;
    var uniqueActiveVisitors = {};

    for (var sid in sessions) {
      if (sessions.hasOwnProperty(sid)) {
        var s = sessions[sid];
        // Active window threshold: 8000ms
        if (s && s.lastSeen && (now - s.lastSeen < 8000)) {
          activeTabsCount++;
          if (s.visitorId) {
            uniqueActiveVisitors[s.visitorId] = true;
          }
        }
      }
    }

    return {
      activeTabs: activeTabsCount,
      activeNow: Object.keys(uniqueActiveVisitors).length,
      activeVisitorIds: Object.keys(uniqueActiveVisitors)
    };
  }

  /**
   * Sends heartbeat from the current tab to keep Active Now and Active Tabs up to date.
   */
  function sendPresenceHeartbeat() {
    var now = Date.now();
    var visitor = getOrCreateVisitorId();
    var sessions = {};

    try {
      var raw = localStorage.getItem(ACTIVE_SESSIONS_KEY);
      if (raw) sessions = JSON.parse(raw);
    } catch (e) {}

    // Prune stale sessions (> 8000ms)
    var cleaned = {};
    for (var sid in sessions) {
      if (sessions.hasOwnProperty(sid)) {
        if (now - sessions[sid].lastSeen < 8000) {
          cleaned[sid] = sessions[sid];
        }
      }
    }

    // Register/update current tab
    cleaned[TAB_ID] = {
      visitorId: visitor.id,
      lastSeen: now,
      device: detectDevice(),
      title: document.title || 'Knock Invitation'
    };

    try {
      localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(cleaned));
    } catch (e) {}

    var presence = getActivePresence(cleaned);
    if (channel) {
      try {
        channel.postMessage({ type: 'PRESENCE_UPDATED', payload: presence });
      } catch (e) {}
    }
  }

  /**
   * Unregisters tab on close/unload to immediately drop Active Tabs and Active Now.
   */
  function removePresence() {
    try {
      var raw = localStorage.getItem(ACTIVE_SESSIONS_KEY);
      if (raw) {
        var sessions = JSON.parse(raw);
        delete sessions[TAB_ID];
        localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(sessions));
      }
    } catch (e) {}

    if (channel) {
      try {
        channel.postMessage({ type: 'PRESENCE_REMOVED', tabId: TAB_ID });
      } catch (e) {}
    }
  }

  /**
   * Records a page view strictly following the unique visitor rules:
   * • Increment Today's Unique Visitors ONLY if this device has not visited today
   * • Refreshes / multiple tabs / reopens on the same day do NOT increment daily unique visitors
   * • Increments Today's Device Count ONLY on new daily visit
   * • Network / IP changes retain the same visitor ID
   */
  function recordPageView() {
    var stats = getRawStats();
    var visitor = getOrCreateVisitorId();
    var device = detectDevice();
    var platform = detectPlatform();
    var todayKey = getTodayDateKey();

    if (!stats.dailyStats) stats.dailyStats = {};
    if (!stats.dailyStats[todayKey]) {
      stats.dailyStats[todayKey] = {
        date: todayKey,
        uniqueVisitors: 0,
        totalViews: 0,
        devices: { mobile: 0, desktop: 0, tablet: 0, tv: 0 },
        visitorIds: {}
      };
    }

    var todayData = stats.dailyStats[todayKey];
    if (!todayData.visitorIds) todayData.visitorIds = {};
    if (!todayData.devices) todayData.devices = { mobile: 0, desktop: 0, tablet: 0, tv: 0 };

    // Increment Total Views (all page hits)
    todayData.totalViews = (todayData.totalViews || 0) + 1;
    stats.totalViews = (stats.totalViews || 0) + 1;

    // Check if this device is NEW for TODAY
    var isNewVisitorToday = !todayData.visitorIds[visitor.id];

    if (isNewVisitorToday) {
      // Register visitor ID for today
      todayData.visitorIds[visitor.id] = true;
      todayData.uniqueVisitors = Object.keys(todayData.visitorIds).length;

      // Increment device counter for today
      todayData.devices[device] = (todayData.devices[device] || 0) + 1;

      // Increment all-time aggregates
      if (!stats.devices) stats.devices = { mobile: 0, desktop: 0, tablet: 0, tv: 0 };
      stats.devices[device] = (stats.devices[device] || 0) + 1;

      if (visitor.isNew) {
        stats.uniqueVisitorsAllTime = (stats.uniqueVisitorsAllTime || 0) + 1;
      }

      if (!stats.platforms) stats.platforms = { android: 0, ios: 0, windows: 0, mac: 0, smart_tv: 0, other: 0 };
      stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;
    }

    // Add to Recent Activity Log (keep last 35)
    var recent = stats.recentVisitors || [];
    recent.unshift({
      id: visitor.id.slice(0, 10),
      fullId: visitor.id,
      time: new Date().toISOString(),
      device: device,
      platform: platform,
      screen: window.innerWidth + 'x' + window.innerHeight
    });
    if (recent.length > 35) {
      recent.length = 35;
    }
    stats.recentVisitors = recent;

    saveStats(stats);
  }

  /**
   * Track user action (Calendar click, Location click, Music toggle)
   */
  function recordAction(actionType) {
    var stats = getRawStats();
    if (actionType === 'calendar') {
      stats.calendarClicks = (stats.calendarClicks || 0) + 1;
    } else if (actionType === 'location') {
      stats.locationClicks = (stats.locationClicks || 0) + 1;
    } else if (actionType === 'audio') {
      stats.audioPlays = (stats.audioPlays || 0) + 1;
    }
    saveStats(stats);
  }

  /**
   * Formatted stats reader for Admin Dashboard
   */
  function getStats() {
    var raw = getRawStats();
    var todayKey = getTodayDateKey();
    var todayData = (raw.dailyStats && raw.dailyStats[todayKey]) ? raw.dailyStats[todayKey] : {
      date: todayKey,
      uniqueVisitors: 0,
      totalViews: 0,
      devices: { mobile: 0, desktop: 0, tablet: 0, tv: 0 },
      visitorIds: {}
    };

    var presence = getActivePresence();

    return {
      today: {
        date: todayKey,
        uniqueVisitors: todayData.uniqueVisitors || 0,
        totalViews: todayData.totalViews || 0,
        devices: todayData.devices || { mobile: 0, desktop: 0, tablet: 0, tv: 0 }
      },
      activeNow: presence.activeNow,
      activeTabs: presence.activeTabs,
      totalViews: raw.totalViews || 0,
      uniqueVisitorsAllTime: raw.uniqueVisitorsAllTime || todayData.uniqueVisitors || 0,
      calendarClicks: raw.calendarClicks || 0,
      locationClicks: raw.locationClicks || 0,
      audioPlays: raw.audioPlays || 0,
      devices: raw.devices || { mobile: 0, desktop: 0, tablet: 0, tv: 0 },
      platforms: raw.platforms || { android: 0, ios: 0, windows: 0, mac: 0, smart_tv: 0, other: 0 },
      dailyStats: raw.dailyStats || {},
      recentVisitors: raw.recentVisitors || []
    };
  }

  /**
   * Returns list of daily history records, sorted newest to oldest
   */
  function getDailyHistory() {
    var raw = getRawStats();
    var map = raw.dailyStats || {};
    var list = [];

    for (var dateKey in map) {
      if (map.hasOwnProperty(dateKey)) {
        var day = map[dateKey];
        list.push({
          date: dateKey,
          uniqueVisitors: day.uniqueVisitors || 0,
          totalViews: day.totalViews || 0,
          devices: day.devices || { mobile: 0, desktop: 0, tablet: 0, tv: 0 }
        });
      }
    }

    // Sort newest date first
    list.sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    return list;
  }

  /**
   * Reset all analytics data back to zero
   */
  function clearStats() {
    var reset = Object.assign({}, DEFAULT_STATS, {
      devices: { mobile: 0, desktop: 0, tablet: 0, tv: 0 },
      platforms: { android: 0, ios: 0, windows: 0, mac: 0, smart_tv: 0, other: 0 },
      dailyStats: {},
      recentVisitors: []
    });
    saveStats(reset);
    try {
      localStorage.removeItem(ACTIVE_SESSIONS_KEY);
    } catch (e) {}
    return getStats();
  }

  // Setup heartbeat and event listeners
  function initAutoTrack() {
    var path = (window.location && window.location.pathname) ? window.location.pathname : '';
    var isAdmin = path.toLowerCase().indexOf('admin') !== -1 ||
                  document.getElementById('login-view') !== null;

    // Skip tracking for admin portal — keeps guest stats pure
    if (isAdmin) {
      return;
    }

    // Record visit
    recordPageView();

    // Start presence heartbeat (every 3 seconds)
    sendPresenceHeartbeat();
    setInterval(sendPresenceHeartbeat, 3000);

    // Remove presence on unload
    window.addEventListener('beforeunload', removePresence);
    window.addEventListener('pagehide', removePresence);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        // Tab hidden or switched, keep alive or refresh heartbeat
        sendPresenceHeartbeat();
      } else {
        sendPresenceHeartbeat();
      }
    });

    // Action tracking listeners
    document.addEventListener('click', function (e) {
      var target = e.target;
      if (!target) return;

      // Calendar buttons
      if (target.closest('#add-to-calendar-btn') || target.closest('.calendar-option')) {
        recordAction('calendar');
      }
      // Location buttons
      if (target.closest('.fab-location') || target.closest('#get-directions-btn') || target.closest('.directions-btn') || target.closest('a[href*="maps"]')) {
        recordAction('location');
      }
      // Audio / Music button
      if (target.closest('#audio-btn')) {
        recordAction('audio');
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoTrack);
  } else {
    initAutoTrack();
  }

  // Global Export
  window.KnockAnalytics = {
    getStats: getStats,
    getActivePresence: getActivePresence,
    getDailyHistory: getDailyHistory,
    recordAction: recordAction,
    clearStats: clearStats,
    getTodayDateKey: getTodayDateKey,
    detectDevice: detectDevice,
    detectPlatform: detectPlatform
  };

})(window);
