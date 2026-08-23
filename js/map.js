/**
 * map.js — Invitation Map & Directions Controller
 * ─────────────────────────────────────────────────────────────
 * Synchronizes with KnockConfig to render interactive Google Maps,
 * address copying, and direct navigation links.
 * ─────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  var DEFAULT_COORDS = '17.4908348,78.6127061';
  var DEFAULT_ADDRESS = 'FJR7+842, East Gandhi Nagar, Aravind Nagar, Nagaram, Secunderabad, Telangana 500083';
  var BROADCAST_CHANNEL_NAME = 'knock_invitation_channel';

  var mapContainer = null;
  var addressText = null;
  var directionsBtn = null;
  var copyAddressBtn = null;

  /**
   * Generates a reliable, universal Google Maps embed URL
   */
  function getEmbedUrl(config) {
    if (config.mapEmbedUrl && config.mapEmbedUrl.trim()) {
      var customUrl = config.mapEmbedUrl.trim();
      // If user pasted an entire <iframe> code, extract src
      var match = customUrl.match(/src=["']([^"']+)["']/i);
      if (match && match[1]) return match[1];
      return customUrl;
    }

    var addr = (config.venueAddress || DEFAULT_ADDRESS).replace(/\n/g, ', ');
    if (addr.indexOf('FJR7') !== -1 || addr.indexOf('Secunderabad') !== -1 || addr.indexOf('Nagaram') !== -1) {
      return 'https://maps.google.com/maps?q=17.4908348,78.6127061&t=&z=17&ie=UTF8&iwloc=&output=embed';
    }

    return 'https://maps.google.com/maps?q=' + encodeURIComponent(addr) + '&t=&z=16&ie=UTF8&iwloc=&output=embed';
  }

  /**
   * Generates the Google Maps direct navigation link
   */
  function getDirectionsUrl(config) {
    if (config.mapDirectionsUrl && config.mapDirectionsUrl.trim()) {
      return config.mapDirectionsUrl.trim();
    }
    return 'https://www.google.com/maps/place/17.4908348,78.6127061/@17.4908348,78.6127061,18z';
  }

  /**
   * Renders the map iframe and connects directions & address UI
   */
  function renderMap() {
    if (!mapContainer) mapContainer = document.getElementById('map-container');
    if (!addressText) addressText = document.getElementById('address-text');
    if (!directionsBtn) directionsBtn = document.getElementById('get-directions-btn');
    if (!copyAddressBtn) copyAddressBtn = document.getElementById('copy-address-btn');

    if (!mapContainer) return;

    var config = window.KnockConfig ? window.KnockConfig.get() : {};
    var currentAddress = config.venueAddress || DEFAULT_ADDRESS;

    // 1. Update Address Text
    if (addressText) {
      addressText.innerHTML = currentAddress.replace(/\n/g, '<br/>');
    }

    // 2. Render Map Iframe
    var embedUrl = getEmbedUrl(config);

    // Check if iframe already exists with same src
    var existingIframe = mapContainer.querySelector('iframe');
    if (existingIframe && existingIframe.getAttribute('data-embed-src') === embedUrl) {
      // Already rendered with current embed URL
      return;
    }

    // Clear container
    while (mapContainer.firstChild) {
      mapContainer.removeChild(mapContainer.firstChild);
    }

    var iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.setAttribute('data-embed-src', embedUrl);
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.title = 'Location Map — ' + (config.familyName || 'Vanukuri Family');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

    mapContainer.setAttribute('data-map-provider', 'embed');
    mapContainer.appendChild(iframe);
  }

  /**
   * Clipboard Copy handler for venue address
   */
  function initAddressCopy() {
    if (!copyAddressBtn) copyAddressBtn = document.getElementById('copy-address-btn');
    if (!copyAddressBtn) return;

    copyAddressBtn.addEventListener('click', function () {
      var config = window.KnockConfig ? window.KnockConfig.get() : {};
      var addr = (config.venueAddress || DEFAULT_ADDRESS).replace(/<br\s*[\/]?>/gi, '\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function () {
          showCopySuccess();
        }).catch(function () {
          fallbackCopy(addr);
        });
      } else {
        fallbackCopy(addr);
      }
    });

    function showCopySuccess() {
      var iconDef = copyAddressBtn.querySelector('.copy-icon-default');
      var iconDone = copyAddressBtn.querySelector('.copy-icon-done');
      if (iconDef) iconDef.style.display = 'none';
      if (iconDone) iconDone.style.display = 'inline';

      setTimeout(function () {
        if (iconDef) iconDef.style.display = 'inline';
        if (iconDone) iconDone.style.display = 'none';
      }, 2200);
    }

    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showCopySuccess();
      } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /**
   * Directions button navigation handler
   */
  function initDirectionsButton() {
    if (!directionsBtn) directionsBtn = document.getElementById('get-directions-btn');
    if (!directionsBtn) return;

    directionsBtn.addEventListener('click', function () {
      var config = window.KnockConfig ? window.KnockConfig.get() : {};
      var url = getDirectionsUrl(config);

      // Track analytics location click
      if (window.KnockAnalytics && typeof window.KnockAnalytics.trackLocationClick === 'function') {
        window.KnockAnalytics.trackLocationClick();
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  function init() {
    mapContainer = document.getElementById('map-container');
    addressText = document.getElementById('address-text');
    directionsBtn = document.getElementById('get-directions-btn');
    copyAddressBtn = document.getElementById('copy-address-btn');

    renderMap();
    initAddressCopy();
    initDirectionsButton();

    // Hook into KnockConfig live updates
    if (window.KnockConfig) {
      window.KnockConfig.onUpdate(function () {
        renderMap();
      });
    }

    // BroadcastChannel sync
    try {
      if ('BroadcastChannel' in window) {
        var channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.onmessage = function (e) {
          if (e.data && e.data.type === 'CONFIG_UPDATED') {
            renderMap();
          }
        };
      }
    } catch (err) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.InvitationMap = {
    renderMap: renderMap
  };

})(window);
