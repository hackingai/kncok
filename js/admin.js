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
    var tbody = document.getElementById('daily-history-tbody');
    if (!tbody || !window.KnockAnalytics) return;

    var history = window.KnockAnalytics.getDailyHistory();
    var todayKey = window.KnockAnalytics.getTodayDateKey();

    if (!history || history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-dim); padding: 18px;">No daily visitor history recorded yet.</td></tr>';
      return;
    }

    var html = '';
    history.forEach(function (item) {
      var isToday = item.date === todayKey;
      var dateLabel = formatDisplayDate(item.date);
      var todayBadge = isToday ? '<span class="badge-pill badge-pill--today" style="margin-left:8px;">Today</span>' : '';

      var devs = item.devices || { mobile: 0, desktop: 0, tablet: 0, tv: 0 };
      var devBreakdown = [];
      if (devs.mobile) devBreakdown.push('📱 ' + devs.mobile);
      if (devs.desktop) devBreakdown.push('💻 ' + devs.desktop);
      if (devs.tablet) devBreakdown.push('📟 ' + devs.tablet);
      if (devs.tv) devBreakdown.push('📺 ' + devs.tv);
      var devStr = devBreakdown.length > 0 ? devBreakdown.join(' · ') : '<span style="color:var(--text-dim); font-size:0.75rem;">—</span>';

      html += '<tr' + (isToday ? ' class="row-today-highlight"' : '') + '>' +
        '<td><strong>' + dateLabel + '</strong>' + todayBadge + '</td>' +
        '<td><span class="visitor-count-highlight">' + (item.uniqueVisitors || 0) + '</span></td>' +
        '<td>' + (item.totalViews || 0) + '</td>' +
        '<td>' + devStr + '</td>' +
        '</tr>';
    });

    tbody.innerHTML = html;
  }

  function renderRecentVisitorsTable(stats) {
    var tbody = document.getElementById('visitor-log-tbody');
    if (!tbody) return;

    var visitors = stats.recentVisitors || [];
    var presence = window.KnockAnalytics ? window.KnockAnalytics.getActivePresence() : { activeVisitorIds: [] };
    var activeIds = presence.activeVisitorIds || [];

    if (visitors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-dim); padding: 20px;">No guest visits recorded yet. Open the invitation link in another tab/window to test!</td></tr>';
      return;
    }

    var rowsHtml = '';
    visitors.forEach(function (v) {
      var devIcon = '💻 Desktop';
      if (v.device === 'tv') devIcon = '📺 Smart TV';
      else if (v.device === 'tablet') devIcon = '📟 Tablet';
      else if (v.device === 'mobile') devIcon = '📱 Mobile';

      var platBadge = '🪟 ' + (v.platform || 'Other');
      if (v.platform === 'android') platBadge = '🤖 Android';
      else if (v.platform === 'ios') platBadge = '🍏 iOS';
      else if (v.platform === 'smart_tv') platBadge = '📺 Smart TV OS';

      var isActive = v.fullId && activeIds.indexOf(v.fullId) !== -1;
      var statusBadge = isActive
        ? '<span class="status-live-pill">🟢 Active Now</span>'
        : '<span class="status-past-pill">⚪ Past</span>';

      rowsHtml += '<tr>' +
        '<td><code>' + (v.id || 'Guest') + '</code></td>' +
        '<td><span class="visitor-badge">' + devIcon + '</span></td>' +
        '<td>' + platBadge + '</td>' +
        '<td>' + (v.screen || 'Auto') + '</td>' +
        '<td>' + formatRelativeTime(v.time) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '</tr>';
    });

    tbody.innerHTML = rowsHtml;
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
      renderAnalytics();
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
     6 · EVENT PHOTOS & VIDEOS GALLERY CONTROLLER
  ═══════════════════════════════════════════════ */
  var GALLERY_STORAGE_KEY = 'knock_gallery_media_v1';
  var galleryToggleCheckbox = document.getElementById('gallery-toggle-checkbox');
  var galleryStatusBadge = document.getElementById('gallery-status-badge');
  var galleryHeadingInput = document.getElementById('gallery-heading-input');
  var saveGalleryHeadingBtn = document.getElementById('save-gallery-heading-btn');
  var uploadDropzone = document.getElementById('upload-dropzone');
  var mediaFileInput = document.getElementById('media-file-input');
  var browseFilesBtn = document.getElementById('browse-files-btn');
  var mediaUrlInput = document.getElementById('media-url-input');
  var addUrlBtn = document.getElementById('add-url-btn');
  var mediaCountBadge = document.getElementById('media-count-badge');
  var clearGalleryBtn = document.getElementById('clear-gallery-btn');
  var mediaGalleryGrid = document.getElementById('media-gallery-grid');

  function getGalleryItems() {
    try {
      var raw = localStorage.getItem(GALLERY_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { }
    var config = window.KnockConfig ? window.KnockConfig.get() : {};
    return config.galleryItems || [];
  }

  function saveGalleryItems(items) {
    try {
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save gallery items to localStorage:', e);
    }
    if (window.KnockConfig) {
      window.KnockConfig.save({ galleryItems: items });
    }
    renderGalleryGrid();
  }

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

  function compressImageFile(file, maxWidth, maxHeight, quality, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var width = img.width;
        var height = img.height;
        var maxW = maxWidth || 1280;
        var maxH = maxHeight || 1280;

        if (width > maxW || height > maxH) {
          if (width / height > maxW / maxH) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        var dataUrl = canvas.toDataURL('image/jpeg', quality || 0.82);
        callback(null, dataUrl);
      };
      img.onerror = function () {
        callback(null, e.target.result);
      };
      img.src = e.target.result;
    };
    reader.onerror = function (err) {
      callback(err);
    };
    reader.readAsDataURL(file);
  }

  function resolveMediaNames(items) {
    if (!items || items.length === 0) return [];

    var unNamedCount = 0;
    items.forEach(function (item) {
      if (!item.customName || !item.customName.trim()) {
        unNamedCount++;
      }
    });

    var padLength = (unNamedCount > 1000 || items.length > 1000) ? 5 : 4;
    var autoCounter = 1;

    return items.map(function (item) {
      if (item.customName && item.customName.trim()) {
        return {
          item: item,
          name: item.customName.trim(),
          isCustom: true
        };
      } else {
        var numStr = String(autoCounter);
        while (numStr.length < padLength) {
          numStr = '0' + numStr;
        }
        autoCounter++;
        return {
          item: item,
          name: 'vvdh-' + numStr,
          isCustom: false
        };
      }
    });
  }

  function renderGalleryGrid() {
    if (!mediaGalleryGrid) return;
    var items = getGalleryItems();

    if (mediaCountBadge) {
      mediaCountBadge.textContent = items.length + ' Item' + (items.length === 1 ? '' : 's');
    }

    if (items.length === 0) {
      mediaGalleryGrid.innerHTML = '<div class="media-empty-placeholder">' +
        '<div style="font-size: 2rem; margin-bottom: 6px;">📷</div>' +
        '<p style="font-weight: 500; color: var(--color-gold-light); margin-bottom: 4px;">No photos or videos uploaded yet</p>' +
        '<p style="font-size: 0.78rem;">Upload ceremony photos or videos above to showcase them.</p>' +
        '</div>';
      return;
    }

    var resolvedList = resolveMediaNames(items);
    var html = '';
    resolvedList.forEach(function (res) {
      var item = res.item;
      var isVideo = item.type === 'video';
      var mediaTag = isVideo ? '🎥 Video' : '📷 Photo';
      var displayName = res.isCustom ? res.name : '';
      var placeholderName = res.name;
      var mediaThumb = isVideo
        ? '<video class="media-thumb" src="' + item.src + '" muted playsinline preload="metadata"></video>'
        : '<img class="media-thumb" src="' + item.src + '" alt="Event moment" loading="lazy" />';

      html += '<div class="media-card" data-id="' + item.id + '">' +
        '<div class="media-thumb-wrap">' +
        mediaThumb +
        '<span class="media-type-tag">' + mediaTag + '</span>' +
        '</div>' +
        '<div class="media-card-body">' +
        '<div class="media-name-wrap">' +
        '<input type="text" class="media-name-input" data-id="' + item.id + '" value="' + displayName.replace(/"/g, '&quot;') + '" placeholder="' + placeholderName + '" title="Edit photo name or leave blank for ' + placeholderName + '" />' +
        '</div>' +
        '<div class="media-card-actions">' +
        '<button type="button" class="media-delete-btn" data-id="' + item.id + '" title="Delete">🗑️</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    });

    mediaGalleryGrid.innerHTML = html;

    // Bind rename input listeners
    var nameInputs = mediaGalleryGrid.querySelectorAll('.media-name-input');
    nameInputs.forEach(function (inp) {
      function handleRename() {
        var id = inp.getAttribute('data-id');
        var val = (inp.value || '').trim();
        var currentItems = getGalleryItems();
        var target = currentItems.find(function (it) { return it.id === id; });
        if (target) {
          if (target.customName !== val) {
            target.customName = val;
            saveGalleryItems(currentItems);
            showToast(val ? ('Photo renamed to "' + val + '"') : 'Photo reverted to auto-number.', '🏷️');
          }
        }
      }

      inp.addEventListener('change', handleRename);
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          inp.blur();
        }
      });
    });

    // Bind delete listeners
    var deleteBtns = mediaGalleryGrid.querySelectorAll('.media-delete-btn');
    deleteBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var currentItems = getGalleryItems().filter(function (it) { return it.id !== id; });
        saveGalleryItems(currentItems);
        showToast('Media item deleted.', '🗑️');
      });
    });
  }

  function handleFilesSelected(files) {
    if (!files || files.length === 0) return;
    var currentItems = getGalleryItems();
    var processedCount = 0;
    var totalFiles = files.length;

    Array.prototype.forEach.call(files, function (file) {
      var isVid = file.type && file.type.indexOf('video') !== -1;

      if (isVid) {
        var vidReader = new FileReader();
        vidReader.onload = function (e) {
          currentItems.unshift({
            id: 'm_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36),
            type: 'video',
            src: e.target.result,
            caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            addedAt: new Date().toISOString()
          });
          processedCount++;
          if (processedCount === totalFiles) {
            saveGalleryItems(currentItems);
            showToast(totalFiles + ' media item(s) uploaded successfully!', '📸');
          }
        };
        vidReader.readAsDataURL(file);
      } else {
        compressImageFile(file, 1280, 1280, 0.82, function (err, dataUrl) {
          currentItems.unshift({
            id: 'm_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36),
            type: 'image',
            src: dataUrl || '',
            caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            addedAt: new Date().toISOString()
          });
          processedCount++;
          if (processedCount === totalFiles) {
            saveGalleryItems(currentItems);
            showToast(totalFiles + ' photo(s) uploaded successfully!', '📸');
          }
        });
      }
    });
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
        showToast(galleryToggleCheckbox.checked ? 'Event Photos is now ACTIVE on invitation!' : 'Event Photos is now HIDDEN from invitation.', '📸');
      });
    }

    if (galleryHeadingInput) {
      galleryHeadingInput.value = config.galleryHeading || 'Event Moments & Photos';
    }

    if (saveGalleryHeadingBtn) {
      saveGalleryHeadingBtn.addEventListener('click', function () {
        var heading = (galleryHeadingInput.value || '').trim() || 'Event Moments & Photos';
        if (window.KnockConfig) {
          window.KnockConfig.save({ galleryHeading: heading });
        }
        showToast('Gallery heading saved!', '✨');
      });
    }

    if (browseFilesBtn && mediaFileInput) {
      browseFilesBtn.addEventListener('click', function () {
        mediaFileInput.click();
      });
      mediaFileInput.addEventListener('change', function () {
        handleFilesSelected(mediaFileInput.files);
        mediaFileInput.value = '';
      });
    }

    if (uploadDropzone && mediaFileInput) {
      uploadDropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadDropzone.classList.add('dragover');
      });
      uploadDropzone.addEventListener('dragleave', function () {
        uploadDropzone.classList.remove('dragover');
      });
      uploadDropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadDropzone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files) {
          handleFilesSelected(e.dataTransfer.files);
        }
      });
    }

    if (addUrlBtn && mediaUrlInput) {
      addUrlBtn.addEventListener('click', function () {
        var url = (mediaUrlInput.value || '').trim();
        if (!url) {
          alert('Please enter an image or video URL.');
          return;
        }
        var isVid = /\.(mp4|webm|mov|ogg)($|\?)/i.test(url);
        var currentItems = getGalleryItems();
        currentItems.unshift({
          id: 'm_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36),
          type: isVid ? 'video' : 'image',
          src: url,
          caption: '',
          addedAt: new Date().toISOString()
        });
        saveGalleryItems(currentItems);
        mediaUrlInput.value = '';
        showToast('Media link added successfully!', '🔗');
      });
    }

    if (clearGalleryBtn) {
      clearGalleryBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all uploaded photos and videos?')) {
          saveGalleryItems([]);
          showToast('All event media cleared.', '🗑️');
        }
      });
    }

    renderGalleryGrid();
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
  ═══════════════════════════════════════════════ */
  var presenceInterval = null;

  try {
    if ('BroadcastChannel' in window) {
      var channel = new BroadcastChannel('knock_invitation_channel');
      channel.onmessage = function (e) {
        if (e.data) {
          if (e.data.type === 'ANALYTICS_UPDATED' ||
            e.data.type === 'PRESENCE_UPDATED' ||
            e.data.type === 'PRESENCE_HEARTBEAT' ||
            e.data.type === 'PRESENCE_REMOVED') {
            renderAnalytics();
          } else if (e.data.type === 'CONFIG_UPDATED') {
            initCardForm();
            initTimerControls();
            initGalleryControls();
          }
        }
      };
    }
  } catch (e) { }

  function initDashboard() {
    renderAnalytics();
    initTimerControls();
    initCardForm();
    initGalleryControls();

    // Start live polling interval for active presence / real-time guest tracking
    if (presenceInterval) clearInterval(presenceInterval);
    presenceInterval = setInterval(function () {
      if (isAuthenticated()) {
        renderAnalytics();
      }
    }, 2500);
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
