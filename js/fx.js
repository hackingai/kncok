/**
 * fx.js — InvitationFX Canvas Engine (Phase 2 & Phase 3)
 * ═══════════════════════════════════════════════════════════════
 * A scroll-driven, living visual atmosphere for the Vanukuri Family
 * Housewarming Invitation.
 *
 * Architecture:
 *   InvitationFX Engine
 *     ├── Canvas Renderer (DPR-aware, 0 DOM nodes, offscreen blitting)
 *     ├── PetalSystem     (3 depth layers, physics + wind + sway + 3D tumble)
 *     ├── SparkleSystem   (warm ambient gold/marigold floating sparkles)
 *     ├── WindSystem      (natural breeze + decayed scroll-velocity gusts)
 *     └── SceneController (section-driven atmosphere lerp transitions)
 *
 * Section Atmosphere Map:
 *   opening  → 1.00 petal | 0.15 wind | 0.10 sparkle
 *   house    → 0.65 petal | 0.08 wind | 0.15 sparkle
 *   welcome  → 0.35 petal | 0.04 wind | 0.08 sparkle
 *   occasion → 0.20 petal | 0.02 wind | 0.05 sparkle
 *   location → 0.08 petal | 0.01 wind | 0.02 sparkle
 *   closing  → 0.60 petal | 0.08 wind | 0.12 sparkle
 * ═══════════════════════════════════════════════════════════════
 */

