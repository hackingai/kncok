/**
 * gallery.js — Photos & Videos Gallery & Full-Screen Media Viewer
 * ─────────────────────────────────────────────────────────────
 * Powers the invitation card's two-step media experience:
 * 1. Gallery Grid: Responsive side-by-side view of all uploaded moments.
 * 2. Full-Screen Viewer: Minimal native-style dark viewer with Back,
 *    Download, Zoom In/Out, Close, keyboard & swipe navigation.
 * ─────────────────────────────────────────────────────────────
 */

(function (window) {
  'use strict';

  var GALLERY_STORAGE_KEY = 'knock_gallery_media_v1';
  var BROADCAST_CHANNEL_NAME = 'knock_invitation_channel';

  var currentMediaList = [];
  var currentIndex = 0;
  var currentZoom = 1.0;
  var ZOOM_LEVELS = [1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

  // Pan / Drag State
  var isPanning = false;
  var panStartX = 0;
  var panStartY = 0;
  var panOffsetX = 0;
  var panOffsetY = 0;

  // Touch Swipe State
  var touchStartX = 0;
  var touchStartY = 0;
  var touchStartTime = 0;

  // DOM References
  var invitationWrapper = null;
  var galleryDetailCard = null;
  var galleryDivider = null;
  var galleryCardVal = null;
  var galleryCardSub = null;

  var galleryGridModal = null;
  var galleryGridItems = null;
  var galleryGridCloseBtn = null;
  var galleryGridHeading = null;

  var fsViewer = null;
  var fsBackBtn = null;
  var fsDownloadBtn = null;
  var fsZoomOutBtn = null;
  var fsZoomInBtn = null;
  var fsCloseBtn = null;
  var fsViewport = null;
  var fsMediaWrap = null;

  /**
   * Retrieves uploaded media from localStorage or KnockConfig
   */
  function getMediaItems() {
    try {
      var raw = localStorage.getItem(GALLERY_STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}

    var config = window.KnockConfig ? window.KnockConfig.get() : {};
    return Array.isArray(config.galleryItems) ? config.galleryItems : [];
  }

  /**
   * Updates invitation card layout & visibility based on KnockConfig.galleryActive
   */
  function syncGalleryVisibility() {
    var config = window.KnockConfig ? window.KnockConfig.get() : { galleryActive: false };
    var isActive = config.galleryActive === true;
    var items = getMediaItems();

    if (!invitationWrapper) invitationWrapper = document.querySelector('.invitation-wrapper');
    if (!galleryDetailCard) galleryDetailCard = document.getElementById('gallery-detail-card');
    if (!galleryDivider) galleryDivider = document.getElementById('gallery-divider');
    if (!galleryCardVal) galleryCardVal = document.getElementById('gallery-card-val');
    if (!galleryCardSub) galleryCardSub = document.getElementById('gallery-card-sub');

    if (isActive) {
      // Auto-widen invitation card
      if (invitationWrapper) invitationWrapper.classList.add('has-gallery-active');
      if (galleryDetailCard) {
        galleryDetailCard.style.display = 'flex';
        galleryDetailCard.classList.remove('is-hidden');
      }
      if (galleryDivider) galleryDivider.style.display = 'flex';

      // Update card label with item count
      if (galleryCardVal) {
        galleryCardVal.textContent = items.length > 0 ? (items.length + ' Moments') : 'Photos & Videos';
      }
      if (galleryCardSub) {
        galleryCardSub.textContent = items.length > 0 ? 'Tap to View ➔' : 'Coming Soon';
      }
    } else {
      // Auto-adjust back to original size
      if (invitationWrapper) invitationWrapper.classList.remove('has-gallery-active');
      if (galleryDetailCard) {
        galleryDetailCard.style.display = 'none';
        galleryDetailCard.classList.add('is-hidden');
      }
      if (galleryDivider) galleryDivider.style.display = 'none';

      // Close open modals if turned off
      closeFullscreenViewer();
      closeGalleryGrid();
    }
  }

  /**
   * ════════════════════════════════════════════════════════════════
   * 1 · GALLERY GRID MODAL
   * ════════════════════════════════════════════════════════════════
   */
  function openGalleryGrid() {
    currentMediaList = getMediaItems();
    var config = window.KnockConfig ? window.KnockConfig.get() : {};

    if (!galleryGridModal) galleryGridModal = document.getElementById('gallery-grid-modal');
    if (!galleryGridItems) galleryGridItems = document.getElementById('gallery-grid-items');
    if (!galleryGridHeading) galleryGridHeading = document.getElementById('gallery-grid-heading');

    if (galleryGridHeading) {
      galleryGridHeading.textContent = config.galleryHeading || 'Event Moments & Photos';
    }

    renderGridItems();

    if (galleryGridModal) {
      galleryGridModal.classList.add('is-active');
      galleryGridModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('gallery-modal-open');
    }
  }

  function closeGalleryGrid() {
    if (galleryGridModal) {
      galleryGridModal.classList.remove('is-active');
      galleryGridModal.setAttribute('aria-hidden', 'true');
    }
    if (!fsViewer || !fsViewer.classList.contains('is-active')) {
      document.body.classList.remove('gallery-modal-open');
    }
  }

  function renderGridItems() {
    if (!galleryGridItems) return;

    if (currentMediaList.length === 0) {
      galleryGridItems.innerHTML = '<div class="gallery-empty-state">' +
        '<div class="gallery-empty-icon">🪔</div>' +
        '<h3 class="gallery-empty-title">Photos & Videos</h3>' +
        '<p class="gallery-empty-sub">Memories will appear here soon.</p>' +
        '</div>';
      return;
    }

    var html = '';
    currentMediaList.forEach(function (item, idx) {
      var isVideo = item.type === 'video';
      var playBadge = isVideo
        ? '<div class="gallery-card-play" aria-hidden="true"><span>▶</span></div>'
        : '';
      var mediaElem = isVideo
        ? '<video class="gallery-card-thumb" src="' + item.src + '" muted playsinline preload="metadata"></video>'
        : '<img class="gallery-card-thumb" src="' + item.src + '" alt="Event photo" loading="lazy" />';

      html += '<div class="gallery-card" data-idx="' + idx + '" role="button" tabindex="0" aria-label="Open media">' +
        '<div class="gallery-card-media">' +
        mediaElem +
        playBadge +
        '</div>' +
        '</div>';
    });

    galleryGridItems.innerHTML = html;

    // Attach click listeners to each grid card
    var cards = galleryGridItems.querySelectorAll('.gallery-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var idx = parseInt(card.getAttribute('data-idx'), 10);
        openFullscreenViewer(idx);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var idx = parseInt(card.getAttribute('data-idx'), 10);
          openFullscreenViewer(idx);
        }
      });
    });
  }

  /**
   * ════════════════════════════════════════════════════════════════
   * 2 · FULL-SCREEN MEDIA VIEWER
   * ════════════════════════════════════════════════════════════════
   */
  function openFullscreenViewer(index) {
    if (!currentMediaList || currentMediaList.length === 0) {
      currentMediaList = getMediaItems();
    }
    if (currentMediaList.length === 0) return;

    currentIndex = Math.max(0, Math.min(index, currentMediaList.length - 1));
    resetZoomAndPan();

    if (!fsViewer) fsViewer = document.getElementById('fullscreen-media-viewer');
    if (fsViewer) {
      fsViewer.classList.add('is-active');
      fsViewer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('gallery-modal-open');
    }

    renderFullscreenActiveMedia();
  }

  function closeFullscreenViewer() {
    if (fsViewer) {
      fsViewer.classList.remove('is-active');
      fsViewer.setAttribute('aria-hidden', 'true');
    }
    // Pause any active video
    if (fsMediaWrap) {
      var activeVid = fsMediaWrap.querySelector('video');
      if (activeVid && typeof activeVid.pause === 'function') {
        activeVid.pause();
      }
    }
    resetZoomAndPan();
    if (!galleryGridModal || !galleryGridModal.classList.contains('is-active')) {
      document.body.classList.remove('gallery-modal-open');
    }
  }

  /**
   * Returns from Fullscreen Viewer back to the Gallery Grid
   */
  function backToGalleryGrid() {
    closeFullscreenViewer();
    openGalleryGrid();
  }

  /**
   * Closes everything (Fullscreen & Grid) and returns to the invitation card
   */
  function closeAllToInvitation() {
    closeFullscreenViewer();
    closeGalleryGrid();
    document.body.classList.remove('gallery-modal-open');
  }

  function resetZoomAndPan() {
    currentZoom = 1.0;
    panOffsetX = 0;
    panOffsetY = 0;
    applyTransform();
  }

  function applyTransform() {
    if (!fsMediaWrap) fsMediaWrap = document.getElementById('fs-media-wrap');
    if (!fsMediaWrap) return;

    if (currentZoom <= 1.0) {
      panOffsetX = 0;
      panOffsetY = 0;
      fsMediaWrap.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';
      fsMediaWrap.style.cursor = 'default';
    } else {
      fsMediaWrap.style.transform = 'translate3d(' + panOffsetX + 'px, ' + panOffsetY + 'px, 0px) scale(' + currentZoom + ')';
      fsMediaWrap.style.cursor = isPanning ? 'grabbing' : 'grab';
    }
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
        return item.customName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      } else {
        var numStr = String(autoCounter);
        while (numStr.length < padLength) {
          numStr = '0' + numStr;
        }
        autoCounter++;
        return 'vvdh-' + numStr;
      }
    });
  }

  function renderFullscreenActiveMedia() {
    if (!fsMediaWrap) fsMediaWrap = document.getElementById('fs-media-wrap');
    if (!fsDownloadBtn) fsDownloadBtn = document.getElementById('fs-download-btn');
    if (!fsMediaWrap || currentMediaList.length === 0) return;

    var item = currentMediaList[currentIndex];
    if (!item) return;

    resetZoomAndPan();

    var isVideo = item.type === 'video';
    var mediaHtml = '';

    if (isVideo) {
      mediaHtml = '<video id="fs-active-video" class="fs-media-element" src="' + item.src + '" controls autoplay playsinline></video>';
    } else {
      mediaHtml = '<img id="fs-active-img" class="fs-media-element" src="' + item.src + '" alt="Event photo" draggable="false" />';
    }

    fsMediaWrap.innerHTML = mediaHtml;

    // Update download button with custom name or serial code filename
    if (fsDownloadBtn) {
      fsDownloadBtn.href = item.src;
      var fileExt = isVideo ? 'mp4' : 'jpg';
      var resolvedNames = resolveMediaNames(currentMediaList);
      var mediaName = resolvedNames[currentIndex] || ('vvdh-' + (currentIndex + 1));
      fsDownloadBtn.setAttribute('download', mediaName + '.' + fileExt);
    }
  }

  function navigateMedia(direction) {
    if (currentMediaList.length <= 1) return;

    if (direction === 'next') {
      currentIndex = (currentIndex + 1) % currentMediaList.length;
    } else if (direction === 'prev') {
      currentIndex = (currentIndex - 1 + currentMediaList.length) % currentMediaList.length;
    }
    renderFullscreenActiveMedia();
  }

  function handleZoom(delta) {
    var curIdx = ZOOM_LEVELS.indexOf(currentZoom);
    if (curIdx === -1) {
      curIdx = 0;
      for (var i = 0; i < ZOOM_LEVELS.length; i++) {
        if (currentZoom >= ZOOM_LEVELS[i]) curIdx = i;
      }
    }

    if (delta > 0 && curIdx < ZOOM_LEVELS.length - 1) {
      currentZoom = ZOOM_LEVELS[curIdx + 1];
    } else if (delta < 0 && curIdx > 0) {
      currentZoom = ZOOM_LEVELS[curIdx - 1];
    }
    applyTransform();
  }

  /**
   * ════════════════════════════════════════════════════════════════
   * 3 · KEYBOARD, TOUCH & PAN/DRAG LISTENERS
   * ════════════════════════════════════════════════════════════════
   */
  function initKeyboardControls() {
    window.addEventListener('keydown', function (e) {
      // If fullscreen viewer is open
      if (fsViewer && fsViewer.classList.contains('is-active')) {
        if (e.key === 'ArrowRight' || e.key === 'Right') {
          e.preventDefault();
          navigateMedia('next');
        } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
          e.preventDefault();
          navigateMedia('prev');
        } else if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault();
          closeAllToInvitation();
        } else if (e.key === '+' || e.key === '=' || e.key === 'Add') {
          e.preventDefault();
          handleZoom(1);
        } else if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
          e.preventDefault();
          handleZoom(-1);
        } else if (e.key === '0' || e.key === 'NumPad0') {
          e.preventDefault();
          resetZoomAndPan();
        }
      } else if (galleryGridModal && galleryGridModal.classList.contains('is-active')) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeGalleryGrid();
        }
      }
    });
  }

  function initPanAndTouchGestures() {
    if (!fsViewport) fsViewport = document.getElementById('fs-viewport');
    if (!fsViewport) return;

    // Mouse Pan Events (Active only when zoom > 1)
    fsViewport.addEventListener('mousedown', function (e) {
      if (currentZoom <= 1.0) return;
      isPanning = true;
      panStartX = e.clientX - panOffsetX;
      panStartY = e.clientY - panOffsetY;
      applyTransform();
    });

    window.addEventListener('mousemove', function (e) {
      if (!isPanning || currentZoom <= 1.0) return;
      e.preventDefault();
      panOffsetX = e.clientX - panStartX;
      panOffsetY = e.clientY - panStartY;
      applyTransform();
    });

    window.addEventListener('mouseup', function () {
      if (isPanning) {
        isPanning = false;
        applyTransform();
      }
    });

    // Double-click to toggle zoom between 100% and 200%
    fsViewport.addEventListener('dblclick', function (e) {
      e.preventDefault();
      if (currentZoom === 1.0) {
        currentZoom = 2.0;
      } else {
        resetZoomAndPan();
      }
      applyTransform();
    });

    // Touch Gestures: Swipe Left/Right (at 100% zoom) & Pan/Drag (when zoomed > 100%)
    fsViewport.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();

        if (currentZoom > 1.0) {
          isPanning = true;
          panStartX = touchStartX - panOffsetX;
          panStartY = touchStartY - panOffsetY;
        }
      }
    }, { passive: true });

    fsViewport.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) {
        if (currentZoom > 1.0 && isPanning) {
          e.preventDefault();
          panOffsetX = e.touches[0].clientX - panStartX;
          panOffsetY = e.touches[0].clientY - panStartY;
          applyTransform();
        }
      }
    }, { passive: false });

    fsViewport.addEventListener('touchend', function (e) {
      if (currentZoom > 1.0) {
        isPanning = false;
        return;
      }

      // Swipe navigation at 100% zoom
      if (e.changedTouches.length === 1) {
        var touchEndX = e.changedTouches[0].clientX;
        var touchEndY = e.changedTouches[0].clientY;
        var diffX = touchEndX - touchStartX;
        var diffY = touchEndY - touchStartY;
        var diffTime = Date.now() - touchStartTime;

        // Horizontal swipe threshold: 45px, time < 500ms, mostly horizontal
        if (diffTime < 500 && Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
          if (diffX < 0) {
            navigateMedia('next'); // Swipe Left -> Next
          } else {
            navigateMedia('prev'); // Swipe Right -> Prev
          }
        }
      }
    }, { passive: true });
  }

  /**
   * ════════════════════════════════════════════════════════════════
   * 4 · INITIALIZATION & EVENT BINDINGS
   * ════════════════════════════════════════════════════════════════
   */
  function init() {
    invitationWrapper = document.querySelector('.invitation-wrapper');
    galleryDetailCard = document.getElementById('gallery-detail-card');
    galleryDivider = document.getElementById('gallery-divider');
    galleryCardVal = document.getElementById('gallery-card-val');
    galleryCardSub = document.getElementById('gallery-card-sub');

    galleryGridModal = document.getElementById('gallery-grid-modal');
    galleryGridItems = document.getElementById('gallery-grid-items');
    galleryGridCloseBtn = document.getElementById('gallery-grid-close-btn');
    galleryGridHeading = document.getElementById('gallery-grid-heading');

    fsViewer = document.getElementById('fullscreen-media-viewer');
    fsBackBtn = document.getElementById('fs-back-btn');
    fsDownloadBtn = document.getElementById('fs-download-btn');
    fsZoomOutBtn = document.getElementById('fs-zoom-out-btn');
    fsZoomInBtn = document.getElementById('fs-zoom-in-btn');
    fsCloseBtn = document.getElementById('fs-close-btn');
    fsViewport = document.getElementById('fs-viewport');
    fsMediaWrap = document.getElementById('fs-media-wrap');

    // Click Photos & Videos Card -> Open Gallery Grid
    if (galleryDetailCard) {
      galleryDetailCard.addEventListener('click', openGalleryGrid);
      galleryDetailCard.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openGalleryGrid();
        }
      });
    }

    // Gallery Grid Close Button -> Return to Invitation
    if (galleryGridCloseBtn) {
      galleryGridCloseBtn.addEventListener('click', closeGalleryGrid);
    }

    // Fullscreen Controls
    if (fsBackBtn) fsBackBtn.addEventListener('click', backToGalleryGrid);
    if (fsCloseBtn) fsCloseBtn.addEventListener('click', closeAllToInvitation);
    if (fsZoomInBtn) fsZoomInBtn.addEventListener('click', function () { handleZoom(1); });
    if (fsZoomOutBtn) fsZoomOutBtn.addEventListener('click', function () { handleZoom(-1); });

    // Keyboard and Gestures
    initKeyboardControls();
    initPanAndTouchGestures();

    // Initial Sync
    syncGalleryVisibility();

    // Realtime BroadcastChannel & Config listener
    if (window.KnockConfig) {
      window.KnockConfig.onUpdate(function () {
        syncGalleryVisibility();
      });
    }

    try {
      if ('BroadcastChannel' in window) {
        var channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.onmessage = function (e) {
          if (e.data && (e.data.type === 'CONFIG_UPDATED' || e.data.type === 'GALLERY_UPDATED')) {
            syncGalleryVisibility();
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

  window.KnockGallery = {
    openGalleryGrid: openGalleryGrid,
    closeGalleryGrid: closeGalleryGrid,
    openFullscreenViewer: openFullscreenViewer,
    closeFullscreenViewer: closeFullscreenViewer,
    syncGalleryVisibility: syncGalleryVisibility
  };

})(window);
