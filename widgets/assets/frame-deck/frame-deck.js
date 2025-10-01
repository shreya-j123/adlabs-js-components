if (typeof WOW !== 'undefined') {
wow = new WOW({
  boxClass:     'wow',      // default
  animateClass: 'animated', // default
  offset:       0,          // default
  mobile:       true,       // default
  live:         true        // default
});
wow.init();
}

function getFrameOrientation(excludedWidgetTags) {
  const decks = document.querySelectorAll('ad-frame-deck');

  decks.forEach(deck => {
    const { width, height } = deck.getBoundingClientRect();
    const orientation = width / height > 1.4 ? 'orientation-landsc' : 'orientation-portrait';

    deck.classList.remove('orientation-landsc', 'orientation-portrait');
    deck.classList.add(orientation);

    adjustWidgetLayout(deck, orientation, excludedWidgetTags);
  });
}

// Utility: Set width/height
function setSize(el, width, height) {
  if (width != null) el.style.width = typeof width === 'number' ? `${width}px` : width;
  if (height != null) el.style.height = typeof height === 'number' ? `${height}px` : height;
}

function isOverflowing(deck, widgets, orientation) {
  const deckRect = deck.getBoundingClientRect();

  if (orientation === 'orientation-landsc') {
    const totalWidth = widgets.reduce((sum, w) => {
      const style = window.getComputedStyle(w);
      const marginLeft = parseFloat(style.marginLeft) || 0;
      const marginRight = parseFloat(style.marginRight) || 0;
      return sum + w.getBoundingClientRect().width + marginLeft + marginRight;
    }, 0);

    return totalWidth > deckRect.width;

  } else {
    const totalHeight = widgets.reduce((sum, w) => {
      const style = window.getComputedStyle(w);
      const marginTop = parseFloat(style.marginTop) || 0;
      const marginBottom = parseFloat(style.marginBottom) || 0;
      return sum + w.getBoundingClientRect().height + marginTop + marginBottom;
    }, 0);

    return totalHeight > deckRect.height;
  }
}

function forceEqualSplit(deck, widgets, orientation) {
  console.log(deck);
  console.log(widgets);
  console.log(orientation);
  const deckRect = deck.getBoundingClientRect();
  const count = widgets.length;

  if (orientation === 'orientation-landsc') {
    const eachWidth = deckRect.width / count;
    widgets.forEach(w => setSize(w, eachWidth, '100%'));
  } else {
    const eachHeight = deckRect.height / count;
    console.log(eachHeight);
    widgets.forEach(w => setSize(w, '100%', eachHeight));
  }
}

// Utility: Handle loadedmetadata
function onVideoReady(videoEl, callback) {
  if (!videoEl) return;
  if (videoEl.readyState >= 1) {
    requestAnimationFrame(callback);
  } else {
    videoEl.addEventListener('loadedmetadata', () => {
      requestAnimationFrame(callback);
    }, { once: true });
  }
}

