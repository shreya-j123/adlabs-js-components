class WgtInfo extends HTMLElement {
  constructor() {
    super();
    this.isRendered = false; 
    this.isCompleted = false;
    this.adWidgetId = null;
    this.widgetId = null;
    this.widgetOrder = null;
  }

  static get observedAttributes() {
    return [
      'order', 
      'info_text', 
      'section_bg_src', 
      'section_bg_color', 
      'cta_url', 
      'ad_widget_id', 
      'widget_id'
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'order':
      case 'ad_widget_id':
        this.adWidgetId = newValue || null;
        break;
      case 'widget_id':
        this.widgetId = newValue || null;
        break;
      case 'section_bg_color':
        this.style.backgroundColor = newValue;
        break;
      case 'section_bg_src':
        this.style.backgroundImage = newValue ? `url(${newValue})` : '';
        break;
      case 'info_text':
      case 'cta_url':
        this.render();
        break;
    }
  }

  connectedCallback() {
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this);
    this.render();
  }

  disconnectedCallback() {
    this.destroy();
  }

  getAttributeValue(attr, fallback = '') {
    const val = this.getAttribute(attr);
    return val !== null ? val : fallback;
  }

  render() {
    const info_id = `info-${Math.random().toString(36).substr(2, 5)}`;

    const info_text = this.getAttribute('info_text') || '';
    const info_cta_url = this.getAttribute('cta_url') || '';

    this.adWidgetId = this.getAttribute('ad_widget_id') || info_id;
    this.widgetId = this.getAttribute('widget_id') || null;

    this.widgetOrder = this.getAttribute('order') || "Info";
    this.setAttribute("id", this.widgetOrder);

    const temp_div = document.createElement('div');
    temp_div.innerHTML = info_text;

    const has_anchor_tag = temp_div.querySelectorAll('a').length > 0;

    // --- START OF MODIFIED LOGIC FOR RTB LINKS ---
    const original_anchor_tags_in_temp_div = temp_div.querySelectorAll('a');
    for (let i = original_anchor_tags_in_temp_div.length - 1; i >= 0; i--) {
      const original_a = original_anchor_tags_in_temp_div[i];
      const href_url = original_a.getAttribute('href');

      const new_clickable_element = document.createElement('span');
      new_clickable_element.innerHTML = original_a.innerHTML; // Copy content
      new_clickable_element.setAttribute('data-click-url', href_url || ''); // Store original href

      if (original_a.className) {
        new_clickable_element.className = original_a.className;
      }

      if (original_a.style.cssText) {
        new_clickable_element.style.cssText = original_a.style.cssText;
      }

      if (original_a.className) {
        new_clickable_element.className = original_a.className;
      }

      original_a.parentNode.replaceChild(new_clickable_element, original_a);
    }
    // --- END OF MODIFIED LOGIC FOR RTB LINKS ---
    

    const use_link_wrapper = info_cta_url && !has_anchor_tag;
    const wrapper = document.createElement('div');
    wrapper.className = 'info-wrapper';

    // if (use_link_wrapper) {
    //   wrapper.href = info_cta_url;
    //   wrapper.target = '_blank';
    //   wrapper.rel = 'noopener noreferrer';
    // }

    // Inject HTML FIRST
    wrapper.innerHTML = temp_div.innerHTML;

    // // Now attach listeners to live <a> tags inside wrapper
    // const anchor_tags = wrapper.querySelectorAll('a');
    // anchor_tags.forEach((a, index) => {
    //   a.setAttribute('target', '_blank');
    //   a.setAttribute('rel', 'noopener noreferrer');

    //   const itemId = index + 1;
    //   a.addEventListener('click', () => {
    //     AdEventTracker?.TrackingHelper?.triggerEvent?.({
    //       widgetId: this.widgetId,
    //       adWidgetId: this.adWidgetId,
    //       eventName: `ItemClick_${itemId ?? 'unknown'}`,
    //       cumulative: true,
    //       click: true,
    //       engagement: true
    //     });
    //   });
    // });

    // --- THIS IS THE CLICK EVENT LISTENER FOR THE TRANSFORMED ELEMENTS ---
    const clickable_elements = wrapper.querySelectorAll('[data-click-url]');
    clickable_elements.forEach((el, index) => {
      const clickUrl = el.getAttribute('data-click-url');
      if (clickUrl) {
        const itemId = index + 1;
        el.addEventListener('click', () => {
          // Open the stored URL in a new tab

          AdEventTracker?.TriggerEventFromWidgetConfig?.({
            widgetOrder: this.widgetOrder,
            widgetId: this.widgetId,
            adWidgetId: this.adWidgetId,
            eventName: `ItemClick_${itemId ?? 'unknown'}`,
            widgetTagName: 'wgt-info',
            clickUrl:clickUrl
          });
        });
      }
    });
    // --- END OF CLICK EVENT LISTENER FOR TRANSFORMED ELEMENTS ---

    // Click tracking for the wrapper (if <a> not present inside)
    if (use_link_wrapper) {
      wrapper.addEventListener('click', () => {
        AdEventTracker?.TriggerEventFromWidgetConfig?.({
          widgetOrder: this.widgetOrder,
          widgetId: this.widgetId,
          adWidgetId: this.adWidgetId,
          eventName: 'ItemClick_1',
          widgetTagName: 'wgt-info',
          clickUrl:info_cta_url
        });
      });
    }

    // Final injection
    this.innerHTML = '';
    this.appendChild(wrapper);

    if (!this.isRendered) {
      this.isRendered = true;

      this.dispatchEvent(new CustomEvent('wgt-rendered', {
        bubbles: true,
        composed: true,
        detail: { tag: this.tagName.toLowerCase() }
      }));
    }

    if (this.isRendered && !this.isCompleted) {
      this.dispatchEvent(new CustomEvent('wgt-completed', {
        detail: { tag: this.tagName.toLowerCase() },
        bubbles: true,
        composed: true
      }));
      this.isCompleted = true;
    }
  }

  destroy() {
    // Disconnect ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clear DOM
    this.innerHTML = '';

    // Reset internal state
    this.isRendered = false;
  }
}

customElements.define('wgt-info', WgtInfo);