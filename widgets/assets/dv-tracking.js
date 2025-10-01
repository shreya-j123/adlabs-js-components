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

  FireClick(trackerPayload, widgetOrder, eventName, clickUrl){
    Enabler.exit(widgetOrder+"_"+eventName, clickUrl);
  }
}

window.AdEvents = AdEvents;