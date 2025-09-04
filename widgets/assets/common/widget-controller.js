let deck = null;
function getDeck() {
  if (!deck) {
    deck = document.querySelector('ad-frame-deck');
  }
  return deck;
}

const WidgetController = {
  _overlayWidgetMap: new Map(),
  // _hiddenWidgetSet: new Set(),
  _protectedTargets: new Set(),

  handlePlay(widget) {
    const selector = 'wgt-peel[mode="2"], wgt-scratch-card[mode="2"]';
    const order = widget._widgetOrder;
    if (!order) return;

    const info = WidgetController._overlayWidgetMap.get(order);
    if (!info) return;

    info.completed += 1;

    if (info.completed >= info.total) {
      if (widget._overlayOn === '1') {
        const deck = getDeck();
        if (!deck) return;

        // Reset protectedTargets for this run
        WidgetController._protectedTargets.clear();

        // Collect protected widgets
        deck.querySelectorAll(selector).forEach(card => {
            console.log('Protected widget:', card);
          const targetOrder = card.getAttribute('reveal_widget');
          const targetWidget = targetOrder && document.querySelector(`[order="${targetOrder}"]`);
          if (targetWidget?.tagName.startsWith('WGT-')) {
            WidgetController._protectedTargets.add(targetWidget);
          }
        });

        // Resume all unprotected widgets
        deck.querySelectorAll('*').forEach(wgt => {
          if (wgt.tagName.startsWith('WGT-') && !WidgetController._protectedTargets.has(wgt)) {
            // console.log(!WidgetController._overlayWidgetMap.has(wgt));

            if (wgt.closest('widget-wrapper')) return;
            wgt.setAttribute('paused', 'false');
          }
        });
      } else if (widget._target?.tagName.startsWith('WGT-')) {
        widget._target.setAttribute('paused', 'false');
      }

      // Clean up
      WidgetController._overlayWidgetMap.delete(order);
    }
  },

  waitForTargetAndInit(widget, prepareFn) {
    const mode = widget._overlayOn;
    const targetOrderValue = widget.getAttribute('reveal_widget');

    const tryInit = () => {
      let target;
      if (mode === '1') {
        const deck = getDeck() || document.body;
        deck?.querySelectorAll('*').forEach(wgt => {
          if (wgt.closest('widget-wrapper')) return;
          if (wgt.tagName.startsWith('WGT-')) {
            wgt.setAttribute('paused', 'true');
          }
        });
        target = deck;
      } else if (targetOrderValue) {
        target = document.querySelector(`[order="${targetOrderValue}"]`);
        if (target && target.tagName.startsWith('WGT-')) {
          target.setAttribute('paused', 'true');
        } else {
          target = null;
        }
      }

      if (target) {
        widget._observer?.disconnect();
        prepareFn.call(widget, target); // call correct prepare method
      }
    };

    tryInit();

    widget._observer = new MutationObserver(tryInit);
    widget._observer.observe(document.body, { childList: true, subtree: true });
  }
};

window.WidgetController = WidgetController;
