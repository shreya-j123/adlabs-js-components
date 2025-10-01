const AdEvents = {
  AdRender() {
    console.log('[AdRender] fired');
    VservAdlabs?.notifyRenderer?.(VservAdlabsEvents?.RENDER, {});
  },

  AdPause() {
    console.log('[AdClose] fired');
    VservAdlabs?.notifyRenderer?.(VservAdlabsEvents?.CLOSEABLE, { canClose: false });
  },

  AdClose() {
    console.log('[AdClose] fired');
    VservAdlabs?.notifyRenderer?.(VservAdlabsEvents?.CLOSEABLE, { canClose: true });
  },

  FireClick(trackerPayload, widgetOrder, eventName, clickUrl) {
    VservAdlabs?.notifyRenderer?.(VservAdlabsEvents?.CLICK, trackerPayload);
    window.open(clickUrl, '_blank');
  },

  ErrorTracker(error_data){
    VservAdlabs?.notifyRenderer?.(VservAdlabsEvents?.ERROR, error_data);
  },

  EnsureAdParams() {
    if (Object.keys(AdEventTracker.adParams).length === 0) {
      const fallbackParams = VservAdlabs?.getAdParams?.();
      if (fallbackParams && Object.keys(fallbackParams).length) {
        console.log('Received ad parameters (via fallback):', fallbackParams);
        AdEventTracker.adParams = { ...fallbackParams };
      }
    }
  },

  SetupListeners(){
    VservAdlabs?.addEventListener?.(VservAdlabsEvents?.PAUSE, () => AdEventTracker?.PauseWidgets());
    VservAdlabs?.addEventListener?.(VservAdlabsEvents?.RESUME, () => AdEventTracker?.ResumeWidgets());
    VservAdlabs?.addEventListener?.(VservAdlabsEvents?.CLOSE, () => AdEventTracker?.DestroyWidgets());

    VservAdlabs?.addEventListener?.(VservAdlabsEvents?.AD_PARAMS_SET, (data = {}) => {
      console.log('Received ad parameters:', data);
      AdEventTracker.adParams = { ...data };
    });

    // Use helper to ensure adParams are set
    this.EnsureAdParams();

    this.InitVisibilityObserver();
  },

  InitVisibilityObserver() {
    if (AdEventTracker?.__observerInitialized) return;

    const deck = document.querySelector('ad-frame-deck');
    if (!deck) return;

    let isVisible = false;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          AdEventTracker.__observerInitialized = true;
          isVisible = true;
          if (document.visibilityState === 'visible') {
            AdEventTracker?.PlayWidgets();
            window.dispatchEvent(new Event('ad-visible'));
          }
        } else {
          isVisible = false;
          AdEventTracker?.PauseWidgets();
        }
      });
    }, { threshold: [0.25] });

    observer.observe(deck);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        AdEventTracker?.PauseWidgets();
      } else if (document.visibilityState === 'visible' && isVisible) {
        AdEventTracker?.ResumeWidgets();
      }
    });
  },
}

window.AdEvents = AdEvents;