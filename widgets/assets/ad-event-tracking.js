const AdEventTracker = {
  adParams: {},
  __observerInitialized: false,
  startedWidgets: new Set(),
  completedWidgets: new Set(),
  eventTypeToUrlMap: new Map(),
  _overlayWidgetMap: new Map(),
  _hiddenWidgetSet: new Set(),
  totalWidgets: 0,
  hasAdCompleted: false,

  configure({ eventTypeToUrlMap } = {}) {
    if (eventTypeToUrlMap instanceof Map) {
      this.eventTypeToUrlMap = eventTypeToUrlMap;
    } else if (typeof eventTypeToUrlMap === 'object') {
      this.eventTypeToUrlMap = new Map(Object.entries(eventTypeToUrlMap));
    }
  },

  WidgetEventConfig(){
    try {
      const el = document.getElementById('ad-event-config');
      return el ? JSON.parse(el.textContent) : {};
    } catch (e) {
      console.warn('[WidgetConfig] Failed to parse config JSON:', e);
      return {};
    }
  },

  FireImpression() {
    console.log('[FireImpression] fired');
    AdEventTracker?.FireTracker(AdEventTracker?.eventTypeToUrlMap.get('impression'));
  },

  FireTracker(trackingUrl = '', Params = {}) {
    if (!trackingUrl) return;

    // Use helper to ensure adParams are set
    AdEvents?.EnsureAdParams?.();

    const finalParams = Object.entries({ ...this.adParams, ...Params }).reduce((acc, [key, val]) => {
      if (val != null && val !== '') acc[key] = val;
      return acc;
    }, {});

    const queryString = new URLSearchParams(finalParams).toString();
    const finalUrl = queryString ? `${trackingUrl}&${queryString}` : trackingUrl;

    try {
      fetch(finalUrl, {
        method: 'GET',
      }).catch(error => {
        this.ErrorLogger.log('Tracking Fetch', `Exception: ${error.message || error}`);
      });
    } catch (error) {
      this.ErrorLogger.log('Tracking Beacon', `Exception: ${error.message || error}`);
    }
  },

  TriggerEventFromWidgetConfig({
    widgetOrder,
    eventName,
    widgetId,
    adWidgetId,
    widgetTagName,
    clickUrl
  }){
    const widgetConfig = this.WidgetEventConfig()?.[widgetTagName];
    if (!widgetConfig) {
      console.warn(`Missing widget config for tag: ${widgetTagName}`);
      return;
    }

    let eventMeta = widgetConfig[eventName]; // Try direct lookup first

    if (!eventMeta) {
      const templatedEventKey = Object.keys(widgetConfig).find(key =>
          key.includes('{item_id}') && eventName.startsWith(key.split('{item_id}')[0])
      );
      if (templatedEventKey) {
          eventMeta = widgetConfig[templatedEventKey];
      }
    }

    if (!eventMeta) {
      console.warn(`Missing event config: ${widgetTagName} → ${eventName}`);
      return;
    }

    AdEventTracker.TrackingHelper.triggerEvent({
      widgetOrder,
      widgetName: widgetTagName,
      eventName,
      widgetId,
      adWidgetId,
      engagement: eventMeta.engagement,
      cumulative: eventMeta.cumulative,
      click: eventMeta.click,
      clickUrl
    });
  },

  TrackingHelper: {
    firedEvents: new Map(),
    hasEngagementFired: false,

    triggerEvent({ widgetOrder = '', widgetName = '', eventName = '', widgetId = '', adWidgetId = '', cumulative = false, click = false, engagement = false, clickUrl = '#' }) {
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
      };

      if (engagement && !this.hasEngagementFired) {
        this.hasEngagementFired = true;
        const engagementPayload = { ...trackerPayload, engagement_sum: 1 };
        console.log(`[ENGAGEMENT] Fired by "${widgetOrder}"`, engagementPayload);
        AdEventTracker.FireTracker(AdEventTracker.eventTypeToUrlMap.get('event'), engagementPayload);
        AdEvents?.FireEngagement?.(trackerPayload, clickUrl);
      } else {
        if (!click) {
          console.log(`[EVENT] Fired by "${widgetOrder}"`, trackerPayload);
          AdEventTracker.FireTracker(AdEventTracker.eventTypeToUrlMap.get('event'), trackerPayload);
          AdEvents?.FireCounter?.(widgetOrder, eventName, cumulative);
        }
      }

      if (click) {
        console.log(`[CLICK] Fired by "${widgetOrder}"`, trackerPayload);
        AdEventTracker.FireTracker(AdEventTracker.eventTypeToUrlMap.get('click'), trackerPayload);
        console.log(clickUrl);
        AdEvents?.FireClick?.(trackerPayload, widgetOrder, eventName, clickUrl);
      }
    }
  },

  ErrorLogger: {
    log(source, error) {
      const error_data = {
        widget: source,
        message: error?.message || error,
      };
      console.log('[ERROR]', error_data);
      AdEvents?.ErrorTracker?.(error_data);
    }
  },

  PauseWidgets() {
    // console.log("PauseWidgets");
    this._getWidgets().forEach(w => w.pause?.());
  },

  ResumeWidgets() {
    // console.log("ResumeWidgets");
    this._getWidgets().forEach(w => w.resume?.());
  },

  PlayWidgets() {
    console.log("PlayWidgets");
    this._getWidgets().forEach(w => w.play?.());
  },

  DestroyWidgets() {
    const deck = document.querySelector('ad-frame-deck');
    if (!deck) return;
    this._getWidgets().forEach(w => w.destroy?.());
    while (deck.firstChild) {
      deck.removeChild(deck.firstChild);
    }
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
  }
};

