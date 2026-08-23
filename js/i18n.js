/**
 * i18n.js — Bilingual Translation & Language Selector Engine
 * ─────────────────────────────────────────────────────────────
 * Powers seamless Telugu (తెలుగు) & English ceremonial translations,
 * first-visit language selection pop-up modal, and live switching.
 * ─────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  var STORAGE_KEY_LANG = 'knock_invitation_lang_v1';
  var STORAGE_KEY_PROMPTED = 'knock_invitation_prompted_v1';

  var DICTIONARY = {
    en: {
      metaDescription: 'You are invited to the Vanukuri Veena Damodar Reddy Housewarming Ceremony on 31 August 2026.',
      ogTitle: 'Vanukuri Veena Damodar Reddy — Housewarming Ceremony',
      pageTitle: 'Vanukuri Veena Damodar Reddy — Housewarming Ceremony',

      // Shloka
      shloka: '॥ श्री गणेशाय नमः ॥',

      // Opening Overlay
      openingEyebrow: 'You Are Invited',
      openingTitle: 'Housewarming<br />Ceremony',
      openingFamily: 'Vanukuri Veena Damodar Reddy',
      openingDate: '31 August 2026',
      openingTime: '3:00 AM',
      openingHint: 'scroll to explore',

      // Hero Section
      heroEyebrow: 'You Are Invited',
      heroTitleScript: 'Housewarming',
      heroTitleMain: 'Ceremony',
      heroFamily: 'Vanukuri Veena Damodar Reddy',
      heroDatePill: '31 August 2026',
      heroTimePill: '3:00 AM',

      // House Photo Frame
      photoCaption: 'A new chapter begins here',
      photoAlt: 'The Vanukuri Veena Damodar Reddy home',

      // Welcome Section
      welcomeLine1: 'A new home, a new beginning,',
      welcomeLine2: 'and a beautiful moment to celebrate.',
      welcomeSub: 'Your presence will make this special occasion<br />even more memorable.',

      // The Day (Details Cards)
      detailsLabel: 'The Day',
      cardDateLabel: 'Date',
      cardDateVal: '31 August',
      cardDateSub: '2026 · Monday',
      cardTimeLabel: 'Time',
      cardTimeVal: '3:00 AM',
      cardTimeSub: 'Monday Early Morning',
      cardGalleryLabel: 'Event Moments',
      cardGalleryVal: 'Photos & Videos',
      cardGallerySub: 'Tap to View ➔',

      // Add to Calendar
      calendarBtn: 'Add to Calendar',
      calendarAria: 'Add Vanukuri Veena Damodar Reddy Housewarming Ceremony to your calendar',
      calGoogle: 'Google Calendar',
      calApple: 'Apple Calendar',
      calOutlook: 'Outlook Calendar',
      calYahoo: 'Yahoo Calendar',

      // Countdown Timer
      timerHeading: 'Auspicious Muhurtham In',
      timerDays: 'Days',
      timerHours: 'Hours',
      timerMins: 'Mins',
      timerSecs: 'Secs',
      timerCompleteTitle: 'The Auspicious Moment Is Here!',
      timerCompleteSub: 'Welcome to our new home celebration',

      // Location / Map
      mapLabel: 'Find Our Home',
      mapTitle: 'Location',
      mapWelcome: 'We would love to welcome you.',
      mapComingSoonTitle: 'Coming Soon',
      mapComingSoonSub: 'Directions will be shared<br />closer to the event',
      addressLabel: 'Address',
      addressCopyTitle: 'Copy address',
      addressCopyAria: 'Copy address to clipboard',
      addressCopied: 'Address copied!',
      directionsBtn: 'Get Directions',
      directionsAria: 'Get directions to the Vanukuri Veena Damodar Reddy home',
      directionsNote: 'Directions will be shared closer to the event',

      // Closing Section
      closingLine1: 'We look forward to',
      closingLine2: 'celebrating with you',
      closingThankYou: 'Thank you for being a part of our new beginning.',
      closingFamily: 'Vanukuri Veena Damodar Reddy',
      closingDate: '31 August 2026',

      // Floating Controls & Misc
      fabLabel: 'Location',
      fabTitle: 'Find our home',
      pillLabel: 'తెలుగు'
    },

    te: {
      metaDescription: '31 ఆగస్టు 2026 న జరుగు వనుకూరు వీణ దామోదర్ రెడ్డి గారి నూతన గృహప్రవేశ మహోత్సవానికి సాదర ఆహ్వానం.',
      ogTitle: 'వనుకూరు వీణ దామోదర్ రెడ్డి — గృహప్రవేశ మహోత్సవం',
      pageTitle: 'వనుకూరు వీణ దామోదర్ రెడ్డి — గృహప్రవేశ మహోత్సవం',

      // Shloka
      shloka: '॥ శ్రీ గణేశాయ నమః ॥',

      // Opening Overlay
      openingEyebrow: 'మీకు సాదర ఆహ్వానం',
      openingTitle: 'గృహప్రవేశ<br />మహోత్సవం',
      openingFamily: 'వనుకూరు వీణ దామోదర్ రెడ్డి',
      openingDate: '31 ఆగస్టు 2026',
      openingTime: 'ఉదయం 3:00 గంటలకు',
      openingHint: 'ఆహ్వానాన్ని వీక్షించండి',

      // Hero Section
      heroEyebrow: 'మీకు సాదర ఆహ్వానం',
      heroTitleScript: 'గృహప్రవేశ',
      heroTitleMain: 'మహోత్సవం',
      heroFamily: 'వనుకూరు వీణ దామోదర్ రెడ్డి',
      heroDatePill: '31 ఆగస్టు 2026',
      heroTimePill: 'ఉదయం 3:00 గంటలకు',

      // House Photo Frame
      photoCaption: 'నూతన గృహం · నూతన అధ్యాయం',
      photoAlt: 'వనుకూరు వీణ దామోదర్ రెడ్డి గారి నూతన గృహం',

      // Welcome Section
      welcomeLine1: 'నూతన గృహం, నూతన ఆరంభం,',
      welcomeLine2: 'ఆత్మీయులందరితో కలసి జరుపుకునే శుభ సందర్భం.',
      welcomeSub: 'మా ఈ శుభ దినాన మీరు విచ్చేసి,<br />మీ దివ్య ఆశీస్సులను అందించవలసిందిగా ప్రార్థన.',

      // The Day (Details Cards)
      detailsLabel: 'శుభ ముహూర్తం & వివరాలు',
      cardDateLabel: 'తేదీ',
      cardDateVal: '31 ఆగస్టు',
      cardDateSub: '2026 · సోమవారం',
      cardTimeLabel: 'ముహూర్తం',
      cardTimeVal: 'ఉదయం 3:00',
      cardTimeSub: 'సోమవారం తెల్లవారుజామున',
      cardGalleryLabel: 'వేడుక క్షణాలు',
      cardGalleryVal: 'చిత్రాలు & వీడియోలు',
      cardGallerySub: 'వీక్షించడానికి నొక్కండి ➔',

      // Add to Calendar
      calendarBtn: 'క్యాలెండర్‌కు జోడించండి',
      calendarAria: 'వనుకూరు వీణ దామోదర్ రెడ్డి గృహప్రవేశ మహోత్సవాన్ని మీ క్యాలెండర్‌కు జోడించండి',
      calGoogle: 'గూగుల్ క్యాలెండర్ (Google)',
      calApple: 'ఆపిల్ క్యాలెండర్ (Apple)',
      calOutlook: 'అవుట్‌లుక్ (Outlook)',
      calYahoo: 'యాహూ క్యాలెండర్ (Yahoo)',

      // Countdown Timer
      timerHeading: 'శుభ ముహూర్తానికి సమయం',
      timerDays: 'రోజులు',
      timerHours: 'గంటలు',
      timerMins: 'నిమిషాలు',
      timerSecs: 'సెకన్లు',
      timerCompleteTitle: 'శుభ ముహూర్త సమయం ఆసన్నమైనది!',
      timerCompleteSub: 'మా నూతన గృహ వేడుకకు సాదర స్వాగతం',

      // Location / Map
      mapLabel: 'మా నివాసానికి దారి',
      mapTitle: 'వేదిక & చిరునామా',
      mapWelcome: 'మిమ్మల్ని మరియు మీ కుటుంబాన్ని సాదరంగా ఆహ్వానిస్తున్నాము.',
      mapComingSoonTitle: 'త్వరలో అందుబాటులోకి వస్తుంది',
      mapComingSoonSub: 'వేడుకకు ముందు మార్గదర్శకాలు పంపబడతాయి',
      addressLabel: 'చిరునామా',
      addressCopyTitle: 'చిరునామా కాపీ చేయండి',
      addressCopyAria: 'చిరునామాను క్లిప్‌బోర్డ్‌కు కాపీ చేయండి',
      addressCopied: 'చిరునామా కాపీ చేయబడింది!',
      directionsBtn: 'గూగుల్ మ్యాప్స్ దారి (Directions)',
      directionsAria: 'వనుకూరు వీణ దామోదర్ రెడ్డి గారి నివాసానికి దారి చూడండి',
      directionsNote: 'వేడుకకు ముందు మార్గదర్శకాలు పంపబడతాయి',

      // Closing Section
      closingLine1: 'మీ రాక కోసం',
      closingLine2: 'ఆనందంగా వేచి చూస్తున్నాము',
      closingThankYou: 'మా నూతన ప్రారంభంలో భాగస్వామ్యమైనందుకు హృదయపూర్వక ధన్యవాదాలు.',
      closingFamily: 'వనుకూరు వీణ దామోదర్ రెడ్డి',
      closingDate: '31 ఆగస్టు 2026',

      // Floating Controls & Misc
      fabLabel: 'లొకేషన్',
      fabTitle: 'మా నివాసానికి దారి',
      pillLabel: 'English'
    }
  };

  var currentLang = 'en';
  var isModalOpen = false;

  function getStoredLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY_LANG);
      if (saved === 'te' || saved === 'en') return saved;
    } catch (e) { }
    var config = window.KnockConfig ? window.KnockConfig.get() : {};
    return config.defaultLang === 'te' ? 'te' : 'en';
  }

  function setStoredLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch (e) { }
  }

  function hasBeenPrompted() {
    try {
      return sessionStorage.getItem(STORAGE_KEY_PROMPTED) === 'true';
    } catch (e) {
      return false;
    }
  }

  function setHasBeenPrompted(val) {
    try {
      if (val) sessionStorage.setItem(STORAGE_KEY_PROMPTED, 'true');
      else sessionStorage.removeItem(STORAGE_KEY_PROMPTED);
    } catch (e) { }
  }

  /**
   * Applies translations to all DOM elements across the page
   */
  function applyTranslations(lang) {
    if (!DICTIONARY[lang]) lang = 'en';
    currentLang = lang;
    var t = DICTIONARY[lang];

    document.documentElement.lang = lang;
    if (lang === 'te') {
      document.body.classList.add('lang-te');
      document.body.classList.remove('lang-en');
    } else {
      document.body.classList.add('lang-en');
      document.body.classList.remove('lang-te');
    }

    // Page title and meta
    document.title = t.pageTitle;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t.metaDescription);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', t.ogTitle);
    var twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', t.ogTitle);

    // Opening Shloka & Top Borders
    document.querySelectorAll('.opening-shloka, .ganesha-caption').forEach(function (el) {
      el.textContent = t.shloka;
    });

    // Opening overlay
    var openEyebrow = document.querySelector('.opening-eyebrow');
    if (openEyebrow) openEyebrow.textContent = t.openingEyebrow;
    var openTitle = document.querySelector('.opening-title');
    if (openTitle) openTitle.innerHTML = t.openingTitle;
    var openFamily = document.querySelector('.opening-family');
    if (openFamily) openFamily.textContent = t.openingFamily;
    var openDate = document.querySelector('.opening-date');
    if (openDate) openDate.textContent = t.openingDate;
    var openTime = document.querySelector('.opening-time');
    if (openTime) openTime.textContent = t.openingTime;
    var openHint = document.querySelector('.opening-hint');
    if (openHint) openHint.textContent = t.openingHint;

    // Hero section
    var heroEyebrow = document.querySelector('.hero-eyebrow .eyebrow-text');
    if (heroEyebrow) heroEyebrow.textContent = t.heroEyebrow;
    var heroTitleScript = document.querySelector('.hero-title-script');
    if (heroTitleScript) heroTitleScript.textContent = t.heroTitleScript;
    var heroTitleMain = document.querySelector('.hero-title-main');
    if (heroTitleMain) heroTitleMain.textContent = t.heroTitleMain;
    var heroFamily = document.querySelector('.hero-family');
    if (heroFamily) heroFamily.textContent = t.heroFamily;
    var heroPills = document.querySelectorAll('.hero-event-details .detail-pill span:last-child');
    if (heroPills.length >= 2) {
      heroPills[0].textContent = t.heroDatePill;
      heroPills[1].textContent = t.heroTimePill;
    }

    // Photo Caption
    var photoCap = document.querySelector('.house-photo-caption');
    if (photoCap) photoCap.textContent = t.photoCaption;
    var photoImg = document.getElementById('house-photo');
    if (photoImg) photoImg.setAttribute('alt', t.photoAlt);

    // Welcome message
    var wLine1 = document.querySelector('[data-story="welcome-line-1"]');
    if (wLine1) wLine1.textContent = t.welcomeLine1;
    var wLine2 = document.querySelector('[data-story="welcome-line-2"]');
    if (wLine2) wLine2.textContent = t.welcomeLine2;
    var wSub = document.querySelector('[data-story="welcome-sub"]');
    if (wSub) wSub.innerHTML = t.welcomeSub;

    // Details Cards ("The Day")
    var detailsLabel = document.querySelector('[data-story="details-label"]');
    if (detailsLabel) detailsLabel.textContent = t.detailsLabel;

    var dateCardLabel = document.querySelector('[data-story="card-date"] .detail-card-label');
    if (dateCardLabel) dateCardLabel.textContent = t.cardDateLabel;
    var dateCardVal = document.querySelector('[data-story="card-date"] .detail-card-value');
    if (dateCardVal) dateCardVal.textContent = t.cardDateVal;
    var dateCardSub = document.querySelector('[data-story="card-date"] .detail-card-sub');
    if (dateCardSub) dateCardSub.textContent = t.cardDateSub;

    var timeCardLabel = document.querySelector('[data-story="card-time"] .detail-card-label');
    if (timeCardLabel) timeCardLabel.textContent = t.cardTimeLabel;
    var timeCardVal = document.querySelector('[data-story="card-time"] .detail-card-value');
    if (timeCardVal) timeCardVal.textContent = t.cardTimeVal;
    var timeCardSub = document.querySelector('[data-story="card-time"] .detail-card-sub');
    if (timeCardSub) timeCardSub.textContent = t.cardTimeSub;

    var galleryCardLabel = document.querySelector('[data-story="card-gallery"] .detail-card-label');
    if (galleryCardLabel) galleryCardLabel.textContent = t.cardGalleryLabel;
    var galleryCardVal = document.getElementById('gallery-card-val');
    if (galleryCardVal) galleryCardVal.textContent = t.cardGalleryVal;
    var galleryCardSub = document.getElementById('gallery-card-sub');
    if (galleryCardSub) galleryCardSub.textContent = t.cardGallerySub;

    // Add to calendar CTA
    var calBtn = document.getElementById('add-to-calendar-btn');
    if (calBtn) {
      var icon = calBtn.querySelector('.btn-icon');
      calBtn.innerHTML = '';
      if (icon) calBtn.appendChild(icon);
      calBtn.appendChild(document.createTextNode(' ' + t.calendarBtn));
      calBtn.setAttribute('aria-label', t.calendarAria);
    }
    var calOptGoogle = document.querySelector('[data-calendar="google"]');
    if (calOptGoogle) {
      var gIcon = calOptGoogle.querySelector('.calendar-option-icon');
      calOptGoogle.innerHTML = '';
      if (gIcon) calOptGoogle.appendChild(gIcon);
      calOptGoogle.appendChild(document.createTextNode(' ' + t.calGoogle));
    }
    var calOptApple = document.querySelector('[data-calendar="apple"]');
    if (calOptApple) {
      var aIcon = calOptApple.querySelector('.calendar-option-icon');
      calOptApple.innerHTML = '';
      if (aIcon) calOptApple.appendChild(aIcon);
      calOptApple.appendChild(document.createTextNode(' ' + t.calApple));
    }
    var calOptOutlook = document.querySelector('[data-calendar="outlook"]');
    if (calOptOutlook) {
      var oIcon = calOptOutlook.querySelector('.calendar-option-icon');
      calOptOutlook.innerHTML = '';
      if (oIcon) calOptOutlook.appendChild(oIcon);
      calOptOutlook.appendChild(document.createTextNode(' ' + t.calOutlook));
    }
    var calOptYahoo = document.querySelector('[data-calendar="yahoo"]');
    if (calOptYahoo) {
      var yIcon = calOptYahoo.querySelector('.calendar-option-icon');
      calOptYahoo.innerHTML = '';
      if (yIcon) calOptYahoo.appendChild(yIcon);
      calOptYahoo.appendChild(document.createTextNode(' ' + t.calYahoo));
    }

    // Countdown Timer
    var timerHeading = document.getElementById('timer-heading');
    if (timerHeading) timerHeading.textContent = t.timerHeading;
    var timerLabels = document.querySelectorAll('#countdown-clock .countdown-label');
    if (timerLabels.length >= 4) {
      timerLabels[0].textContent = t.timerDays;
      timerLabels[1].textContent = t.timerHours;
      timerLabels[2].textContent = t.timerMins;
      timerLabels[3].textContent = t.timerSecs;
    }
    var compTitle = document.querySelector('.countdown-complete-title');
    if (compTitle) compTitle.textContent = t.timerCompleteTitle;
    var compSub = document.querySelector('.countdown-complete-sub');
    if (compSub) compSub.textContent = t.timerCompleteSub;

    // Location Section
    var mapLabel = document.querySelector('[data-story="map-label"]');
    if (mapLabel) mapLabel.textContent = t.mapLabel;
    var mapTitle = document.querySelector('[data-story="map-title"]');
    if (mapTitle) mapTitle.textContent = t.mapTitle;
    var mapWelcome = document.querySelector('[data-story="map-welcome"]');
    if (mapWelcome) mapWelcome.textContent = t.mapWelcome;
    var mapComingTitle = document.querySelector('.map-placeholder-title');
    if (mapComingTitle) mapComingTitle.textContent = t.mapComingSoonTitle;
    var mapComingSub = document.querySelector('.map-placeholder-sub');
    if (mapComingSub) mapComingSub.innerHTML = t.mapComingSoonSub;

    var addrLabel = document.querySelector('.address-copy-label');
    if (addrLabel) {
      var addrSvg = addrLabel.querySelector('svg');
      addrLabel.innerHTML = '';
      if (addrSvg) addrLabel.appendChild(addrSvg);
      addrLabel.appendChild(document.createTextNode(' ' + t.addressLabel));
    }
    var copyBtn = document.getElementById('copy-address-btn');
    if (copyBtn) {
      copyBtn.setAttribute('title', t.addressCopyTitle);
      copyBtn.setAttribute('aria-label', t.addressCopyAria);
    }
    var dirBtn = document.getElementById('get-directions-btn');
    if (dirBtn) {
      var dirIcon = dirBtn.querySelector('.btn-icon');
      dirBtn.innerHTML = '';
      if (dirIcon) dirBtn.appendChild(dirIcon);
      dirBtn.appendChild(document.createTextNode(' ' + t.directionsBtn));
      dirBtn.setAttribute('aria-label', t.directionsAria);
    }
    var dirNote = document.getElementById('directions-note');
    if (dirNote) dirNote.textContent = t.directionsNote;

    // Closing Section
    var cLine1 = document.querySelector('[data-story="closing-line-1"]');
    if (cLine1) cLine1.textContent = t.closingLine1;
    var cLine2 = document.querySelector('[data-story="closing-line-2"]');
    if (cLine2) cLine2.textContent = t.closingLine2;
    var cThank = document.querySelector('[data-story="closing-thankyou"]');
    if (cThank) cThank.textContent = t.closingThankYou;
    var cFamily = document.querySelector('[data-story="closing-family"]');
    if (cFamily) cFamily.textContent = t.closingFamily;
    var cDate = document.querySelector('[data-story="closing-date"]');
    if (cDate) cDate.textContent = t.closingDate;

    // Floating Button & Pill
    var fabLabel = document.querySelector('.fab-location .fab-label');
    if (fabLabel) fabLabel.textContent = t.fabLabel;
    var fabBtn = document.querySelector('.fab-location');
    if (fabBtn) fabBtn.setAttribute('title', t.fabTitle);

    var pillText = document.getElementById('lang-pill-text');
    if (pillText) {
      pillText.textContent = lang === 'te' ? 'EN' : 'తెలుగు';
    }

    // Dispatch event so other modules can react
    try {
      window.dispatchEvent(new CustomEvent('knock_lang_changed', { detail: { lang: lang } }));
    } catch (e) { }
  }

  function setLanguage(lang, persist) {
    if (lang !== 'te' && lang !== 'en') lang = 'en';
    if (persist !== false) setStoredLang(lang);
    applyTranslations(lang);
  }

  function toggleLanguage() {
    var next = currentLang === 'te' ? 'en' : 'te';
    setLanguage(next, true);
  }

  /* ══════════════════════════════════════════════
     POP-UP MODAL CONTROLLER
  ═══════════════════════════════════════════════ */
  function openPrompt() {
    var modal = document.getElementById('lang-modal');
    if (!modal) return;
    isModalOpen = true;
    modal.style.display = 'flex';
    requestAnimationFrame(function () {
      modal.classList.add('is-visible');
    });
  }

  function closePrompt() {
    var modal = document.getElementById('lang-modal');
    if (!modal) return;
    isModalOpen = false;
    modal.classList.remove('is-visible');
    setTimeout(function () {
      modal.style.display = 'none';
    }, 400);
  }

  function initModalEvents() {
    var modal = document.getElementById('lang-modal');
    if (!modal) return;

    var btnTe = document.getElementById('btn-lang-te');
    var btnEn = document.getElementById('btn-lang-en');

    function selectLang(lang) {
      setLanguage(lang, true);
      setHasBeenPrompted(true);
      closePrompt();

      // If opening overlay is present and waiting, dismiss on language pick
      var overlay = document.getElementById('opening-overlay');
      if (overlay && !overlay.classList.contains('is-hiding')) {
        // Let user experience the ceremonial opening in their chosen language
      }
    }

    if (btnTe) {
      btnTe.addEventListener('click', function () { selectLang('te'); });
    }
    if (btnEn) {
      btnEn.addEventListener('click', function () { selectLang('en'); });
    }

    // Floating language switcher pill
    var pill = document.getElementById('lang-switch-pill');
    if (pill) {
      pill.addEventListener('click', function () {
        toggleLanguage();
      });
    }
  }

  function init() {
    initModalEvents();

    var config = window.KnockConfig ? window.KnockConfig.get() : {
      langPromptActive: true,
      defaultLang: 'en',
      showLangSwitcher: true
    };

    var saved = getStoredLang();
    var hasPrompted = hasBeenPrompted();

    // Apply active language immediately
    applyTranslations(saved);

    // Sync floating switcher visibility
    var pill = document.getElementById('lang-switch-pill');
    if (pill) {
      pill.style.display = config.showLangSwitcher === false ? 'none' : 'flex';
    }

    // Show prompt if enabled by admin AND user hasn't chosen in this browser session
    if (config.langPromptActive !== false && !hasPrompted) {
      setTimeout(openPrompt, 200);
    }

    // Listen for live config updates from Admin portal
    if (window.KnockConfig && typeof window.KnockConfig.onUpdate === 'function') {
      window.KnockConfig.onUpdate(function (newConfig) {
        if (pill) {
          pill.style.display = newConfig.showLangSwitcher === false ? 'none' : 'flex';
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.KnockI18n = {
    getLang: function () { return currentLang; },
    setLang: setLanguage,
    toggleLang: toggleLanguage,
    openPrompt: openPrompt,
    closePrompt: closePrompt,
    applyTranslations: applyTranslations,
    dictionary: DICTIONARY,
    resetPromptHistory: function () {
      setHasBeenPrompted(false);
      try { localStorage.removeItem(STORAGE_KEY_LANG); } catch (e) { }
    }
  };

})(window);
