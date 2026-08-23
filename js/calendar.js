/**
 * calendar.js — 1-Click Direct Online Calendar System
 * ─────────────────────────────────────────────────────────────────
 * Opens Google Calendar, Outlook Web, and Apple Calendar directly
 * in the user's browser/app with 0 file downloads on laptops & phones.
 * ─────────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  /* ════════════════════════════════════════════
     1 · GET DYNAMIC EVENT DATA
  ════════════════════════════════════════════ */
  function getEventData() {
    var config = window.KnockConfig ? window.KnockConfig.get() : {};

    var isTe = (document.documentElement && document.documentElement.lang === 'te');
    var title = isTe
      ? 'వనుకూరు వీణ దామోదర్ రెడ్డి — గృహప్రవేశ మహోత్సవం'
      : (config.title || 'Vanukuri Veena Damodar Reddy Housewarming Ceremony');
    var desc  = isTe
      ? 'వనుకూరు వీణ దామోదర్ రెడ్డి గారి నూతన గృహప్రవేశ మహోత్సవానికి సాదర ఆహ్వానం.'
      : (config.invitationNote || 'You are cordially invited to celebrate the Vanukuri Veena Damodar Reddy Housewarming Ceremony.');
    var loc   = config.venueAddress || 'FJR7+842, East Gandhi Nagar, Aravind Nagar, Nagaram, Secunderabad, Telangana 500083';

    // Dates: Default 31 August 2026, 03:00 AM IST (UTC+5:30)
    // 3:00 AM IST on 31 Aug = 21:30 UTC on 30 Aug
    var startLocal = '2026-08-31T03:00:00';
    var endLocal   = '2026-08-31T06:00:00';
    var startUTC   = '20260830T213000Z';
    var endUTC     = '20260831T003000Z';
    var icsStart   = '20260831T030000';
    var icsEnd     = '20260831T060000';

    if (config.targetIso) {
      try {
        var d = new Date(config.targetIso);
        if (!isNaN(d.getTime())) {
          var pad = function (n) { return (n < 10 ? '0' : '') + n; };
          var endD = new Date(d.getTime() + (3 * 60 * 60 * 1000));

          startLocal = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
          endLocal   = endD.getFullYear() + '-' + pad(endD.getMonth() + 1) + '-' + pad(endD.getDate()) + 'T' + pad(endD.getHours()) + ':' + pad(endD.getMinutes()) + ':00';

          icsStart   = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
          icsEnd     = endD.getFullYear() + pad(endD.getMonth() + 1) + pad(endD.getDate()) + 'T' + pad(endD.getHours()) + pad(endD.getMinutes()) + '00';

          startUTC   = d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
          endUTC     = endD.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
        }
      } catch (e) {}
    }

    return {
      title: title,
      description: desc,
      location: loc,
      startLocal: startLocal,
      endLocal: endLocal,
      startUTC: startUTC,
      endUTC: endUTC,
      icsStart: icsStart,
      icsEnd: icsEnd
    };
  }

  /* ════════════════════════════════════════════
     2 · DEVICE DETECTION
  ════════════════════════════════════════════ */
  function isAppleDevice() {
    var ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /* ════════════════════════════════════════════
     3 · RFC 5545 ICS BUILDER (For iOS Apple Calendar)
  ════════════════════════════════════════════ */
  function buildICS() {
    var event = getEventData();
    var uid = 'vanukuri-housewarming-2026-' + Date.now() + '@invitation';
    var now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

    var cleanSummary = event.title.replace(/[,;\\]/g, ' ');
    var cleanDesc = event.description.replace(/\n/g, '\\n').replace(/[,;\\]/g, ' ');
    var cleanLoc = event.location.replace(/[,;\\]/g, ' ');

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Vanukuri Family//Housewarming Invitation//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + now,
      'DTSTART;TZID=Asia/Kolkata:' + event.icsStart,
      'DTEND;TZID=Asia/Kolkata:' + event.icsEnd,
      'SUMMARY:' + cleanSummary,
      'DESCRIPTION:' + cleanDesc,
      'LOCATION:' + cleanLoc,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    return lines.join('\r\n');
  }

  /* ════════════════════════════════════════════
     4 · DIRECT CALENDAR URL OPENERS
  ════════════════════════════════════════════ */

  // 1. Google Calendar (Direct web view - 0 downloads)
  function openGoogleCalendar() {
    var event = getEventData();
    var params = new URLSearchParams();
    params.append('action', 'TEMPLATE');
    params.append('text', event.title);
    params.append('dates', event.startUTC + '/' + event.endUTC);
    params.append('details', event.description);
    params.append('location', event.location);

    var url = 'https://calendar.google.com/calendar/render?' + params.toString();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // 2. Microsoft Outlook / Office 365 (Direct web view - 0 downloads)
  function openOutlook() {
    var event = getEventData();
    var params = new URLSearchParams();
    params.append('path', '/calendar/action/compose');
    params.append('rru', 'addevent');
    params.append('subject', event.title);
    params.append('startdt', event.startLocal);
    params.append('enddt', event.endLocal);
    params.append('body', event.description);
    params.append('location', event.location);

    var url = 'https://outlook.live.com/calendar/0/action/compose?' + params.toString();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // 3. Apple Calendar (Native app on iPhone/iPad/Mac; iCal event on Windows)
  function openAppleCalendar() {
    var icsContent = buildICS();
    var dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);

    if (isAppleDevice()) {
      // On iPhone / iPad / Mac: Launch native Apple Calendar app directly
      window.location.href = dataUri;
    } else {
      // On PC / Windows: Launch iCal / Apple Calendar event file
      var link = document.createElement('a');
      link.href = dataUri;
      link.setAttribute('download', 'vanukuri-housewarming.ics');
      document.body.appendChild(link);
      link.click();
      setTimeout(function () {
        if (link.parentNode) document.body.removeChild(link);
      }, 300);
    }
  }

  // 4. Yahoo Calendar (Direct web view - 0 downloads)
  function openYahooCalendar() {
    var event = getEventData();
    var params = new URLSearchParams();
    params.append('v', '60');
    params.append('title', event.title);
    params.append('st', event.startUTC);
    params.append('et', event.endUTC);
    params.append('desc', event.description);
    params.append('in_loc', event.location);

    var url = 'https://calendar.yahoo.com/?' + params.toString();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /* ════════════════════════════════════════════
     5 · DROPDOWN CONTROLLER
  ════════════════════════════════════════════ */
  var calBtn      = document.getElementById('add-to-calendar-btn');
  var calDropdown = document.getElementById('calendar-dropdown');
  var calWrapper  = document.querySelector('.calendar-btn-wrapper');

  function openDropdown() {
    if (!calDropdown || !calBtn) return;
    calDropdown.hidden = false;
    calDropdown.style.display = 'block';
    calBtn.setAttribute('aria-expanded', 'true');
    if (calWrapper) calWrapper.classList.add('dropdown-open');

    var firstOption = calDropdown.querySelector('.calendar-option');
    if (firstOption) firstOption.focus();
  }

  function closeDropdown() {
    if (!calDropdown || !calBtn) return;
    calDropdown.hidden = true;
    calDropdown.style.display = 'none';
    calBtn.setAttribute('aria-expanded', 'false');
    if (calWrapper) calWrapper.classList.remove('dropdown-open');
  }

  function toggleDropdown() {
    if (!calDropdown) return;
    if (calDropdown.hidden || calDropdown.style.display === 'none') {
      openDropdown();
    } else {
      closeDropdown();
    }
  }

  /* ════════════════════════════════════════════
     6 · INITIALIZATION
  ════════════════════════════════════════════ */
  function init() {
    calBtn      = document.getElementById('add-to-calendar-btn');
    calDropdown = document.getElementById('calendar-dropdown');
    calWrapper  = document.querySelector('.calendar-btn-wrapper');

    if (!calBtn || !calDropdown) return;

    calDropdown.hidden = true;
    calDropdown.style.display = 'none';

    calBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      toggleDropdown();
    });

    calDropdown.addEventListener('click', function (e) {
      var option = e.target.closest('.calendar-option');
      if (!option) return;

      var type = option.getAttribute('data-calendar');
      if (type === 'google') openGoogleCalendar();
      else if (type === 'apple') openAppleCalendar();
      else if (type === 'outlook') openOutlook();
      else if (type === 'yahoo') openYahooCalendar();

      closeDropdown();
    });

    // Keyboard navigation
    calDropdown.addEventListener('keydown', function (e) {
      var options = Array.from(calDropdown.querySelectorAll('.calendar-option'));
      var idx = options.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        var next = options[idx + 1] || options[0];
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = options[idx - 1] || options[options.length - 1];
        if (prev) prev.focus();
      } else if (e.key === 'Escape' || e.key === 'Tab') {
        closeDropdown();
        calBtn.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (calBtn && !calBtn.contains(e.target) && calDropdown && !calDropdown.contains(e.target)) {
        closeDropdown();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && calDropdown && !calDropdown.hidden) {
        closeDropdown();
        if (calBtn) calBtn.focus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.KnockCalendar = {
    openGoogle: openGoogleCalendar,
    openOutlook: openOutlook,
    openApple: openAppleCalendar,
    openYahoo: openYahooCalendar
  };

})(window);