// Mount and initialize
window.addEventListener('DOMContentLoaded', () => {
  window.AdEventTracker = AdEventTracker;
  AdEvents?.SetupListeners?.();

  window.addEventListener('ad-visible', () => AdEventTracker?.FireImpression?.(), { once: true });
  window.addEventListener('ad-render', () => AdEvents?.AdRender?.(), { once: true });
  window.addEventListener('ad-completed', () => AdEvents?.AdClose?.(), { once: true });

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
        document.querySelector('ad-frame-deck').classList.add("is-ready");
        const preloader = document.querySelector('.preloader');
        if (preloader) {
          preloader.style.display = 'none';
        }
        // console.log('All widgets in first <ad-frame-deck> are rendered');
        window.dispatchEvent(new Event('ad-render'));

        AdEventTracker.totalWidgets = widgets.length;

        widgets.forEach(widget => {
          // Handle STARTED
          ensureStartedTracking(widget);

          // Handle COMPLETED
          if (widget.isCompleted) {
            AdEventTracker.completedWidgets.add(widget);
          } else {
            widget.addEventListener('wgt-completed', () => {
              AdEventTracker.completedWidgets.add(widget);
              checkIfAdCompleted();
            }, { once: true });
          }
        });
      }
    }

    function checkIfAdCompleted() {
      // console.log(AdEventTracker.totalWidgets);
      if (
        !AdEventTracker.hasAdCompleted &&
        AdEventTracker.completedWidgets.size === AdEventTracker.totalWidgets
      ) {
        AdEventTracker.hasAdCompleted = true;
        console.log('[AdComplete] All widgets completed');
        window.dispatchEvent(new Event('ad-completed'));
      }
    }

    function ensureStartedTracking(widget) {
      const handleStarted = () => {
        if (!AdEventTracker.startedWidgets.has(widget)) {
          AdEventTracker.startedWidgets.add(widget);
          console.log(`[WidgetStarted] ${widget.tagName.toLowerCase()} started (${AdEventTracker.startedWidgets.size}/${AdEventTracker.totalWidgets})`);
          AdEvents?.AdPause?.()
        }
      };

      if (widget.isStarted) {
        handleStarted();
      } else {
        // Add a listener *and* double-check again shortly after
        widget.addEventListener('wgt-started', handleStarted, { once: true });
        setTimeout(() => {
          if (widget.isStarted) handleStarted();
        }, 50); // fallback if event already fired before listener attached
      }
    }


    checkIfAllRendered();
  })();
});