(function (global) {
  'use strict';

  /* ─────────────────────────────────────────
     UTILITIES
  ───────────────────────────────────────── */
  function rnd(a, b)        { return a + Math.random() * (b - a); }
  function rndInt(a, b)     { return Math.floor(rnd(a, b + 1)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t)    { return a + (b - a) * t; }

  function isReducedMotion() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ─────────────────────────────────────────
     COLOR PALETTES & DEFINITIONS
  ───────────────────────────────────────── */
  var ROSE_PALETTES = [
    { light: '#FFB3C1', mid: '#E8607A', dark: '#C0344E', vein: '#A01828', alpha: 0.90 }, // classic rose
    { light: '#FFCCD5', mid: '#F0889A', dark: '#D45570', vein: '#B03060', alpha: 0.84 }, // blush pink
    { light: '#FFC8D2', mid: '#E87090', dark: '#C84068', vein: '#8E1828', alpha: 0.88 }, // medium rose
    { light: '#FFEEF4', mid: '#F4A0B8', dark: '#C05878', vein: '#C06080', alpha: 0.80 }, // pale blush
    { light: '#FF8899', mid: '#CC2244', dark: '#6E0F1E', vein: '#920020', alpha: 0.92 }, // velvet crimson
  ];

  var SPARKLE_COLORS = [
    'rgba(212, 168, 67, ',   // gold
    'rgba(224, 123, 57, ',   // marigold
    'rgba(240, 200, 120, ',  // pale gold
    'rgba(192, 113, 79, ',   // terracotta
    'rgba(255, 220, 180, ',  // warm white
  ];

  /* ─────────────────────────────────────────
     SCENE DEFINITIONS & ATMOSPHERE TUNING
  ───────────────────────────────────────── */
  var SCENES = {
    opening:  { petalIntensity: 1.00, windBase: 0.15, sparkleIntensity: 0.10 },
    house:    { petalIntensity: 0.65, windBase: 0.08, sparkleIntensity: 0.15 },
    welcome:  { petalIntensity: 0.35, windBase: 0.04, sparkleIntensity: 0.08 },
    occasion: { petalIntensity: 0.20, windBase: 0.02, sparkleIntensity: 0.05 },
    location: { petalIntensity: 0.08, windBase: 0.01, sparkleIntensity: 0.02 },
    closing:  { petalIntensity: 0.60, windBase: 0.08, sparkleIntensity: 0.12 },
  };

  /* ─────────────────────────────────────────
     OFFSCREEN PETAL SILHOUETTE CACHE
  ───────────────────────────────────────── */
  var OFFSCREEN_PETAL_CACHE = [];

  function buildPetalCache() {
    if (OFFSCREEN_PETAL_CACHE.length > 0) return;

    var cacheSize = 128;
    ROSE_PALETTES.forEach(function (pal) {
      var offscreen = document.createElement('canvas');
      offscreen.width  = cacheSize;
      offscreen.height = cacheSize;
      var ctx = offscreen.getContext('2d');

      var cx = cacheSize / 2;
      var cy = cacheSize / 2;
      var s  = cacheSize * 0.42;

      ctx.save();
      ctx.translate(cx, cy);

      ctx.beginPath();
      ctx.moveTo(0, s * 0.52);
      ctx.bezierCurveTo(-s * 0.58, s * 0.25, -s * 0.62, -s * 0.15, -s * 0.18, -s * 0.52);
      ctx.bezierCurveTo(-s * 0.05, -s * 0.68,  s * 0.05, -s * 0.68,  s * 0.18, -s * 0.52);
      ctx.bezierCurveTo( s * 0.62, -s * 0.15,  s * 0.58,  s * 0.25, 0,          s * 0.52);
      ctx.closePath();

      var grad = ctx.createRadialGradient(s * 0.1, -s * 0.2, s * 0.05, s * 0.1, -s * 0.2, s * 0.8);
      grad.addColorStop(0,   pal.light);
      grad.addColorStop(0.4, pal.mid);
      grad.addColorStop(1,   pal.dark);

      ctx.fillStyle = grad;
      ctx.fill();

      // Main vein
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.48);
      ctx.bezierCurveTo(0, -s * 0.1, 0, s * 0.2, 0, s * 0.48);
      ctx.strokeStyle = pal.vein;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.35;
      ctx.stroke();

      // Side veins
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.2);
      ctx.bezierCurveTo(-s * 0.25, s * 0.05, -s * 0.3, s * 0.2, -s * 0.15, s * 0.4);
      ctx.moveTo( s * 0.05, -s * 0.2);
      ctx.bezierCurveTo( s * 0.25, s * 0.05,  s * 0.3, s * 0.2,  s * 0.15, s * 0.4);
      ctx.lineWidth   = 1.0;
      ctx.globalAlpha = 0.20;
      ctx.stroke();

      ctx.restore();
      OFFSCREEN_PETAL_CACHE.push(offscreen);
    });
  }

  /* ─────────────────────────────────────────
     CONFIG PROFILES (Mobile vs Desktop)
  ───────────────────────────────────────── */
  var CONFIG_PROFILES = {
    mobile: {
      showerCount:     24,
      maxPetals:       30,
      maxSparkles:     12,
      driftInterval:   800,
      sparkleInterval: 600,
      showerStagger:   14,
      showerDur:       4500,
    },
    desktop: {
      showerCount:     48,
      maxPetals:       60,
      maxSparkles:     25,
      driftInterval:   450,
      sparkleInterval: 350,
      showerStagger:   12,
      showerDur:       4500,
    }
  };

  function getProfile() {
    var isMobile = window.innerWidth < 768 ||
                   /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isMobile ? CONFIG_PROFILES.mobile : CONFIG_PROFILES.desktop;
  }

  /* ═══════════════════════════════════════
     WIND & SCROLL VELOCITY ENGINE
  ═══════════════════════════════════════ */
  var WindSystem = {
    gust:      0,
    gustDecay: 0.94,

    addScrollGust: function (velocity) {
      // Controlled, subtle response — capped at 0.6 max
      var strength = clamp(Math.abs(velocity) * 0.05, 0, 0.6);
      var dir = velocity > 0 ? 1 : -1;
      this.gust = strength * dir;
    },

    update: function (baseWind) {
      this.gust *= this.gustDecay;
      return baseWind + this.gust;
    }
  };

  /* ═══════════════════════════════════════
     SCENE CONTROLLER
  ═══════════════════════════════════════ */
  var SceneController = {
    currentScene: 'opening',

    targetPetal:   SCENES.opening.petalIntensity,
    targetWind:    SCENES.opening.windBase,
    targetSparkle: SCENES.opening.sparkleIntensity,

    livePetal:     SCENES.opening.petalIntensity,
    liveWind:      SCENES.opening.windBase,
    liveSparkle:   SCENES.opening.sparkleIntensity,

    sections: [],

    init: function () {
      var map = [
        { selector: '.hero',                scene: 'opening'  },
        { selector: '.house-photo-section', scene: 'house'    },
        { selector: '.welcome-section',     scene: 'welcome'  },
        { selector: '.details-section',     scene: 'occasion' },
        { selector: '.map-section',         scene: 'location' },
        { selector: '.closing-section',     scene: 'closing'  },
      ];

      this.sections = [];
      map.forEach(function (item) {
        var el = document.querySelector(item.selector);
        if (el) SceneController.sections.push({ el: el, scene: item.scene });
      });

      window.addEventListener('scroll', SceneController.onScroll, { passive: true });
      SceneController.onScroll();
    },

    onScroll: function () {
      var mid = window.pageYOffset + window.innerHeight * 0.45;
      var matched = 'opening';

      for (var i = 0; i < SceneController.sections.length; i++) {
        var sec = SceneController.sections[i];
        var top = sec.el.offsetTop;
        var bot = top + sec.el.offsetHeight;
        if (mid >= top && mid < bot) {
          matched = sec.scene;
          break;
        }
      }

      if (matched !== SceneController.currentScene) {
        SceneController.setScene(matched);
      }
    },

    setScene: function (sceneName) {
      var cfg = SCENES[sceneName];
      if (!cfg) return;

      this.currentScene  = sceneName;
      this.targetPetal   = cfg.petalIntensity;
      this.targetWind    = cfg.windBase;
      this.targetSparkle = cfg.sparkleIntensity;
    },

    update: function () {
      // Smooth lerp atmosphere interpolation
      this.livePetal   = lerp(this.livePetal,   this.targetPetal,   0.02);
      this.liveWind    = lerp(this.liveWind,    this.targetWind,    0.02);
      this.liveSparkle = lerp(this.liveSparkle, this.targetSparkle, 0.02);
    }
  };

  /* ═══════════════════════════════════════
     CANVAS PETAL ENGINE CLASS
  ═══════════════════════════════════════ */
  function CanvasPetalEngine() {
    this.canvas         = null;
    this.ctx            = null;
    this.petals         = [];
    this.sparkles       = [];
    this.rafId          = null;
    this.active         = false;
    this.paused         = false;
    this.showerPhase    = true;
    this.lastSpawn      = 0;
    this.lastSparkle    = 0;
    this.lastScrollY    = 0;
    this.lastScrollTime = 0;
    this.dpr            = 1;
    this.logicalW       = 0;
    this.logicalH       = 0;
    this.driftTimer     = null;
    this.sparkleTimer   = null;
    this.profile         = getProfile();

    // Stats tracking
    this.frameCount   = 0;
    this.lastFpsCheck = performance.now();
    this.currentFps   = 60;

    // Bindings
    this._onResize     = this.resize.bind(this);
    this._onVisibility = this._handleVisibility.bind(this);
    this._onScroll     = this._handleScroll.bind(this);
    this._loop         = this._loop.bind(this);
  }

  CanvasPetalEngine.prototype = {

    init: function () {
      this.canvas = document.getElementById('petal-canvas');
      if (!this.canvas) return false;

      this.ctx = this.canvas.getContext('2d', { alpha: true });
      buildPetalCache();
      this.resize();

      SceneController.init();

      window.addEventListener('resize', this._onResize, { passive: true });
      window.addEventListener('scroll', this._onScroll, { passive: true });
      document.addEventListener('visibilitychange', this._onVisibility);

      this.lastScrollY    = window.pageYOffset;
      this.lastScrollTime = performance.now();

      return true;
    },

    resize: function () {
      if (!this.canvas) return;

      this.logicalW = window.innerWidth;
      this.logicalH = window.innerHeight;
      this.dpr      = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width        = Math.floor(this.logicalW * this.dpr);
      this.canvas.height       = Math.floor(this.logicalH * this.dpr);
      this.canvas.style.width  = this.logicalW + 'px';
      this.canvas.style.height = this.logicalH + 'px';

      this.profile = getProfile();

      // Trim excess live particles if cap shrank
      var maxP = Math.ceil(this.profile.maxPetals * SceneController.livePetal);
      while (this.petals.length > maxP) {
        this.petals.shift();
      }
    },

    createPetal: function (isShower) {
      var depth = rnd(0, 1);

      // Depth sizing (12px to 46px)
      var size = lerp(12, 46, depth);

      var palette = ROSE_PALETTES[rndInt(0, ROSE_PALETTES.length - 1)];
      var baseOpacity = lerp(palette.alpha * 0.5, palette.alpha, depth);

      var speedY = isShower
        ? rnd(2.5, 5.0) * lerp(0.7, 1.0, depth)
        : rnd(0.8, 1.8) * lerp(0.6, 1.0, depth);

      return {
        x:          rnd(-20, this.logicalW + 20),
        y:          isShower ? rnd(-this.logicalH * 0.35, -size) : rnd(-70, -size),
        size:       size,
        depth:      depth,
        shapeIndex: rndInt(0, OFFSCREEN_PETAL_CACHE.length - 1),

        speedY:     speedY,
        speedX:     rnd(-0.4, 0.6),

        swayAmp:    lerp(10, 32, depth),
        swaySpeed:  rnd(0.015, 0.032),
        swayPhase:  rnd(0, Math.PI * 2),

        rotation:   rnd(0, Math.PI * 2),
        rotSpeed:   rnd(-0.025, 0.025) * lerp(0.5, 1.0, depth),
        tilt:       rnd(-0.8, 0.8),
        tiltSpeed:  rnd(-0.01, 0.01),

        opacity:    isShower ? baseOpacity : 0,
        targetOp:   baseOpacity,
        age:        0,
        isShower:   isShower,
      };
    },

    createSparkle: function () {
      return {
        x:        rnd(0, this.logicalW),
        y:        rnd(0, this.logicalH),
        r:        rnd(1.0, 2.6),
        color:    SPARKLE_COLORS[rndInt(0, SPARKLE_COLORS.length - 1)],
        speedY:   rnd(-0.15, -0.4),
        speedX:   rnd(-0.1, 0.1),
        opacity:  0,
        targetOp: rnd(0.25, 0.65) * clamp(SceneController.liveSparkle, 0.1, 1.0),
        life:     rndInt(120, 260),
        age:      0,
      };
    },

    shower: function () {
      var self = this;
      var count = this.profile.showerCount;

      for (var i = 0; i < count; i++) {
        (function (idx) {
          setTimeout(function () {
            if (!self.active) return;
            if (self.petals.length < self.profile.maxPetals) {
              self.petals.push(self.createPetal(true));
            }
          }, idx * self.profile.showerStagger);
        })(i);
      }

      setTimeout(function () {
        self.showerPhase = false;
        self.startDrift();
      }, self.profile.showerDur);
    },

    startDrift: function () {
      var self = this;
      if (this.driftTimer) return;

      this.driftTimer = setInterval(function () {
        if (!self.active || self.paused) return;
        var targetCap = Math.ceil(self.profile.maxPetals * SceneController.livePetal);
        if (self.petals.length < targetCap) {
          self.petals.push(self.createPetal(false));
        }
      }, this.profile.driftInterval);

      this.sparkleTimer = setInterval(function () {
        if (!self.active || self.paused) return;
        var targetSparkleCap = Math.ceil(self.profile.maxSparkles * SceneController.liveSparkle);
        if (self.sparkles.length < targetSparkleCap) {
          self.sparkles.push(self.createSparkle());
        }
      }, this.profile.sparkleInterval);
    },

    start: function () {
      if (isReducedMotion()) return;
      if (!this.canvas && !this.init()) return;
      if (this.active) return;

      this.active = true;
      this.paused = false;
      this.canvas.classList.add('is-active');

      this.shower();
      this.rafId = requestAnimationFrame(this._loop);
    },

    stop: function () {
      this.active = false;
      if (this.driftTimer) {
        clearInterval(this.driftTimer);
        this.driftTimer = null;
      }
      if (this.sparkleTimer) {
        clearInterval(this.sparkleTimer);
        this.sparkleTimer = null;
      }
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      if (this.canvas) {
        this.canvas.classList.remove('is-active');
        if (this.ctx) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      }
      this.petals   = [];
      this.sparkles = [];
    },

    destroy: function () {
      this.stop();
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('scroll', this._onScroll);
      document.removeEventListener('visibilitychange', this._onVisibility);
      this.canvas = null;
      this.ctx    = null;
    },

    _handleScroll: function () {
      var now = performance.now();
      var dt  = now - this.lastScrollTime || 16;
      var dy  = window.pageYOffset - this.lastScrollY;
      var vel = dy / dt;

      if (Math.abs(vel) > 0.35) {
        WindSystem.addScrollGust(vel);
      }

      this.lastScrollY    = window.pageYOffset;
      this.lastScrollTime = now;
    },

    _handleVisibility: function () {
      if (document.hidden) {
        this.paused = true;
      } else {
        this.paused = false;
        if (this.active && !this.rafId) {
          this.lastSpawn = performance.now();
          this.rafId = requestAnimationFrame(this._loop);
        }
      }
    },

    _updatePetal: function (p, totalWind) {
      p.age++;

      // Sway + wind response
      var sway = Math.sin(p.age * p.swaySpeed + p.swayPhase) * p.swayAmp * 0.016;
      p.x += p.speedX + sway + totalWind * lerp(0.4, 1.0, p.depth);
      p.y += p.speedY;

      p.rotation += p.rotSpeed;
      p.tilt     += p.tiltSpeed;

      if (p.tilt >  0.85) { p.tilt  =  0.85; p.tiltSpeed *= -1; }
      if (p.tilt < -0.85) { p.tilt  = -0.85; p.tiltSpeed *= -1; }

      var targetOp = p.targetOp * clamp(SceneController.livePetal, 0.2, 1.0);
      if (p.opacity < targetOp) {
        p.opacity = Math.min(targetOp, p.opacity + 0.02);
      }

      var fadeStart = this.logicalH * 0.80;
      if (p.y > fadeStart) {
        var progress = (p.y - fadeStart) / (this.logicalH * 0.20);
        p.opacity = targetOp * Math.max(0, 1 - progress);
      }

      return p.y < this.logicalH + p.size + 20;
    },

    _updateSparkle: function (s) {
      s.age++;
      s.x += s.speedX;
      s.y += s.speedY;

      var targetOp = s.targetOp * clamp(SceneController.liveSparkle, 0.1, 1.0);

      if (s.age < 30) {
        s.opacity = (s.age / 30) * targetOp;
      } else if (s.age > s.life - 40) {
        s.opacity = ((s.life - s.age) / 40) * targetOp;
      } else {
        s.opacity = targetOp + Math.sin(s.age * 0.15) * 0.04;
      }

      s.opacity = clamp(s.opacity, 0, 1);
      return s.age < s.life && s.y > -10;
    },

    _drawPetal: function (p) {
      var offscreen = OFFSCREEN_PETAL_CACHE[p.shapeIndex];
      if (!offscreen) return;

      var ctx = this.ctx;
      var dpr = this.dpr;

      ctx.save();
      ctx.globalAlpha = p.opacity;

      ctx.translate(p.x * dpr, p.y * dpr);
      ctx.rotate(p.rotation);

      var scaleX = Math.cos(p.tilt);
      ctx.scale(scaleX, 1);

      var drawSize = p.size * dpr;
      ctx.drawImage(offscreen, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    },

    _drawSparkle: function (s) {
      var ctx = this.ctx;
      var dpr = this.dpr;

      ctx.save();
      ctx.fillStyle = s.color + s.opacity.toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(s.x * dpr, s.y * dpr, s.r * dpr, 0, Math.PI * 2);
      ctx.fill();

      // Subtle 4-ray cross sparkle
      if (s.r > 2.0) {
        ctx.strokeStyle = s.color + (s.opacity * 0.45).toFixed(2) + ')';
        ctx.lineWidth   = 0.6 * dpr;
        var ray = s.r * 1.8 * dpr;
        ctx.beginPath();
        ctx.moveTo(s.x * dpr - ray, s.y * dpr);
        ctx.lineTo(s.x * dpr + ray, s.y * dpr);
        ctx.moveTo(s.x * dpr, s.y * dpr - ray);
        ctx.lineTo(s.x * dpr, s.y * dpr + ray);
        ctx.stroke();
      }
      ctx.restore();
    },

    _loop: function (timestamp) {
      if (!this.active || this.paused) {
        this.rafId = null;
        return;
      }

      this.frameCount++;
      if (timestamp - this.lastFpsCheck >= 1000) {
        this.currentFps   = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsCheck));
        this.frameCount   = 0;
        this.lastFpsCheck = timestamp;
      }

      // Update atmosphere interpolation & wind
      SceneController.update();
      var totalWind = WindSystem.update(SceneController.liveWind);

      var ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Update & cull petals
      var self = this;
      this.petals = this.petals.filter(function (p) {
        return self._updatePetal(p, totalWind);
      });

      // Update & cull sparkles
      this.sparkles = this.sparkles.filter(function (s) {
        return self._updateSparkle(s);
      });

      // ── DEPTH RENDER PASS ──
      // 1. Far petals (depth < 0.4)
      this.petals.forEach(function (p) {
        if (p.depth < 0.4) self._drawPetal(p);
      });

      // 2. Ambient sparkles (midground atmosphere layer)
      this.sparkles.forEach(function (s) {
        self._drawSparkle(s);
      });

      // 3. Midground petals (depth 0.4 - 0.7)
      this.petals.forEach(function (p) {
        if (p.depth >= 0.4 && p.depth < 0.7) self._drawPetal(p);
      });

      // 4. Foreground petals (depth >= 0.7)
      this.petals.forEach(function (p) {
        if (p.depth >= 0.7) self._drawPetal(p);
      });

      this.rafId = requestAnimationFrame(this._loop);
    },

    getStats: function () {
      return {
        active:        this.active,
        paused:        this.paused,
        scene:         SceneController.currentScene,
        petalCount:    this.petals.length,
        sparkleCount:  this.sparkles.length,
        maxPetals:     this.profile.maxPetals,
        fps:           this.currentFps,
        dpr:           this.dpr,
        profile:       window.innerWidth < 768 ? 'mobile' : 'desktop',
        canvasSize:    (this.canvas ? this.canvas.width + 'x' + this.canvas.height : '0x0'),
      };
    }
  };

  /* ─────────────────────────────────────────
     GLOBAL INSTANCE & PUBLIC API
  ───────────────────────────────────────── */
  var engine = new CanvasPetalEngine();

  global.InvitationFX = {
    init:       function () { return engine.init(); },
    start:      function () { engine.start(); },
    stop:       function () { engine.stop(); },
    resize:     function () { engine.resize(); },
    destroy:    function () { engine.destroy(); },
    getStats:   function () { return engine.getStats(); },
    setScene:   function (name) { SceneController.setScene(name); },
  };

  global.startRosePetals = function () {
    if (isReducedMotion()) return;
    if (window.__rosePetalsStarted) return;
    window.__rosePetalsStarted = true;
    engine.start();
  };

})(window);
