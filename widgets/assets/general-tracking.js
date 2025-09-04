const AdEvents = {
  FireClick(trackerPayload, widgetOrder, eventName, clickUrl) {
    window.open(clickUrl, '_blank');
  },

  SetupListeners(){
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