function adjustWidgetLayout(deck, orientation, excludedWidgetTags = []) {
  const allWidgets = Array.from(deck.children).filter(el => el.tagName.startsWith('WGT-'));

  const widgets = allWidgets.filter(
    el => !excludedWidgetTags.includes(el.tagName)
  );

  const videoWidgets = widgets.filter(w => w.tagName === 'WGT-VIDEO-PLAYER');
  const infoWidgets = widgets.filter(w => w.tagName === 'WGT-INFO');
  const count = widgets.length;
  const deckRect = deck.getBoundingClientRect();

  if (widgets.length === 1) {
    setSize(widgets[0], '100%', '100%');
    return;
  }

  if (videoWidgets.length === 1) {
    const video = videoWidgets[0];
    const internalVideo = video.querySelector('video');
    const otherWidgets = widgets.filter(w => w !== video);
    const info = infoWidgets.length ? infoWidgets[0] : null;
    const otherNonInfoWidgets = info ? otherWidgets.filter(w => w !== info) : otherWidgets;

    const layoutWithOriginalSize = () => {
      const vw = internalVideo.videoWidth;
      const vh = internalVideo.videoHeight;
      const isLandscape = vw > vh;
      const aspectRatio = vw / vh;

      if (orientation === 'orientation-landsc') {
        let videoWidth = deckRect.height * aspectRatio;
        videoWidth = Math.min(videoWidth, deckRect.width * 0.6);
        videoWidth = Math.max(videoWidth, 50);

        setSize(video, videoWidth, '100%');

        let remainingWidth = deckRect.width - videoWidth;

        if (count > 2 && info) {
          setSize(info, 'auto', '100%');
          remainingWidth -= info.getBoundingClientRect().width;
        }

        const eachWidth = remainingWidth / otherNonInfoWidgets.length;
        otherNonInfoWidgets.forEach(widget => setSize(widget, eachWidth, '100%'));
      } else {
        const isVertical = !isLandscape;
        // setSize(video, '100%', isVertical ? '50%' : 'auto');
        // const videoHeight = video.getBoundingClientRect().height;

        const vh = internalVideo.videoHeight;
        const vw = internalVideo.videoWidth;
        const aspectRatio = vw / vh;
        let videoHeight = deckRect.width / aspectRatio;

        // Limit height to half if needed
        videoHeight = Math.min(videoHeight, deckRect.height * 0.5);
        setSize(video, '100%', videoHeight);

        let remainingHeight = deckRect.height - videoHeight;

        if (count > 2 && info) {
          setSize(info, '100%', 'auto');
          // remainingHeight -= info.getBoundingClientRect().height;
          // Use requestAnimationFrame to allow layout to complete before measuring
          requestAnimationFrame(() => {
            const infoHeight = info.getBoundingClientRect().height;
            remainingHeight -= infoHeight;

            const eachHeight = remainingHeight / otherNonInfoWidgets.length;
            otherNonInfoWidgets.forEach(widget => setSize(widget, '100%', eachHeight));
          });
          return; // prevent setting `eachHeight` again below
        }

        const eachHeight = remainingHeight / otherNonInfoWidgets.length;
        otherNonInfoWidgets.forEach(widget => setSize(widget, '100%', eachHeight));
      }
    };

    onVideoReady(internalVideo, () => {
      layoutWithOriginalSize();
      if (isOverflowing(deck, widgets, orientation)) {
        forceEqualSplit(deck, widgets, orientation);
      }
    });
  }

  else if (
    videoWidgets.length > 0 &&
    widgets.every(w => w.tagName === 'WGT-VIDEO-PLAYER' || w.tagName === 'WGT-INFO')
  ) {
    const info = infoWidgets;
    const totalWidgets = videoWidgets.length + info.length;

    if (orientation === 'orientation-landsc') {
      let verticalVideos = [];
      let horizontalVideos = [];

      videoWidgets.forEach(video => {
        const internalVideo = video.querySelector('video');

        const handleVideoLayout = () => {
          const vw = internalVideo.videoWidth;
          const vh = internalVideo.videoHeight;

          if (vh > vw) {
            // Vertical video
            const width = Math.max(deckRect.height * (vw / vh), 50);
            setSize(video, width, '100%');
            verticalVideos.push(video);
          } else {
            horizontalVideos.push(video);
          }

          if (verticalVideos.length + horizontalVideos.length === videoWidgets.length) {
            const usedWidth = verticalVideos.reduce((sum, el) => {
              return sum + el.getBoundingClientRect().width;
            }, 0);

            const remainingWidth = deckRect.width - usedWidth;
            const sharedWidgets = [...horizontalVideos, ...info];
            const eachWidth = remainingWidth / sharedWidgets.length;

            sharedWidgets.forEach(widget => setSize(widget, eachWidth, '100%'));
          }
        };

        onVideoReady(internalVideo, handleVideoLayout);
      });
    } else {
      const eachHeight = deckRect.height / totalWidgets;
      widgets.forEach(widget => setSize(widget, '100%', eachHeight));
    }
  }

  else {
    const info = infoWidgets.length ? infoWidgets[0] : null;
    const otherWidgets = info ? widgets.filter(w => w !== info) : widgets;
    const remainingWidgets = new Set(otherWidgets);

    if (orientation === 'orientation-landsc') {
      let totalVideoWidth = 0;

      videoWidgets.forEach(video => {
        const internalVideo = video.querySelector('video');

        const applyVideoLayout = () => {
          const vw = internalVideo.videoWidth;
          const vh = internalVideo.videoHeight;
          const isVertical = vh > vw;

          if (isVertical) {
            const width = Math.max(deckRect.height * (vw / vh), 50);
            setSize(video, width, '100%');
            totalVideoWidth += width;
            remainingWidgets.delete(video);
          }
        };

        onVideoReady(internalVideo, applyVideoLayout);
      });

      if (info) {
        setSize(info, 'auto', '100%');
        totalVideoWidth += info.getBoundingClientRect().width;
        remainingWidgets.delete(info);
      }

      const remainingWidth = deckRect.width - totalVideoWidth;
      const eachWidth = remainingWidth / remainingWidgets.size;

      remainingWidgets.forEach(widget => setSize(widget, eachWidth, '100%'));
    } else {
      if (info) {
        setSize(info, '100%', 'auto');
        const infoHeight = info.getBoundingClientRect().height;
        const remainingHeight = deckRect.height - infoHeight;
        const eachHeight = remainingHeight / otherWidgets.length;

        otherWidgets.forEach(widget => setSize(widget, '100%', eachHeight));
      } else {
        const eachHeight = 100 / widgets.length;
        widgets.forEach(widget => setSize(widget, '100%', `${eachHeight}%`));
      }
    }
  }
}

excludedWidgetTags = ['WGT-SCRATCH-CARD', 'WGT-PEEL', 'WGT-ONE-TAP-REMINDER'];

window.addEventListener('load', () => {
  getFrameOrientation(excludedWidgetTags);
  AdEventTracker?.initVisibilityObserver?.();
});

// window.addEventListener('resize', getFrameOrientation(excludedWidgetTags));
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    getFrameOrientation(excludedWidgetTags);
  }, 150); // Adjust delay as needed (e.g., 100ms to 250ms)
});

window.initDeck = function () {
  console.log('[frame-deck] initDeck() called');

  const deck = document.querySelector('ad-frame-deck');
  if (!deck) {
    console.warn('No ad-frame-deck found in iframe');
    return;
  }

  deck.layout = () => {
    console.log('[ad-frame-deck] manual layout triggered');
    getFrameOrientation(excludedWidgetTags);
  };

  deck.layout();
};
