/**
 * petals.js — Rose Petal Shower
 * ═══════════════════════════════════════════════════════════════
 * ARCHITECTURE NOTE — why three animation layers:
 *
 *   CSS rule: when two @keyframes on the SAME element both animate
 *   `transform`, the last-listed one wins on every frame.
 *   rpFall uses translateY+translateZ+rotateZ.
 *   rpSpin uses rotateX+rotateY.
 *   They CANNOT coexist on one element.
 *
 *   Solution: THREE nested divs, each owns one transform axis.
 *
 *   .rp-pos    ← absolute position (left) only — no animation
 *   .rp-sway   ← rpSway: translateX pendulum
 *   .rp-inner  ← rpFall: translateY+rotateZ  +  rpSpin: rotateX+rotateY
 *                (still two animations on one element — but both
 *                 use transform. Final fix: merge them into one
 *                 combined @keyframes — rpMotion — so there is
 *                 exactly ONE transform animation per element.)
 *
 *   FINAL ARCHITECTURE:
 *   .rp-pos    — sets left position, no animation
 *   .rp-sway   — rpSway: translateX only
 *   .rp-inner  — rpMotion: translateY + translateZ + rotateX + rotateY + rotateZ
 *                (all in ONE keyframe so no conflict)
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ── Guard: already initialised ── */
  if (window.__rosePetalsStarted) return;

  /* ══════════════════════════════════════════════
     REDUCED MOTION CHECK
     Re-checked on call, not just at load time.
  ══════════════════════════════════════════════ */
  function isReducedMotion() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ══════════════════════════════════════════════
     5 SVG ROSE PETAL SHAPES — inline, no network
  ══════════════════════════════════════════════ */
  var PETALS = (function () {
    var defs = [
      /* deep rose */
      { g: 'p1', c0: '#FF9AAF', c1: '#E8405A', c2: '#9B1A2E', s: '#A01828',
        d: 'M30 75C10 60 2 40 5 20 8 5 20 0 30 0 40 0 52 5 55 20 58 40 50 60 30 75Z',
        w: 60, h: 80 },
      /* blush pink */
      { g: 'p2', c0: '#FFD6E4', c1: '#F07898', c2: '#B03060', s: '#B03060',
        d: 'M35 72C8 58 0 36 4 16 8 2 20 0 35 0 50 0 62 2 66 16 70 36 62 58 35 72Z',
        w: 70, h: 75 },
      /* crimson */
      { g: 'p3', c0: '#FFAABB', c1: '#D82848', c2: '#7E1220', s: '#8E1828',
        d: 'M28 78C6 63 0 43 3 20 6 4 16 0 28 1 40 0 50 4 53 20 56 43 50 63 28 78Z',
        w: 56, h: 82 },
      /* pale blush */
      { g: 'p4', c0: '#FFEEF4', c1: '#F4A0B8', c2: '#C05878', s: '#C06080',
        d: 'M32 72C10 59 2 40 5 18 8 3 18 0 32 0 46 0 56 3 59 18 62 40 54 59 32 72Z',
        w: 64, h: 76 },
      /* velvet dark */
      { g: 'p5', c0: '#FF8899', c1: '#CC2244', c2: '#6E0F1E', s: '#920020',
        d: 'M29 78C8 63 1 43 4 20 7 4 17 0 29 1 41 0 51 4 54 20 57 43 50 63 29 78Z',
        w: 58, h: 82 },
    ];

    return defs.map(function (p) {
      var mx = p.w / 2;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + p.w + ' ' + p.h + '">'
        + '<defs><radialGradient id="' + p.g + '" cx="40%" cy="30%" r="65%">'
        + '<stop offset="0%" stop-color="' + p.c0 + '"/>'
        + '<stop offset="45%" stop-color="' + p.c1 + '"/>'
        + '<stop offset="100%" stop-color="' + p.c2 + '"/>'
        + '</radialGradient></defs>'
        + '<path d="' + p.d + '" fill="url(#' + p.g + ')"/>'
        + '<path d="M' + mx + ' 5Q' + (mx-1) + ' ' + Math.round(p.h*0.5) + ' ' + mx + ' ' + (p.h-5) + '"'
        + ' stroke="' + p.s + '" stroke-width="0.9" fill="none" opacity="0.32"/>'
        + '<path d="M' + mx + ' ' + Math.round(p.h*0.35) + 'Q' + Math.round(mx*0.5) + ' ' + Math.round(p.h*0.28) + ' ' + Math.round(p.w*0.1) + ' ' + Math.round(p.h*0.25) + '"'
        + ' stroke="' + p.s + '" stroke-width="0.5" fill="none" opacity="0.2"/>'
        + '<path d="M' + mx + ' ' + Math.round(p.h*0.35) + 'Q' + Math.round(mx*1.5) + ' ' + Math.round(p.h*0.28) + ' ' + Math.round(p.w*0.9) + ' ' + Math.round(p.h*0.25) + '"'
        + ' stroke="' + p.s + '" stroke-width="0.5" fill="none" opacity="0.2"/>'
        + '</svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  })();

  /* ══════════════════════════════════════════════
     PETAL CONFIGURATION PROFILES
  ══════════════════════════════════════════════ */
  var PETAL_CONFIG = {
    mobile: {
      showerCount:   24,
      maxLive:       30,   /* absolute DOM cap */
      driftInterval: 800,
      showerStagger: 12,   /* ms between each shower petal spawn */
      showerDur:     5000, /* ms before drift starts */
      autostop:      180000, /* 3 minutes */
    },
    desktop: {
      showerCount:   48,
      maxLive:       70,   /* absolute DOM cap */
      driftInterval: 450,
      showerStagger: 12,
      showerDur:     5000,
      autostop:      180000,
    }
  };

  function getConfig() {
    var isMobile = window.innerWidth < 768 ||
                   /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isMobile ? PETAL_CONFIG.mobile : PETAL_CONFIG.desktop;
  }

  /* ══════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════ */
  var container    = null;
  var allPetals    = [];   /* tracks .rp-pos outer wrappers */
  var driftTimer   = null;
  var stopTimer    = null;
  var resizeTimer  = null;
  var CFG          = null;

  /* ══════════════════════════════════════════════
     UTILITY
  ══════════════════════════════════════════════ */
  function rnd(a, b)  { return a + Math.random() * (b - a); }
  function rndI(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }
  function f2(n)      { return n.toFixed(2); }
  function f0(n)      { return Math.round(n) + ''; }

  /* ══════════════════════════════════════════════
     INJECT STYLES (idempotent)
  ══════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('rp-styles')) return;

    /* ── COMBINED MOTION KEYFRAME ──────────────────────
       This is the key architectural fix.
       ONE @keyframes handles ALL transforms on .rp-inner:
         translateY  — fall from top to bottom
         translateZ  — depth (makes some petals appear closer)
         rotateZ     — tumble around vertical axis (flat spin)
         rotateX     — tumble forward/backward (DIACO effect)
         rotateY     — tumble left/right (DIACO effect)

       CSS custom properties drive the per-petal values.
       Since it's ONE animation → ONE transform → no conflict.
    ── */
    var css = [

      '#petal-container {',
      '  position: fixed;',
      '  top: -100px; left: 0; right: 0; bottom: 0;',
      '  pointer-events: none;',
      '  z-index: 9999;',
      '  perspective: 900px;',
      '  overflow: hidden;',
      '  opacity: 0;',
      '  transition: opacity 0.6s ease;',
      '}',
      '#petal-container.rp-active { opacity: 1; }',

      /* Position wrapper — sets horizontal start, no animation */
      '.rp-pos {',
      '  position: absolute;',
      '  top: 0;',
      '  left: var(--rp-left);',
      '  width: var(--rp-sz);',
      '  height: var(--rp-sz);',
      '}',

      /* Sway wrapper — pendulum left/right, isolated transform */
      '.rp-sway {',
      '  width: 100%; height: 100%;',
      '  animation: rpSway var(--rp-sd) ease-in-out var(--rp-sdelay) infinite alternate;',
      '}',
      '@keyframes rpSway {',
      '  0%   { transform: translateX(0); }',
      '  100% { transform: translateX(var(--rp-sx)); }',
      '}',

      /* Inner — ONE combined motion keyframe, no conflicts */
      '.rp-inner {',
      '  width: 100%; height: 100%;',
      '  background-size: 100% 100%;',
      '  background-repeat: no-repeat;',
      '  animation: rpMotion var(--rp-fd) linear var(--rp-fdelay) infinite;',
      '}',

      '@keyframes rpMotion {',
      '  0% {',
      '    transform:',
      '      translateY(calc(-1 * var(--rp-sz) - 40px))',
      '      translateZ(var(--rp-tz))',
      '      rotateX(0deg)',
      '      rotateY(0deg)',
      '      rotateZ(var(--rp-rz0));',
      '    opacity: 0;',
      '  }',
      '  6% { opacity: var(--rp-op); }',
      '  25% {',
      '    transform:',
      '      translateY(25vh)',
      '      translateZ(var(--rp-tz))',
      '      rotateX(var(--rp-rx1))',
      '      rotateY(var(--rp-ry1))',
      '      rotateZ(calc(var(--rp-rz0) + var(--rp-rzstep)));',
      '  }',
      '  50% {',
      '    transform:',
      '      translateY(50vh)',
      '      translateZ(var(--rp-tz))',
      '      rotateX(var(--rp-rx2))',
      '      rotateY(var(--rp-ry2))',
      '      rotateZ(calc(var(--rp-rz0) + calc(var(--rp-rzstep) * 2)));',
      '  }',
      '  75% {',
      '    transform:',
      '      translateY(75vh)',
      '      translateZ(var(--rp-tz))',
      '      rotateX(var(--rp-rx3))',
      '      rotateY(var(--rp-ry3))',
      '      rotateZ(calc(var(--rp-rz0) + calc(var(--rp-rzstep) * 3)));',
      '  }',
      '  82% { opacity: var(--rp-op); }',
      '  100% {',
      '    transform:',
      '      translateY(112vh)',
      '      translateZ(var(--rp-tz))',
      '      rotateX(var(--rp-rx4))',
      '      rotateY(var(--rp-ry4))',
      '      rotateZ(calc(var(--rp-rz0) + calc(var(--rp-rzstep) * 4)));',
      '    opacity: 0;',
      '  }',
      '}',

      '@media (prefers-reduced-motion: reduce) {',
      '  #petal-container { display: none !important; }',
      '}',

    ].join('\n');

    var el = document.createElement('style');
    el.id  = 'rp-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ══════════════════════════════════════════════
     CREATE ONE PETAL
  ══════════════════════════════════════════════ */
  function createPetal(isShower) {
    if (!CFG) CFG = getConfig();

    /* Hard cap — trim oldest petals to maintain maxLive cap */
    while (allPetals.length >= CFG.maxLive) {
      var dead = allPetals.shift();
      if (dead && dead.parentNode) dead.parentNode.removeChild(dead);
    }

    var w   = window.innerWidth;
    var sz  = rndI(28, 54);
    var fd  = parseFloat(f2(isShower ? rnd(5, 11) : rnd(10, 20)));
    var sd  = parseFloat(f2(rnd(3, 8)));

    /* Negative fall-delay: petals start mid-fall → instant burst feel */
    var fdelay = isShower ? f2(rnd(-fd * 0.88, -0.5)) + 's' : '0s';
    var sdelay = f2(rnd(-sd, 0)) + 's';

    /* Distribute evenly across full width + bleed */
    var leftPx = f2(rnd(-sz, w));

    /* Randomised 3D rotation at each keyframe keypoint */
    var tz     = f0(rnd(-250, 250));
    var rz0    = f0(rnd(0, 360));
    var rzStep = f0(rnd(60, 130) * (Math.random() > 0.5 ? 1 : -1));
    var rx1 = f0(rnd(30,  160));  var ry1 = f0(rnd(20, 140));
    var rx2 = f0(rnd(100, 260));  var ry2 = f0(rnd(80, 240));
    var rx3 = f0(rnd(160, 310));  var ry3 = f0(rnd(140,300));
    var rx4 = f0(rnd(230, 380));  var ry4 = f0(rnd(220,370));
    var sx  = f0(rnd(30, 120) * (Math.random() > 0.5 ? 1 : -1));
    var op  = f2(rnd(0.72, 0.94));
    var img = pick(PETALS);

    /* .rp-pos — position only */
    var pos = document.createElement('div');
    pos.className = 'rp-pos';
    pos.style.cssText =
      '--rp-left:' + leftPx + 'px;' +
      '--rp-sz:'   + sz + 'px;';

    /* .rp-sway — pendulum */
    var sway = document.createElement('div');
    sway.className = 'rp-sway';
    sway.style.cssText =
      '--rp-sd:'     + sd + 's;' +
      '--rp-sdelay:' + sdelay + ';' +
      '--rp-sx:'     + sx + 'px;';

    /* .rp-inner — combined fall + 3D spin */
    var inner = document.createElement('div');
    inner.className = 'rp-inner';
    inner.style.cssText = [
      '--rp-fd:'     + fd + 's',
      '--rp-fdelay:' + fdelay,
      '--rp-tz:'     + tz + 'px',
      '--rp-rz0:'    + rz0 + 'deg',
      '--rp-rzstep:' + rzStep + 'deg',
      '--rp-rx1:'    + rx1 + 'deg', '--rp-ry1:' + ry1 + 'deg',
      '--rp-rx2:'    + rx2 + 'deg', '--rp-ry2:' + ry2 + 'deg',
      '--rp-rx3:'    + rx3 + 'deg', '--rp-ry3:' + ry3 + 'deg',
      '--rp-rx4:'    + rx4 + 'deg', '--rp-ry4:' + ry4 + 'deg',
      '--rp-op:'     + op,
      'background-image:url("' + img + '")',
    ].join(';');

    sway.appendChild(inner);
    pos.appendChild(sway);
    if (container) container.appendChild(pos);
    allPetals.push(pos);
    return pos;
  }

  /* ══════════════════════════════════════════════
     SCROLL-BASED SCENE INTENSITY
     Opening  → full shower
     House    → slower drift
     Welcome  → occasional petals
     The Day  → almost still
     Location → calm
     Closing  → warmer burst resumes
  ══════════════════════════════════════════════ */
  var SCENES = [
    { selector: '.hero',                intensity: 1.00 },
    { selector: '.house-photo-section', intensity: 0.40 },
    { selector: '.welcome-section',     intensity: 0.25 },
    { selector: '.details-section',     intensity: 0.15 },
    { selector: '.map-section',         intensity: 0.10 },
    { selector: '.closing-section',     intensity: 0.65 },
  ];

  var currentInterval = null;

  function getSceneIntensity() {
    var mid = window.pageYOffset + window.innerHeight * 0.5;
    var best = 1.0;
    for (var i = 0; i < SCENES.length; i++) {
      var el = document.querySelector(SCENES[i].selector);
      if (!el) continue;
      if (mid >= el.offsetTop && mid < el.offsetTop + el.offsetHeight) {
        best = SCENES[i].intensity;
        break;
      }
    }
    return best;
  }

  function updateDriftInterval() {
    if (!CFG) return;
    var intensity = getSceneIntensity();
    /* Map intensity 0.1–1.0 to interval range: 450ms (full) → 3500ms (calm) */
    var newInterval = Math.round(CFG.driftInterval + (1 - intensity) * 3000);
    if (newInterval !== currentInterval) {
      currentInterval = newInterval;
      if (driftTimer) {
        clearInterval(driftTimer);
        driftTimer = setInterval(function () {
          if (!container || !container.parentNode) { stopDrift(); return; }
          createPetal(false);
        }, currentInterval);
      }
    }
  }

  function initSceneTracking() {
    window.addEventListener('scroll', updateDriftInterval, { passive: true });
  }

  /* ══════════════════════════════════════════════
     SHOWER & DRIFT
  ══════════════════════════════════════════════ */
  function shower() {
    for (var i = 0; i < CFG.showerCount; i++) {
      (function (idx) {
        setTimeout(function () {
          if (!container || !container.parentNode) return;
          createPetal(true);
        }, idx * CFG.showerStagger);
      })(i);
    }
    setTimeout(startDrift, CFG.showerDur);
  }

  function startDrift() {
    if (driftTimer) return;
    currentInterval = CFG.driftInterval;
    driftTimer = setInterval(function () {
      if (!container || !container.parentNode) {
        stopDrift(); return;
      }
      createPetal(false);
    }, currentInterval);
    initSceneTracking();
  }

  function stopDrift() {
    if (driftTimer) { clearInterval(driftTimer); driftTimer = null; }
    if (stopTimer)  { clearTimeout(stopTimer);   stopTimer  = null; }
    if (!container) return;
    container.style.transition = 'opacity 1s ease';
    container.style.opacity    = '0';
    setTimeout(function () {
      if (container) {
        container.innerHTML = '';
      }
      allPetals = [];   /* complete reference cleanup — zero memory leak */
    }, 1100);
  }

  /* ══════════════════════════════════════════════
     THROTTLED RESIZE HANDLING
     Adjusts profile cap without destroying existing petals
  ══════════════════════════════════════════════ */
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      CFG = getConfig();
      /* Trim excess petals if viewport shrank */
      while (allPetals.length > CFG.maxLive) {
        var dead = allPetals.shift();
        if (dead && dead.parentNode) dead.parentNode.removeChild(dead);
      }
    }, 200);
  }

  window.addEventListener('resize', onResize, { passive: true });

  /* ══════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════ */
  window.startRosePetals = function () {
    if (isReducedMotion()) return;
    if (window.__rosePetalsStarted) return;
    window.__rosePetalsStarted = true;

    container = document.getElementById('petal-container');
    if (!container) return;

    CFG = getConfig();
    injectStyles();

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        container.classList.add('rp-active');
        shower();
        stopTimer = setTimeout(stopDrift, CFG.autostop);
      });
    });
  };

  /* Helper for DOM sanity verification tests */
  window.__rosePetalCount = function () {
    return allPetals.length;
  };
  window.__stopRosePetals = stopDrift;

})();
