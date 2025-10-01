const IS_DV360 = window.AD_ENV === "DV360";

if (!Enabler.isInitialized()) {
  Enabler.addEventListener(
    studio.events.StudioEvent.INIT,
    enablerInitialized);
} else {
   enablerInitialized();
}
function enablerInitialized() {
  // Enabler initialized.
  // In App ads are rendered offscreen so animation should wait for
  // the visible event. These are simulated with delays in the local
  // environment.
  if (!Enabler.isVisible()) {
    Enabler.addEventListener(
      studio.events.StudioEvent.VISIBLE,
      adVisible);
    AdEventTracker?.PauseWidgets?.();
  } else {
     adVisible();
  }
}
function adVisible() {
  console.log("ad VISIBLE");
  window.dispatchEvent(new Event('ad-visible'));
  AdEventTracker?.PlayWidgets?.();
}

const AdEvents = {
  FireEngagement() {
    Enabler.counter("ad_engagement", false);
  },

  FireCounter(widgetOrder, eventName, cumulative){
    Enabler.counter(widgetOrder+"_"+eventName, cumulative);
  },

  FireClick(trackerPayload, widgetOrder, eventName, clickUrl) {
    if (IS_DV360) {
      Enabler.exit(widgetOrder + "_" + eventName, clickUrl);
    } else {
      const functionName = "clickTag_" + widgetOrder + "_" + eventName;
      if (typeof window[functionName] === "function") {
        window[functionName]();
      } else {
        console.warn("Missing clickTag handler:", functionName);
      }
    }
  }
}

window.AdEvents = AdEvents;