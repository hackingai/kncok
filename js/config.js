/**
 * config.js — Knock Portal Configuration & State Manager
 * ─────────────────────────────────────────────────────────────
 * Manages event details, timer state, and syncs live across tabs
 * via LocalStorage and BroadcastChannel (plus optional Firebase).
 * ─────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  var STORAGE_KEY = 'knock_invitation_config_v1';
  var BROADCAST_CHANNEL_NAME = 'knock_invitation_channel';

  var DEFAULT_CONFIG = {
    title: 'Vanukuri Veena Damodar Reddy Housewarming Ceremony',
    ceremonyName: 'Housewarming Ceremony',
    familyName: 'Vanukuri Veena Damodar Reddy',
    familyShort: 'Vanukuri Veena Damodar Reddy',
    dateDisplay: '31 August 2026',
    dateDay: '31 August',
    dateYearSub: '2026 · Monday',
    timeDisplay: '3:00 AM',
    timeSub: 'Monday Early Morning',
    // Target datetime in IST (UTC+5:30) for accurate countdown
    targetIso: '2026-08-31T03:00:00+05:30',
    // Timer toggle (Active = true, Hidden = false)
    timerActive: true,
    timerHeading: 'Auspicious Muhurtham In',
    // Event Photos toggle and Google Photos album link
    galleryActive: false,
    galleryHeading: 'Event Moments & Photos',
    galleryAlbumUrl: '', // Google Photos / Drive album link
    venueName: 'Vanukuri Residence',
    venueAddress: 'FJR7+842, East Gandhi Nagar, Aravind Nagar, Nagaram, Secunderabad, Telangana 500083',
    mapEmbedUrl: '',
    mapDirectionsUrl: 'https://www.google.com/maps/place/17.4908348,78.6127061/@17.4908348,78.6127061,18z',
    invitationNote: 'We cordially invite you and your family to grace the auspicious occasion of our Housewarming Ceremony and bless our new home with your presence and warm wishes.',
    adminName: 'Admin',
    adminPass: '3251', // Default master password (can be customized in /knock)
    firebaseConfig: null // Optional cloud config
  };

  var listeners = [];
  var channel = null;

  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = function (e) {
        if (e.data && e.data.type === 'CONFIG_UPDATED') {
          notifyListeners(e.data.payload);
        }
      };
    }
  } catch (err) {
    console.warn('BroadcastChannel not available:', err);
  }

  function get() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        // Automatic migration if old cached Ananthapur address exists
        var needsUpdate = false;
        if (parsed.venueAddress && parsed.venueAddress.indexOf('Ananthapur') !== -1) {
          parsed.venueAddress = DEFAULT_CONFIG.venueAddress;
          needsUpdate = true;
        }
        if (parsed.familyName && parsed.familyName.indexOf('Family') !== -1) {
          parsed.familyName = DEFAULT_CONFIG.familyName;
          parsed.familyShort = DEFAULT_CONFIG.familyShort;
          parsed.title = DEFAULT_CONFIG.title;
          needsUpdate = true;
        }
        if (needsUpdate) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, DEFAULT_CONFIG, parsed)));
        }
        return Object.assign({}, DEFAULT_CONFIG, parsed);
      }
    } catch (e) {
      console.warn('Could not read KnockConfig from localStorage:', e);
    }
    return Object.assign({}, DEFAULT_CONFIG);
  }

  function save(newConfig) {
    var merged = Object.assign({}, get(), newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('Could not save KnockConfig to localStorage:', e);
    }

    notifyListeners(merged);

    if (channel) {
      try {
        channel.postMessage({ type: 'CONFIG_UPDATED', payload: merged });
      } catch (e) { }
    }

    return merged;
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { }
    notifyListeners(DEFAULT_CONFIG);
    if (channel) {
      try {
        channel.postMessage({ type: 'CONFIG_UPDATED', payload: DEFAULT_CONFIG });
      } catch (e) { }
    }
    return Object.assign({}, DEFAULT_CONFIG);
  }

  function onUpdate(callback) {
    if (typeof callback === 'function') {
      listeners.push(callback);
    }
  }

  function notifyListeners(config) {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](config);
      } catch (err) {
        console.error('Error in config listener:', err);
      }
    }
  }

  window.KnockConfig = {
    get: get,
    save: save,
    reset: reset,
    onUpdate: onUpdate,
    defaults: DEFAULT_CONFIG
  };

})(window);
