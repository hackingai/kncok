/**
 * app.js
 * ─────────────────────────────────────────────────────────────────
 * Main controller for the Vanukuri Family invitation.
 * Handles:
 *   • Opening overlay lifecycle
 *   • Hero reveal trigger (calls animations.js)
 *   • Floating location button visibility
 *   • Smooth scroll for anchor links
 *   • House photo error handling
 *   • Rose petal shower (delegates to petals.js)
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ════════════════════════════════════════════
     OPENING OVERLAY
  ════════════════════════════════════════════ */
  var overlay   = document.getElementById('opening-overlay');
  var hasHidden = false;

  function hideOverlay() {
    if (hasHidden || !overlay) return;
    hasHidden = true;

    overlay.classList.add('is-hiding');

    /* ── Fallback timer ──────────────────────────────────────────
       animationend is NOT guaranteed to fire if:
         • Browser throttles animations (background tab)
         • User has hardware acceleration disabled
         • CSS animation is overridden by browser power-save mode
         • Page loses focus mid-animation
       So we set a bounded safety fallback timer (1.5s).
       Whichever fires first (animationend or timeout) wins.
       The `afterOverlayFired` guard ensures it only runs once.
    ── */
    var afterOverlayFired = false;

    function afterOverlay() {
      if (afterOverlayFired) return;
      afterOverlayFired = true;

      overlay.style.display = 'none';

      /* 1. Reveal hero */
      if (window.InvitationStoryEngine && typeof window.InvitationStoryEngine.revealHero === 'function') {
        window.InvitationStoryEngine.revealHero();
      } else if (typeof window.revealHero === 'function') {
        window.revealHero();
      } else {
        /* Hard fallback: show hero elements directly */
        document.querySelectorAll('.hero [data-story]').forEach(function (el) {
          el.classList.add('story-in');
        });
      }

      /* 2. Start petals */
      if (!prefersReducedMotion && typeof window.startRosePetals === 'function') {
        setTimeout(window.startRosePetals, 80);
      }

      /* 3. Focus main for screen readers */
      var main = document.getElementById('main-content');
      if (main) main.focus({ preventScroll: true });
    }

    /* Primary: animationend event — explicitly filter for overlayOut animation */
    function onAnimationEnd(e) {
      if (e.target === overlay && e.animationName === 'overlayOut') {
        overlay.removeEventListener('animationend', onAnimationEnd);
        afterOverlay();
      }
    }
    overlay.addEventListener('animationend', onAnimationEnd);

    /* Fallback: 1.5s bounded safety timeout ensures hero is never permanently hidden */
    setTimeout(afterOverlay, 1500);
  }

  function initOverlay() {
    if (!overlay) return;

    var autoTimer = null;
    var langModal = document.getElementById('lang-modal');

    function startAutoTimer() {
      if (!autoTimer && !hasHidden) {
        autoTimer = setTimeout(hideOverlay, 2800);
      }
    }

    // Only start auto-dismiss if language prompt is not showing
    var config = window.KnockConfig ? window.KnockConfig.get() : {};
    var isPromptActive = config.langPromptActive !== false && !sessionStorage.getItem('knock_invitation_prompted_v1');

    if (!isPromptActive) {
      startAutoTimer();
    }

    // When guest selects their language, begin the ceremonial opening
    window.addEventListener('knock_lang_changed', function () {
      if (!hasHidden) {
        setTimeout(hideOverlay, 2200);
      }
    }, { once: true });

    function onUserInteraction() {
      if (autoTimer) clearTimeout(autoTimer);
      hideOverlay();
    }

    // Any interaction dismisses early
    overlay.addEventListener('click',      onUserInteraction, { once: true });
    overlay.addEventListener('touchstart', onUserInteraction, { once: true, passive: true });

    window.addEventListener('scroll', function onScroll() {
      onUserInteraction();
      window.removeEventListener('scroll', onScroll);
    }, { passive: true, once: true });

    document.addEventListener('keydown', function onKey(e) {
      if (['Enter', ' ', 'Escape', 'Tab', 'ArrowDown'].includes(e.key)) {
        onUserInteraction();
        document.removeEventListener('keydown', onKey);
      }
    }, { once: true });
  }

  /* ════════════════════════════════════════════
     FLOATING LOCATION BUTTON
     Appears after scrolling past the hero
  ════════════════════════════════════════════ */
  function initFAB() {
    var fab  = document.querySelector('.fab-location');
    var hero = document.querySelector('.hero');
    if (!fab || !hero) return;

    function update() {
      fab.classList.toggle('is-visible', hero.getBoundingClientRect().bottom < 0);
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ════════════════════════════════════════════
     SMOOTH SCROLL
  ════════════════════════════════════════════ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - 24;
        window.scrollTo({ top: top, behavior: 'smooth' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  /* ════════════════════════════════════════════
     HOUSE PHOTO — graceful missing image handler
  ════════════════════════════════════════════ */
  function initHousePhoto() {
    var img         = document.getElementById('house-photo');
    var placeholder = document.querySelector('.house-photo-placeholder');
    if (!img || !placeholder) return;

    function showPlaceholder() {
      img.style.display      = 'none';
      placeholder.style.display = 'flex';
    }

    if (img.complete && img.naturalWidth === 0) showPlaceholder();
    img.addEventListener('error', showPlaceholder);
  }

  /* ════════════════════════════════════════════
     ADDRESS COPY BUTTON
  ════════════════════════════════════════════ */
  function initAddressCopy() {
    var btn        = document.getElementById('copy-address-btn');
    var addressEl  = document.getElementById('address-text');
    if (!btn || !addressEl) return;

    var iconDefault = btn.querySelector('.copy-icon-default');
    var iconDone    = btn.querySelector('.copy-icon-done');

    btn.addEventListener('click', function () {
      var text = addressEl.textContent.trim();
      if (!text) return;

      // Use Clipboard API with fallback
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showCopied).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }

      function fallbackCopy() {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity  = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopied(); } catch (e) {}
        document.body.removeChild(ta);
      }

      function showCopied() {
        btn.classList.add('copied');
        btn.setAttribute('aria-label', 'Address copied!');
        if (iconDefault) iconDefault.style.display = 'none';
        if (iconDone)    iconDone.style.display    = 'block';

        setTimeout(function () {
          btn.classList.remove('copied');
          btn.setAttribute('aria-label', 'Copy address to clipboard');
          if (iconDefault) iconDefault.style.display = 'block';
          if (iconDone)    iconDone.style.display    = 'none';
        }, 2200);
      }
    });
  }

  /* ════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════ */
  function init() {
    initOverlay();
    initFAB();
    initSmoothScroll();
    initHousePhoto();
    initAddressCopy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
