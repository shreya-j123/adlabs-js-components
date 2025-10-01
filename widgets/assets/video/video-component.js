class WgtVideoPlayer extends HTMLElement {
  constructor() {
    super();
    this.player = null;
    this.connected = false;
    this.observer = null;
    this.isRendered = false;
    this.isStarted = false;
    this.isCompleted = false;
    this.progressTracked = {
      '25': false,
      '50': false,
      '75': false,
      '100': false,
    };
    this.adWidgetId = null;
    this.widgetId = null;

    this.isInView = false;
    this.isDocumentVisible = true;
  }

  static get observedAttributes() {
    return [
      'video_src',
      'section_bg_color',
      'poster_src',
      'cta_url',
      'ad_widget_id',
      'widget_id',
      'paused',
      'order'
    ];
  }

  connectedCallback() {
    this.render();
    this.connected = true;

    // Initialize document visibility state
    this.isDocumentVisible = document.visibilityState === 'visible';

    // Listen for global document visibility changes (tab active/inactive)
    document.addEventListener('visibilitychange', this._handleDocumentVisibilityChange.bind(this));
  }

  disconnectedCallback() {
    this.destroy();
    document.removeEventListener('visibilitychange', this._handleDocumentVisibilityChange.bind(this));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.connected || oldValue === newValue) return;

    if (name === 'video_src') {
      if (!oldValue && newValue) {
        this.render();
      } else if (oldValue && !newValue) {
        this.destroy();
      } else if (oldValue !== newValue && this.player) {
        // Update source for MediaElement.js
        this.player.setSrc(newValue);
        this.player.load();
      }
      return;
    }

    if (name === 'poster_src' && this.player) {
      // Update poster for MediaElement.js by setting the attribute on the video element
      this.player.media.setAttribute('poster', newValue);
    }

    if (name === 'section_bg_color') {
      this.style.backgroundColor = newValue;
      console.log(name);
    }

    if (name === 'cta_url') {
      this.setupClickOverlay();
    }

    if (name === 'ad_widget_id') this.adWidgetId = newValue;
    if (name === 'widget_id') this.widgetId = newValue;

    if (name === 'paused') {
      this._updatePlaybackState();
    }
  }

  _handleDocumentVisibilityChange() {
    this.isDocumentVisible = document.visibilityState === 'visible';
    this._updatePlaybackState(); // Re-evaluate playback based on new document visibility
  }

  setupClickOverlay() {
    const overlay = this.querySelector('.click-overlay');
    const cta_url = this.getAttribute('cta_url');
    const widget_order = this.getAttribute('order') || '';
    if (overlay && cta_url) {
      overlay.onclick = () => {
        AdEventTracker?.TriggerEventFromWidgetConfig?.({
          widgetOrder: widget_order,
          widgetId: this.widgetId,
          adWidgetId: this.adWidgetId,
          eventName: 'Click',
          widgetTagName: 'wgt-video-player',
          clickUrl: cta_url
        });
        // window.open(cta_url, '_blank');
      };
    }
  }

  render() {
    if (this.isRendered) return;

    // Set flag
    this.isRendered = true;
    this.initPlayer(); // player setup

    // Dispatch a custom event to signal this widget is rendered
    this.dispatchEvent(new CustomEvent('wgt-rendered', {
      bubbles: true,
      composed: true,
      detail: {
        tag: this.tagName.toLowerCase()
      }
    }));
  }

  initPlayer() {
    const video_id = `video-${Math.random().toString(36).substring(2, 9)}`;
    const video_src = this.getAttribute('video_src') || '';
    const poster = this.getAttribute('poster_src') || '';
    const bg_color = this.getAttribute('section_bg_color') || '#000';
    const cta_url = this.getAttribute('cta_url');
    const widget_order = this.getAttribute('order') || 'Video';
    this.setAttribute("id", widget_order);
    this.adWidgetId = this.getAttribute('ad_widget_id') || video_id;
    this.widgetId = this.getAttribute('widget_id') || null;

    this.style.backgroundColor = bg_color;

    const isAndroid = /android/i.test(navigator.userAgent);
    const shouldMute = !isAndroid;

    if (!video_src) {
      this.destroy(); // Ensure any existing player is removed
      return;
    }

    // Check if MediaElementPlayer is defined
    if (typeof MediaElementPlayer === 'undefined') {
      console.warn('MediaElementPlayer is not defined yet. Retrying in 100ms...');
      setTimeout(() => {
        try {
          this.render();
        } catch (e) {
          AdEventTracker?.ErrorLogger?.log?.('Video', e, true);
        }
      }, 100);
      return;
    }

    // Set the innerHTML first so the video element exists in the DOM
    this.innerHTML = `
      <div class="wrapper ${this.hasAttribute('full-canvas') ? 'full-canvas' : ''}">
        <video
          width="640" height="360" style="max-width: 100%"
          id="${video_id}"
          class="mejs__player video-element"
          poster="${poster}"
          preload="auto"
          loop
          playsinline
          ${shouldMute ? 'muted' : ''}
        >
          <source src="${video_src}" type="video/mp4" />
        </video>

        ${cta_url ? '<div class="click-overlay"></div>' : ''}

        <div class="mute-unmute hidden">
          <button class="mute-button">
            <span class="mute-icon">
              ${shouldMute ? this.getUnmuteIcon() : this.getMuteIcon()}
            </span>
          </button>
        </div>

        <div class="play-overlay">
          <div class="play-icon">
            <span class="play-icon-svg">${this.getPlayIcon()}</span>
          </div>
        </div>
      </div>
    `;

    // If no video_src, ensure player is null and stop here
    if (!video_src) {
      this.player = null;
      return;
    }

    // DOM references (these must be queried *after* innerHTML is set)
    const videoElement = this.querySelector(`#${video_id}`);
    const muteToggleWrapper = this.querySelector('.mute-unmute');
    const muteButton = this.querySelector('.mute-button');
    const muteIcon = this.querySelector('.mute-icon');
    const playOverlay = this.querySelector('.play-overlay');

    // Crucial check: ensure the video element was found
    if (!videoElement) {
      console.error('Video element not found. Cannot initialize MediaElementPlayer.');
      return; // Stop execution if the element isn't there
    }

    // Initialize MediaElement.js
    try {
      this.player = new MediaElementPlayer(videoElement, {
        autoplay: false, 
        loop: true,
        preload: 'auto',
        features: [], // No built-in controls as we have custom ones
        alwaysShowControls: false,
        enableProgressTooltip: false,
        pauseOtherPlayers: false,
        // The success callback is critical for MediaElement.js
        success: (mediaElement, originalNode, instance) => {
          this.player = instance; // Ensure `this.player` points to the MediaElementPlayer instance
          this.player.media.muted = shouldMute; // Set initial mute state on the actual media element
          this.player.setMuted(shouldMute); // Sync with MediaElementPlayer's internal state

          // Now that player.media is ready, attach event listeners
          this._updatePlaybackState(); // Initial playback state update

          // Error tracking
          this.player.media.addEventListener('error', () => {
            const err = this.player.media.error;
            AdEventTracker?.ErrorLogger?.log?.("Video", err);
          });

          // Mute toggle
          muteButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isMuted = this.player.media.muted;
            this.player.setMuted(!isMuted);
            muteIcon.innerHTML = isMuted ? this.getMuteIcon() : this.getUnmuteIcon();
            AdEventTracker?.TriggerEventFromWidgetConfig?.({
              widgetOrder: widget_order,
              widgetId: this.widgetId,
              adWidgetId: this.adWidgetId,
              eventName: isMuted ? 'Unmute' : 'Mute',
              widgetTagName: 'wgt-video-player'
            });
          });

          // Play overlay
          playOverlay?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.player.play().catch(() => {});
          });

          // Play/pause UI control
          this.player.media.addEventListener('pause', () => {
            playOverlay?.classList.remove('hidden');
            muteToggleWrapper?.classList.add('hidden');
          });

          this.player.media.addEventListener('play', () => {
            playOverlay?.classList.add('hidden');
            muteToggleWrapper?.classList.remove('hidden');

            const isMuted = this.player.media.muted;
            AdEventTracker?.TriggerEventFromWidgetConfig?.({
              widgetOrder: widget_order,
              widgetId: this.widgetId,
              adWidgetId: this.adWidgetId,
              eventName: isMuted ? "StartMute" : "StartUnmute",
              widgetTagName: 'wgt-video-player'
            });

            if (!this.isStarted) {
              this.dispatchEvent(new CustomEvent('wgt-started', {
                bubbles: true,
                composed: true,
                detail: {
                  tag: this.tagName.toLowerCase()
                }
              }));
              this.isStarted = true;
            }
          });

          // Click overlay
          this.setupClickOverlay();

          // Progress tracking
          this.player.media.addEventListener('timeupdate', () => {
            const duration = this.player.media.duration;
            const current = this.player.media.currentTime;
            const percent = (current / duration) * 100;

            if (percent >= 25 && !this.progressTracked['25']) {
              AdEventTracker?.TriggerEventFromWidgetConfig?.({
                widgetOrder: widget_order,
                widgetId: this.widgetId,
                adWidgetId: this.adWidgetId,
                eventName: 'FirstQuartile',
                widgetTagName: 'wgt-video-player'
              });
              this.progressTracked['25'] = true;
            }
            if (percent >= 50 && !this.progressTracked['50']) {
              AdEventTracker?.TriggerEventFromWidgetConfig?.({
                widgetOrder: widget_order,
                widgetId: this.widgetId,
                adWidgetId: this.adWidgetId,
                eventName: 'MidPoint',
                widgetTagName: 'wgt-video-player'
              });
              this.progressTracked['50'] = true;
            }
            if (percent >= 75 && !this.progressTracked['75']) {
              AdEventTracker?.TriggerEventFromWidgetConfig?.({
                widgetOrder: widget_order,
                widgetId: this.widgetId,
                adWidgetId: this.adWidgetId,
                eventName: 'ThirdQuartile',
                widgetTagName: 'wgt-video-player'
              });
              this.progressTracked['75'] = true;
            }
            if (percent >= 98 && !this.progressTracked['100']) {
              AdEventTracker?.TriggerEventFromWidgetConfig?.({
                widgetOrder: widget_order,
                widgetId: this.widgetId,
                adWidgetId: this.adWidgetId,
                eventName: 'Complete',
                widgetTagName: 'wgt-video-player'
              });
              this.progressTracked['100'] = true;

              if (this.isRendered && !this.isCompleted) {
                this.dispatchEvent(new CustomEvent('wgt-completed', {
                  detail: {
                    tag: this.tagName.toLowerCase()
                  },
                  bubbles: true,
                  composed: true
                }));
                this.isCompleted = true;
              }
            }
          });
        },
        error: (mediaElement, originalNode) => {
          // Handle errors during player setup
          console.error('MediaElementPlayer initialization error:', mediaElement.error);
          AdEventTracker?.ErrorLogger?.log?.('Video', mediaElement.error, true);
        }
      });
    } catch (err) {
      console.error('Caught error during MediaElementPlayer construction:', err);
      AdEventTracker?.ErrorLogger?.log?.('Video', err);
    }

    // Visibility observer
    // This can be set up immediately as it observes the videoElement, which is already in the DOM.
    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.isInView = entry.isIntersecting;
        // Only update playback state if the player instance and its media element are ready
        if (this.player && this.player.media) {
          // this._updatePlaybackState();
        }
      }, {
        threshold: 0.5
      }
    );

    this.observer.observe(videoElement);
  }

  _updatePlaybackState() {
    const isOverlayActive = this.hasAttribute('paused') && this.getAttribute('paused') === 'true';

    // Ensure this.player and this.player.media exist before attempting playback control
    if (this.player && this.player.media) {
      if (isOverlayActive) {
        // If overlay is active, always pause
        this.player.pause();
      } else if (this.isInView && this.isDocumentVisible) {
        this.player.play().catch((error) => {
          // Autoplay policy or other errors can cause play() to fail
          AdEventTracker?.ErrorLogger?.log?.('Video', error, true);
          // You might want to show a play button to the user here if autoplay fails
        });
      } else {
        this.player.pause();
      }
    }
  }

  play() {
    if (!this.hasAttribute('paused') || this.getAttribute('paused') !== 'true') {
      this._updatePlaybackState();
    } else {
      this.pause(); // Ensure it's paused if an overlay is active
    }
  }

  pause() {
    if (this.player) {
      this.player.pause();
    }
  }

  resume() {
    if (!this.hasAttribute('paused') || this.getAttribute('paused') !== 'true') {
      this._updatePlaybackState();
    } else {
      this.pause(); // Ensure it's paused if an overlay is active
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.player) {
      this.player.remove(); // Use .remove() for MediaElement.js cleanup
      this.player = null;
    }

    this.innerHTML = ''; // Clear component content
    this.isRendered = false;
    this.isStarted = false;
    this.isCompleted = false;
    this.progressTracked = { '25': false, '50': false, '75': false, '100': false };
  }

  // SVG Icons (unchanged)
  getMuteIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="15" viewBox="0 0 640 512"><path fill="#ffffff" d="M533.6 32.5C598.5 85.2 640 165.8 640 256s-41.5 170.7-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"/></svg>`;
  }

  getUnmuteIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="15" viewBox="0 0 576 512"><path fill="#ffffff" d="M301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM425 167l55 55 55-55c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-55 55 55 55c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-55-55-55 55c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l55-55-55-55c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z"/></svg>`;
  }

  getPlayIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="15" viewBox="0 0 384 512"><path fill="#ffffff" d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg>`;
  }
}

customElements.define('wgt-video-player', WgtVideoPlayer);