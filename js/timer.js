/**
 * timer.js — Ceremonial Auspicious Countdown Clock
 * ─────────────────────────────────────────────────────────────
 * Accurately counts down to the event in IST (Asia/Kolkata).
 * Listens to KnockConfig for dynamic target time and on/off toggle.
 * ─────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  var timerInterval = null;

  function padZero(num) {
    return (num < 10 ? '0' : '') + Math.floor(Math.max(0, num));
  }

  function getRemainingTime(targetIso) {
    var targetTime = new Date(targetIso).getTime();
    var now = Date.now();
    var diff = targetTime - now;

    if (diff <= 0) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
    }

    var seconds = Math.floor((diff / 1000) % 60);
    var minutes = Math.floor((diff / (1000 * 60)) % 60);
    var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return {
      total: diff,
      days: days,
      hours: hours,
      minutes: minutes,
      seconds: seconds,
      isComplete: false
    };
  }

  function updateDigit(elementId, value) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var strVal = padZero(value);
    if (el.textContent !== strVal) {
      el.textContent = strVal;
      // Add subtle tick pulse class
      el.classList.add('digit-tick');
      setTimeout(function () {
        el.classList.remove('digit-tick');
      }, 300);
    }
  }

  function renderTimer() {
    var config = window.KnockConfig ? window.KnockConfig.get() : {
      timerActive: true,
      targetIso: '2026-08-31T03:00:00+05:30',
      timerHeading: 'Auspicious Muhurtham In'
    };

    var section = document.getElementById('countdown-section');
    if (!section) return;

    // Toggle active state
    if (config.timerActive === false) {
      section.style.display = 'none';
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      return;
    } else {
      section.style.display = '';
    }

    var headingEl = document.getElementById('timer-heading');
    if (headingEl && config.timerHeading) {
      headingEl.textContent = config.timerHeading;
    }

    function tick() {
      var t = getRemainingTime(config.targetIso || '2026-08-31T03:00:00+05:30');
      var clockWrapper = document.getElementById('countdown-clock');
      var completeMsg = document.getElementById('countdown-complete');

      if (t.isComplete) {
        if (clockWrapper) clockWrapper.style.display = 'none';
        if (completeMsg) completeMsg.style.display = 'block';
      } else {
        if (clockWrapper) clockWrapper.style.display = 'flex';
        if (completeMsg) completeMsg.style.display = 'none';

        updateDigit('timer-days', t.days);
        updateDigit('timer-hours', t.hours);
        updateDigit('timer-minutes', t.minutes);
        updateDigit('timer-seconds', t.seconds);
      }
    }

    tick();

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tick, 1000);
  }

  function init() {
    renderTimer();

    if (window.KnockConfig && typeof window.KnockConfig.onUpdate === 'function') {
      window.KnockConfig.onUpdate(function () {
        renderTimer();
      });
    }

    window.addEventListener('knock_lang_changed', function () {
      renderTimer();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.KnockTimer = {
    render: renderTimer
  };

})(window);
