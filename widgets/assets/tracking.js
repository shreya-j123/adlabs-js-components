const AdEventTracker = {
  __observerInitialized: false,

  ErrorLogger: {
    log(source, error) {
      const error_tracker = {
        widget: source,
        message: error?.message || error,
      };
      console.log('[ERROR]', error_tracker);
    }
  },

  AdRender() {
    console.log('[AdRender] fired');
  },

  FireImpression() {
    console.log('[FireImpression] fired');
  },

  TrackingHelper: {
    firedEvents: new Map(),
    hasEngagementFired: false,

    triggerEvent({ widgetName = '', eventName = '', widgetId = '', adWidgetId = '', cumulative = false, click = false, engagement = false }) {
      if (!cumulative) {
        if (!this.firedEvents.has(adWidgetId)) {
          this.firedEvents.set(adWidgetId, new Set());
        }
        const eventsForWidget = this.firedEvents.get(adWidgetId);
        if (eventsForWidget.has(eventName)) return;
        eventsForWidget.add(eventName);
      }

      const trackerPayload = {
        widget_id: widgetId,
        ad_widget_id: adWidgetId,
        event_name: eventName,
        event_sum: 1,
      };

      if (engagement && !this.hasEngagementFired) {
        this.hasEngagementFired = true;
        trackerPayload.engagement_sum = 1;
      }

      const type = click ? 'click' : 'event';
      console.log(`[${type.toUpperCase()}] Fired by "${widgetName}"`, trackerPayload);
    }
  },

  PauseWidgets() {
    this._getWidgets().forEach(w => w.pause?.());
  },

  ResumeWidgets() {
    this._getWidgets().forEach(w => w.resume?.());
  },

  PlayWidgets() {
    this._getWidgets().forEach(w => w.play?.());
  },

  DestroyWidgets() {
    this._getWidgets().forEach(w => w.destroy?.());
  },

  _getWidgets() {
    const deck = document.querySelector('ad-frame-deck');
    return deck
      ? Array.from(deck.querySelectorAll('*')).filter(widget =>
          widget.tagName.startsWith('WGT-') &&
          (typeof widget.play === 'function' ||
           typeof widget.pause === 'function' ||
           typeof widget.resume === 'function' ||
           typeof widget.destroy === 'function'))
      : [];
  },

  initVisibilityObserver() {
    if (this.__observerInitialized) return;
    this.__observerInitialized = true;

    const deck = document.querySelector('ad-frame-deck');
    if (!deck) return;

    let isVisible = false;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          isVisible = true;
          if (document.visibilityState === 'visible') {
            this.PlayWidgets();
          }
        } else {
          isVisible = false;
          this.PauseWidgets();
        }
      });
    }, { threshold: [0.25] });

    observer.observe(deck);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.PauseWidgets();
      } else if (document.visibilityState === 'visible' && isVisible) {
        this.ResumeWidgets();
      }
    });
  },

  setupListeners() {
    this.initVisibilityObserver();
  }
};

// Mount and initialize
window.addEventListener('DOMContentLoaded', () => {
  window.AdEventTracker = AdEventTracker;
  AdEventTracker.setupListeners();

  // Wait for all widgets to be rendered
  (function waitForAllWidgetsInFirstDeck() {
    const container = document.querySelector('ad-frames-container');
    if (!container) return console.warn('No <ad-frames-container> found');

    const firstDeck = container.querySelector('ad-frame-deck');
    if (!firstDeck) return console.warn('No <ad-frame-deck> found inside container');

    const widgets = Array.from(firstDeck.querySelectorAll(':scope > *'))
      .filter(el => el.tagName.startsWith('WGT-'));

    const renderedSet = new Set();

    widgets.forEach(widget => {
      if (widget.isRendered) {
        renderedSet.add(widget);
      } else {
        widget.addEventListener('wgt-rendered', () => {
          renderedSet.add(widget);
          checkIfAllRendered();
        }, { once: true });
      }
    });

    function checkIfAllRendered() {
      if (renderedSet.size === widgets.length) {
        console.log('All widgets in first <ad-frame-deck> are rendered');
      }
    }

    checkIfAllRendered();
  })();
});