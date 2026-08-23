/**
 * animations.js
 * ─────────────────────────────────────────────────────────────────
 * Scroll-driven story engine for the Vanukuri Family invitation.
 *
 * Philosophy:
 *   70% of elements just exist, beautifully still.
 *   20% fade/slide in when they enter the viewport.
 *   10% have a special moment (photo frame, diya, clock hands, lines).
 *
 * Unified RevealController manages IntersectionObserver, scroll fallbacks,
 * and reduced-motion states with strict idempotency guards.
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroRevealed = false;

  /* ════════════════════════════════════════════
     STORY SEQUENCE
     Defines timing offsets (ms) for each beat.
  ════════════════════════════════════════════ */
  var STORY_DELAYS = {
    // Hero
    'hero-eyebrow':  0,
    'hero-title':    120,
    'hero-ornament': 220,
    'hero-family':   320,
    'hero-details':  420,

    // Photo section
    'photo-label':   0,
    'photo-frame':   80,
    'photo-caption': 900,

    // Welcome letter
    'welcome-diya':   0,
    'welcome-line-1': 200,
    'welcome-line-2': 480,
    'welcome-sub':    720,

    // Details cards
    'details-label': 0,
    'card-date':     120,
    'card-time':     280,
    'card-gallery':  360,
    'calendar-btn':  440,

    // Map
    'map-label':     0,
    'map-title':     80,
    'map-welcome':   200,
    'map-container': 320,
    'directions-btn':500,

    // Closing
    'closing-diya':    0,
    'closing-line-1':  200,
    'closing-line-2':  440,
    'closing-ornament':680,
    'closing-thankyou':820,
    'closing-family':  960,
    'closing-date':    1080,
  };

  /* ════════════════════════════════════════════
     UNIFIED REVEAL CONTROLLER
     Single owner for all element visibility changes.
  ════════════════════════════════════════════ */
  var RevealController = {
    revealElement: function (el) {
      if (!el || el.classList.contains('story-in')) return;
      el.classList.add('story-in');
    },

    revealGroup: function (triggerEl) {
      var section = triggerEl.closest('section, .hero');
      var elements = section ? Array.from(section.querySelectorAll('[data-story]')) : [triggerEl];

      elements.forEach(function (el) {
        if (el.classList.contains('story-in')) return;
        var key   = el.getAttribute('data-story');
        var delay = (key && STORY_DELAYS[key] !== undefined) ? STORY_DELAYS[key] : 0;

        setTimeout(function () {
          RevealController.revealElement(el);
        }, delay);
      });
    },

    revealAll: function () {
      document.querySelectorAll('[data-story]').forEach(function (el) {
        RevealController.revealElement(el);
      });
      document.querySelectorAll('.story-corner').forEach(function (el) {
        el.style.width  = '32px';
        el.style.height = '32px';
        el.style.opacity = '0.75';
      });
    }
  };

  /* ════════════════════════════════════════════
     HERO REVEAL — Module guarded, single state owner
  ════════════════════════════════════════════ */
  function revealHeroOnce() {
    if (heroRevealed) return;
    heroRevealed = true;

    var heroSection = document.querySelector('.hero');
    if (!heroSection) return;

    var elements = heroSection.querySelectorAll('[data-story]');
    elements.forEach(function (el) {
      var key   = el.getAttribute('data-story');
      var delay = (key && STORY_DELAYS[key] !== undefined) ? STORY_DELAYS[key] : 0;
      setTimeout(function () {
        RevealController.revealElement(el);
      }, delay + 180);
    });
  }

  // Backwards compatibility & namespaced API
  window.revealHero = revealHeroOnce;
  window.InvitationStoryEngine = {
    revealHero: revealHeroOnce,
    revealAll:  RevealController.revealAll,
  };

  /* ════════════════════════════════════════════
     INTERSECTION OBSERVER & FALLBACK ENGINE
  ════════════════════════════════════════════ */
  function initStoryObserver() {
    if (!('IntersectionObserver' in window)) {
      RevealController.revealAll();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            RevealController.revealGroup(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    var sections = document.querySelectorAll('section');
    sections.forEach(function (section) {
      var firstStory = section.querySelector('[data-story]');
      if (firstStory) {
        observer.observe(firstStory);
      }
    });

    /* ── Scroll fallback check for unrevealed sections ─────────── */
    function checkUnrevealed() {
      var vh = window.innerHeight;
      document.querySelectorAll('section').forEach(function (section) {
        var rect = section.getBoundingClientRect();
        if (rect.top < vh - 40 && rect.bottom > 0) {
          var unrevealed = section.querySelector('[data-story]:not(.story-in)');
          if (unrevealed) {
            RevealController.revealGroup(unrevealed);
          }
        }
      });
    }

    window.addEventListener('scroll', checkUnrevealed, { passive: true });
  }

  /* ════════════════════════════════════════════
     INIT & SAFETY NET
  ════════════════════════════════════════════ */
  function init() {
    if (prefersReducedMotion) {
      RevealController.revealAll();
      return;
    }
    initStoryObserver();

    /* Safety net: Guarantee all content becomes visible even if observer fails completely */
    setTimeout(function () {
      var heroSection = document.querySelector('.hero');
      if (heroSection) {
        revealHeroOnce();
      }
      var unrevealed = document.querySelector('[data-story]:not(.story-in)');
      if (unrevealed) {
        RevealController.revealAll();
      }
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
