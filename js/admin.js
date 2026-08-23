/**
 * admin.js — Knock Portal Controller & Dashboard Logic
 * ─────────────────────────────────────────────────────────────
 * Powers authentication, live analytics, timer toggle, and
 * real-time card customization with instant preview & sync.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var SESSION_KEY = 'knock_admin_logged_in_v1';
  var dashTimerInterval = null;

  // DOM Elements
  var loginView = document.getElementById('login-view');
  var dashboardView = document.getElementById('dashboard-view');
  var loginForm = document.getElementById('login-form');
  var loginNameInput = document.getElementById('login-name');
  var loginPassInput = document.getElementById('login-pass');
  var loginCard = document.getElementById('login-card');
  var loginError = document.getElementById('login-error');
  var togglePassBtn = document.getElementById('toggle-pass-btn');
  var logoutBtn = document.getElementById('logout-btn');
  var toast = document.getElementById('toast');
  var toastMsg = document.getElementById('toast-msg');

  /* ══════════════════════════════════════════════
     1 · AUTHENTICATION
  ═══════════════════════════════════════════════ */
  function isAuthenticated() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  function setAuthenticated(val) {
    try {
      if (val) sessionStorage.setItem(SESSION_KEY, 'true');
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { }
  }

  function showDashboard() {
    loginView.style.display = 'none';
    dashboardView.style.display = 'flex';
    initDashboard();
  }

  function showLogin() {
    loginView.style.display = 'flex';
    dashboardView.style.display = 'none';
    if (dashTimerInterval) clearInterval(dashTimerInterval);
  }

  function handleLogin(e) {
    e.preventDefault();
    var name = (loginNameInput.value || '').trim();
    var pass = (loginPassInput.value || '').trim();
    var config = window.KnockConfig ? window.KnockConfig.get() : { adminName: 'Admin', adminPass: '3251' };

    var expectedName = (config.adminName || 'Admin').toLowerCase();
    var expectedPass = config.adminPass || '**vanukuri2026**';

    if (name.toLowerCase() === expectedName && pass === expectedPass) {
      loginError.style.display = 'none';
      setAuthenticated(true);
      showDashboard();
      showToast('Welcome back, ' + name + '!', '🪔');
    } else {
      loginError.style.display = 'block';
      loginCard.classList.remove('login-shake');
      void loginCard.offsetWidth; // trigger reflow
      loginCard.classList.add('login-shake');
    }
  }

  function handleLogout() {
    setAuthenticated(false);
    showLogin();
    showToast('Logged out safely.', '👋');
  }

  if (togglePassBtn) {
    togglePassBtn.addEventListener('click', function () {
      var isPass = loginPassInput.type === 'password';
      loginPassInput.type = isPass ? 'text' : 'password';
      togglePassBtn.textContent = isPass ? '🔒' : '👁️';
    });
  }

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  /* ══════════════════════════════════════════════
     2 · TAB NAVIGATION
  ═══════════════════════════════════════════════ */
  var tabButtons = document.querySelectorAll('.tab-btn');
  var tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-tab');

      tabButtons.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(function (p) {
        p.classList.remove('active');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      var targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  /* ══════════════════════════════════════════════
     3 · VISITOR ANALYTICS DASHBOARD
  ═══════════════════════════════════════════════ */
  function formatRelativeTime(isoStr) {
    try {
      var date = new Date(isoStr);
      var diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return Math.floor(diff / 86400) + 'd ago';
    } catch (e) {
      return 'Recently';
    }
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return 'Today';
    try {
      var parts = dateStr.split('-');
      if (parts.length === 3) {
        var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  function renderDailyHistoryTable() {
    // Owned by firebase-sync.js — reads from Firebase, not localStorage
  }

  function renderRecentVisitorsTable(stats) {
    // Owned by firebase-sync.js — reads from Firebase, not localStorage
  }

  function renderAnalytics() {
    // Analytics rendering is now fully handled by firebase-sync.js
    // which uses real-time Firebase data across all devices.
    // This function is kept as a no-op to avoid breaking button bindings.
    var dateBadgeText = document.getElementById('today-date-text');
    if (dateBadgeText && window.KnockAnalytics) {
      var todayKey = window.KnockAnalytics.getTodayDateKey();
      var parts = todayKey.split('-');
      var d = new Date(+parts[0], +parts[1]-1, +parts[2]);
      dateBadgeText.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · IST';
    }
  }

  var refreshStatsBtn = document.getElementById('refresh-stats-btn');
  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', function () {
      // Trigger fresh Firebase reads via KnockSync
      if (window.KnockSync && window.KnockSync.refreshAnalytics) {
        window.KnockSync.refreshAnalytics();
      }
      renderAnalytics(); // updates date badge
      showToast('Analytics refreshed!', '🔄');
    });
  }

  var clearStatsBtn = document.getElementById('clear-stats-btn');
  if (clearStatsBtn) {
    clearStatsBtn.addEventListener('click', function () {
      if (confirm('Are you sure you want to reset all analytics? This clears Firebase data too.')) {
        // Clear localStorage
        if (window.KnockAnalytics) window.KnockAnalytics.clearStats();
        // Clear Firebase
        if (window.KnockSync && window.KnockSync.clearAnalytics) {
          window.KnockSync.clearAnalytics();
        }
        showToast('Analytics data cleared.', '🗑️');
      }
    });
  }

  /* ══════════════════════════════════════════════
     4 · TIMER CONTROLS & DASHBOARD CLOCK
  ═══════════════════════════════════════════════ */
  var timerToggleCheckbox = document.getElementById('timer-toggle-checkbox');
  var timerHeadingInput = document.getElementById('timer-heading-input');
  var timerTargetInput = document.getElementById('timer-target-input');
  var saveTimerBtn = document.getElementById('save-timer-btn');
  var timerStatusBadge = document.getElementById('timer-status-badge');

  function initTimerControls() {
    var config = window.KnockConfig ? window.KnockConfig.get() : {};
    if (timerToggleCheckbox) {
      timerToggleCheckbox.checked = config.timerActive !== false;
      updateTimerBadge(timerToggleCheckbox.checked);
    }
    if (timerHeadingInput) timerHeadingInput.value = config.timerHeading || 'Auspicious Muhurtham In';

    // Format targetIso to datetime-local format YYYY-MM-DDTHH:MM
    if (timerTargetInput && config.targetIso) {
      try {
        var d = new Date(config.targetIso);
        var year = d.getFullYear();
        var month = ('0' + (d.getMonth() + 1)).slice(-2);
        var day = ('0' + d.getDate()).slice(-2);
        var hours = ('0' + d.getHours()).slice(-2);
        var mins = ('0' + d.getMinutes()).slice(-2);
        timerTargetInput.value = year + '-' + month + '-' + day + 'T' + hours + ':' + mins;
      } catch (e) { }
    }

    startDashboardClock();
  }

  function updateTimerBadge(isActive) {
    if (!timerStatusBadge) return;
    if (isActive) {
      timerStatusBadge.textContent = 'ACTIVE ON SITE';
      timerStatusBadge.style.background = 'rgba(74, 222, 128, 0.15)';
      timerStatusBadge.style.color = 'var(--color-success)';
    } else {
      timerStatusBadge.textContent = 'HIDDEN FROM SITE';
      timerStatusBadge.style.background = 'rgba(248, 113, 113, 0.15)';
      timerStatusBadge.style.color = 'var(--color-danger)';
    }
  }

  if (timerToggleCheckbox) {
    timerToggleCheckbox.addEventListener('change', function () {
      updateTimerBadge(timerToggleCheckbox.checked);
      if (window.KnockConfig) {
        window.KnockConfig.save({ timerActive: timerToggleCheckbox.checked });
      }
      showToast(timerToggleCheckbox.checked ? 'Countdown Timer is now ACTIVE on invitation!' : 'Countdown Timer is now HIDDEN from invitation.', '⏱️');
    });
  }

  function startDashboardClock() {
    if (dashTimerInterval) clearInterval(dashTimerInterval);

    function tickDash() {
      var config = window.KnockConfig ? window.KnockConfig.get() : {};
      var targetIso = config.targetIso || '2026-08-31T03:00:00+05:30';
      var targetTime = new Date(targetIso).getTime();
      var diff = Math.max(0, targetTime - Date.now());

      var days = Math.floor(diff / (1000 * 60 * 60 * 24));
      var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      var minutes = Math.floor((diff / (1000 * 60)) % 60);
      var seconds = Math.floor((diff / 1000) % 60);

      var dEl = document.getElementById('dash-days');
      var hEl = document.getElementById('dash-hours');
      var mEl = document.getElementById('dash-mins');
      var sEl = document.getElementById('dash-secs');
      var hHead = document.getElementById('dash-timer-heading');

      if (dEl) dEl.textContent = (days < 10 ? '0' : '') + days;
      if (hEl) hEl.textContent = (hours < 10 ? '0' : '') + hours;
      if (mEl) mEl.textContent = (minutes < 10 ? '0' : '') + minutes;
      if (sEl) sEl.textContent = (seconds < 10 ? '0' : '') + seconds;
      if (hHead) hHead.textContent = config.timerHeading || 'Auspicious Muhurtham In';
    }

    tickDash();
    dashTimerInterval = setInterval(tickDash, 1000);
  }

  if (saveTimerBtn) {
    saveTimerBtn.addEventListener('click', function () {
      var heading = timerHeadingInput.value.trim() || 'Auspicious Muhurtham In';
      var dtVal = timerTargetInput.value;
      var newIso = '2026-08-31T03:00:00+05:30';

      if (dtVal) {
        // Construct ISO with +05:30 (IST)
        newIso = dtVal + ':00+05:30';
      }

      if (window.KnockConfig) {
        window.KnockConfig.save({
          timerHeading: heading,
          targetIso: newIso,
          timerActive: timerToggleCheckbox.checked
        });
      }

      var displayTarget = document.getElementById('current-target-display');
      if (displayTarget) {
        displayTarget.textContent = new Date(newIso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST';
      }

      showToast('Timer settings saved successfully!', '⏱️');
    });
  }

  /* ══════════════════════════════════════════════
     5 · CARD CUSTOMIZER & LIVE PREVIEW
  ═══════════════════════════════════════════════ */
  var cfgCeremony = document.getElementById('cfg-ceremony');
  var cfgFamily = document.getElementById('cfg-family');
  var cfgDateDay = document.getElementById('cfg-date-day');
  var cfgDateSub = document.getElementById('cfg-date-sub');
  var cfgTime = document.getElementById('cfg-time');
  var cfgTimeSub = document.getElementById('cfg-time-sub');
  var cfgVenue = document.getElementById('cfg-venue');
  var cfgMapLink = document.getElementById('cfg-map-link');
  var cfgMapEmbed = document.getElementById('cfg-map-embed');
  var cfgNote = document.getElementById('cfg-note');
  var saveCardBtn = document.getElementById('save-card-btn');
  var resetCardBtn = document.getElementById('reset-card-btn');

  // Preview elements
  var prevTitle = document.getElementById('prev-title');
  var prevFamily = document.getElementById('prev-family');
  var prevDate = document.getElementById('prev-date');
  var prevTime = document.getElementById('prev-time');
  var prevNote = document.getElementById('prev-note');

  function initCardForm() {
    var config = window.KnockConfig ? window.KnockConfig.get() : {};
    if (cfgCeremony) cfgCeremony.value = config.ceremonyName || 'Housewarming Ceremony';
    if (cfgFamily) cfgFamily.value = config.familyName || 'Vanukuri Veena Damodar Reddy Family';
    if (cfgDateDay) cfgDateDay.value = config.dateDisplay || '31 August 2026';
    if (cfgDateSub) cfgDateSub.value = config.dateYearSub || '2026 · Monday';
    if (cfgTime) cfgTime.value = config.timeDisplay || '3:00 AM';
    if (cfgTimeSub) cfgTimeSub.value = config.timeSub || 'Monday Early Morning';
    if (cfgVenue) cfgVenue.value = config.venueAddress || 'FJR7+842, East Gandhi Nagar, Aravind Nagar, Nagaram, Secunderabad, Telangana 500083';
    if (cfgMapLink) cfgMapLink.value = config.mapDirectionsUrl || 'https://www.google.com/maps/place/17.4908348,78.6127061/@17.4908348,78.6127061,18z';
    if (cfgMapEmbed) cfgMapEmbed.value = config.mapEmbedUrl || '';
    if (cfgNote) cfgNote.value = config.invitationNote || 'We cordially invite you and your family to grace the auspicious occasion of our Housewarming Ceremony and bless our new home with your presence and warm wishes.';

    updateLivePreview();
  }

  function updateLivePreview() {
    if (prevTitle && cfgCeremony) prevTitle.innerHTML = (cfgCeremony.value || 'Housewarming Ceremony').replace(' ', '<br/>');
    if (prevFamily && cfgFamily) prevFamily.textContent = cfgFamily.value || 'Vanukuri Family';
    if (prevDate && cfgDateDay) prevDate.textContent = cfgDateDay.value || '31 August 2026';
    if (prevTime && cfgTime) prevTime.textContent = cfgTime.value || '3:00 AM';
    if (prevNote && cfgNote) prevNote.textContent = cfgNote.value || '';
  }

  // Bind live typing to preview
  [cfgCeremony, cfgFamily, cfgDateDay, cfgDateSub, cfgTime, cfgTimeSub, cfgVenue, cfgMapLink, cfgMapEmbed, cfgNote].forEach(function (inp) {
    if (inp) {
      inp.addEventListener('input', updateLivePreview);
    }
  });

  if (saveCardBtn) {
    saveCardBtn.addEventListener('click', function () {
      if (!window.KnockConfig) return;

      var updated = {
        ceremonyName: cfgCeremony.value.trim(),
        familyName: cfgFamily.value.trim(),
        familyShort: cfgFamily.value.trim(),
        dateDisplay: cfgDateDay.value.trim(),
        dateDay: cfgDateDay.value.trim(),
        dateYearSub: cfgDateSub.value.trim(),
        timeDisplay: cfgTime.value.trim(),
        timeSub: cfgTimeSub.value.trim(),
        venueAddress: cfgVenue.value.trim(),
        mapDirectionsUrl: cfgMapLink ? cfgMapLink.value.trim() : '',
        mapEmbedUrl: cfgMapEmbed ? cfgMapEmbed.value.trim() : '',
        invitationNote: cfgNote.value.trim()
      };

      window.KnockConfig.save(updated);
      showToast('✨ Invitation Card changes published live!', '💌');
    });
  }

  if (resetCardBtn) {
    resetCardBtn.addEventListener('click', function () {
      if (confirm('Reset card details back to the original Vanukuri Family defaults?')) {
        if (window.KnockConfig) window.KnockConfig.reset();
        initCardForm();
        showToast('Reset back to original defaults.', '🔄');
      }
    });
  }

  /* ══════════════════════════════════════════════
     6 · EVENT PHOTOS — Google Photos Album Link
  ═══════════════════════════════════════════════ */
  var galleryToggleCheckbox = document.getElementById('gallery-toggle-checkbox');
  var galleryStatusBadge    = document.getElementById('gallery-status-badge');
  var galleryHeadingInput   = document.getElementById('gallery-heading-input');
  var galleryAlbumUrlInput  = document.getElementById('gallery-album-url');
  var saveGalleryBtn        = document.getElementById('save-gallery-btn');
  var galleryPreviewHeading = document.getElementById('gallery-preview-heading');
  var galleryUrlPreview     = document.getElementById('gallery-url-preview');

  function updateGalleryBadge(isActive) {
    if (!galleryStatusBadge) return;
    if (isActive) {
      galleryStatusBadge.textContent = 'ACTIVE ON SITE';
      galleryStatusBadge.style.background = 'rgba(74, 222, 128, 0.15)';
      galleryStatusBadge.style.color = 'var(--color-success)';
    } else {
      galleryStatusBadge.textContent = 'HIDDEN FROM SITE';
      galleryStatusBadge.style.background = 'rgba(248, 113, 113, 0.15)';
      galleryStatusBadge.style.color = 'var(--color-danger)';
    }
  }

  function initGalleryControls() {
    var config = window.KnockConfig ? window.KnockConfig.get() : {};

    if (galleryToggleCheckbox) {
      galleryToggleCheckbox.checked = config.galleryActive === true;
      updateGalleryBadge(galleryToggleCheckbox.checked);
      galleryToggleCheckbox.addEventListener('change', function () {
        updateGalleryBadge(galleryToggleCheckbox.checked);
        if (window.KnockConfig) {
          window.KnockConfig.save({ galleryActive: galleryToggleCheckbox.checked });
        }
        showToast(galleryToggleCheckbox.checked
          ? 'Event Photos now ACTIVE on invitation!'
          : 'Event Photos now HIDDEN from invitation.', '📸');
      });
    }

    if (galleryHeadingInput) {
      galleryHeadingInput.value = config.galleryHeading || 'Event Moments & Photos';
      galleryHeadingInput.addEventListener('input', function () {
        if (galleryPreviewHeading) galleryPreviewHeading.textContent = galleryHeadingInput.value || 'Event Moments & Photos';
      });
    }

    if (galleryAlbumUrlInput) {
      galleryAlbumUrlInput.value = config.galleryAlbumUrl || '';
      if (galleryUrlPreview) {
        galleryUrlPreview.textContent = config.galleryAlbumUrl || 'No album URL set yet';
      }
      galleryAlbumUrlInput.addEventListener('input', function () {
        if (galleryUrlPreview) {
          galleryUrlPreview.textContent = galleryAlbumUrlInput.value || 'No album URL set yet';
        }
      });
    }

    if (galleryPreviewHeading) {
      galleryPreviewHeading.textContent = config.galleryHeading || 'Event Moments & Photos';
    }

    if (saveGalleryBtn) {
      saveGalleryBtn.addEventListener('click', function () {
        var heading = (galleryHeadingInput ? galleryHeadingInput.value.trim() : '') || 'Event Moments & Photos';
        var albumUrl = galleryAlbumUrlInput ? galleryAlbumUrlInput.value.trim() : '';
        if (window.KnockConfig) {
          window.KnockConfig.save({
            galleryHeading:  heading,
            galleryAlbumUrl: albumUrl,
            galleryActive:   galleryToggleCheckbox ? galleryToggleCheckbox.checked : false
          });
        }
        showToast('Event Photos settings saved & published!', '📸');
      });
    }
  }

  /* ══════════════════════════════════════════════
     7 · SECURITY & PASSWORD MANAGEMENT
  ═══════════════════════════════════════════════ */
  var secName = document.getElementById('sec-name');
  var secNewPass = document.getElementById('sec-new-pass');
  var saveSecBtn = document.getElementById('save-sec-btn');

  if (saveSecBtn) {
    saveSecBtn.addEventListener('click', function () {
      var newName = (secName.value || 'Admin').trim();
      var newPass = (secNewPass.value || '').trim();

      if (!newPass) {
        alert('Please enter a new password.');
        return;
      }

      if (window.KnockConfig) {
        window.KnockConfig.save({
          adminName: newName,
          adminPass: newPass
        });
      }

      secNewPass.value = '';
      showToast('Master credentials updated successfully!', '🔐');
    });
  }

  /* ══════════════════════════════════════════════
     8 · TOAST HELPER
  ═══════════════════════════════════════════════ */
  var toastTimeout = null;
  function showToast(msg, icon) {
    if (!toast) return;
    if (toastTimeout) clearTimeout(toastTimeout);

    document.getElementById('toast-msg').textContent = msg;
    document.getElementById('toast-icon').textContent = icon || '✨';

    toast.classList.add('show');
    toastTimeout = setTimeout(function () {
      toast.classList.remove('show');
    }, 3200);
  }

  /* ══════════════════════════════════════════════
     9 · REALTIME BROADCAST & POLLING SYNC
     NOTE: Analytics rendering now owned by firebase-sync.js
     BroadcastChannel only used for config/card/timer/gallery sync
  ═══════════════════════════════════════════════ */
  var presenceInterval = null;

  try {
    if ('BroadcastChannel' in window) {
      var channel = new BroadcastChannel('knock_invitation_channel');
      channel.onmessage = function (e) {
        if (e.data) {
          // Analytics events — skip, firebase-sync.js handles these
          if (e.data.type === 'ANALYTICS_UPDATED' ||
              e.data.type === 'PRESENCE_UPDATED' ||
              e.data.type === 'PRESENCE_HEARTBEAT' ||
              e.data.type === 'PRESENCE_REMOVED') {
            return; // do nothing — firebase-sync.js owns analytics UI
          }
          // Config events — still handled here
          if (e.data.type === 'CONFIG_UPDATED') {
            initCardForm();
            initTimerControls();
            initGalleryControls();
          }
        }
      };
    }
  } catch (e) { }

  function initDashboard() {
    // renderAnalytics is now a no-op — firebase-sync.js owns all analytics
    // Just init the date badge once
    renderAnalytics();
    initTimerControls();
    initCardForm();
    initGalleryControls();
    // NOTE: No polling interval — firebase-sync.js handles all live updates
  }

  function init() {
    if (isAuthenticated()) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
