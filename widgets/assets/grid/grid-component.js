class WgtGrid extends HTMLElement {
  constructor() {
    super();
    this.items = [];
    this.played = false; 
    this.isRendered = false;
    this.isCompleted = false;
    this.adWidgetId = null;
    this.widgetId = null;
    this.widgetOrder = null;
  }

  static get observedAttributes() {
    return [
      'order', 'section_bg_color', 'logo_src', 'logo_position', 'headline', 'cta_text', 'cta_url', 'cta_position', 'items', 'item_border_color', 'item_bg_color', 'item_border_style', 'item_layout', 'item_animation', 'ad_widget_id', 'widget_id', 'paused'
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
      case 'items':
        try {
          this.items = JSON.parse(newValue);
        } catch (e) {
          console.error('Invalid JSON in items attribute');
          this.items = [];
        }
        this.render(); // Only render if data actually changes
        break;
      case 'logo_position':
      case 'logo_src':
      case 'headline':
      case 'item_bg_color':
      case 'item_border_color':
      case 'item_border_style':
      case 'item_layout':
      case 'cta_text':
      case 'cta_position':
      case 'cta_url':
        this.render();
        break;
      case 'item_animation':
        this.render();
        break;
      case 'paused':
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
    // this.destroy();
  }

  getAttributeValue(attr, fallback = '') {
    const val = this.getAttribute(attr);
    return val !== null ? val : fallback;
  }

  getOptimalColumns(count) {
    if (count === 1) return 1;
    if (count === 2 || count === 4) return 2;
    return 3;
  }

  render() {
    const itemCount = this.items.length;
    const width = this.clientWidth;
    const height = this.clientHeight;

    // Define what "square-ish" means — e.g., width is not more than 1.2x height
    const aspectRatio = width / height;
    const isLandscape = aspectRatio > 1.2;

    let columns, rows;

    const isTiny = width < 180 && height < 150;
    const isNarrow = width < 250;
    const isVeryTall = height / width > 2.5;

    // Force 1-column layout only if it's both narrow and very tall,
    if (isNarrow && isVeryTall) {
      columns = 1;
      rows = itemCount;
    } else if (isLandscape) {
      columns = itemCount;
      rows = 1;
    } else {
      columns = this.getOptimalColumns(itemCount);
      rows = Math.ceil(itemCount / columns);
    }

    const grid_id = `grid-${Math.random().toString(36).substr(2, 5)}`;

    const item_border_color = this.getAttributeValue('item_border_color', '');
    const item_bg_color = this.getAttributeValue('item_bg_color', '');
    const item_border_style = this.getAttributeValue('item_border_style', 0);
    const item_layout = this.getAttributeValue('item_layout', '1');
    const item_animation_type = this.getAttributeValue('item_animation', ''); 

    const logo_url = this.getAttribute('logo_src');
    const logo_position = this.getAttributeValue('logo_position', 'left');
    const headline = this.getAttributeValue('headline', '');

    const cta_text = this.getAttribute('cta_text');
    const cta_align = this.getAttributeValue('cta_position', 'left');
    const cta_link = this.getAttributeValue('cta_url', '');

    const section_bg = this.getAttributeValue('section_bg_color', 'transparent');

    this.adWidgetId = this.getAttribute('ad_widget_id') || grid_id;
    this.widgetId = this.getAttribute('widget_id') || null;
    this.widgetOrder = this.getAttribute('order') || "Grid";
    this.setAttribute("id", this.widgetOrder);

    const hasHeader = logo_url || headline;
    const hasCTA = !!cta_text;

    const total = 100;
    const headerPct = hasHeader ? 10 : 0;
    const ctaPct = hasCTA ? 10 : 0;
    const gridPct = total - headerPct - ctaPct;

    const wrapper = document.createElement('div');
    wrapper.className = 'wgt-grid-wrapper';
    wrapper.style.backgroundColor = section_bg;

    // Header
    if (hasHeader) {
      const header = document.createElement('div');
      header.className = 'wgt-header';
      header.style.height = `${headerPct}%`;
      header.style.flexDirection = logo_position === 'right' ? 'row-reverse' : 'row';

      if (logo_url) {
        const logo = document.createElement('img');
        logo.src = logo_url;
        logo.className = 'wgt-logo';
        header.appendChild(logo);
      }

      if (headline) {
        const h1 = document.createElement('h1');
        h1.innerHTML = headline;
        header.appendChild(h1);
      }

      wrapper.appendChild(header);
    }

    // Grid
    const grid = document.createElement('div');
    grid.className = 'grid-container';
    grid.style.height = `${gridPct}%`;
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    this.items.forEach(item => {
      const div = document.createElement('div');
      div.className = `grid-item`;
      if (!this.hasAttribute('paused') || this.getAttribute('paused') === 'false') {
        div.classList.add(`animate-${item_animation_type}`);
        if (this.played) {
          div.classList.add(`animate-${item_animation_type}`);
          div.style.animationDelay = `${item.id * 0.1}s`; // 100ms stagger
          div.style.animationFillMode = 'both';
        }
      }
      const itemChild = document.createElement('div');
      itemChild.className = `grid-itemChild`;
      itemChild.style.background = item_bg_color;
      if(item_border_color){
        itemChild.style.border = `1px solid ${item_border_color}`;
      }
      itemChild.style.borderRadius = item_border_style+"px";

      const contentWrapper = document.createElement('div');
      if (item["cta_url"]) {
        // contentWrapper.href = item["cta_url"];
        // contentWrapper.target = '_blank';
        // contentWrapper.rel = 'noopener noreferrer';

        // Add click listener here to track the event with id
        contentWrapper.addEventListener('click', () => {
          AdEventTracker?.TriggerEventFromWidgetConfig?.({
            widgetOrder: this.widgetOrder,
            widgetId: this.widgetId,
            adWidgetId: this.adWidgetId,
            eventName: `ItemClick_${item["item_id"] ?? 'unknown'}`,
            widgetTagName: 'wgt-grid',
            clickUrl:item["cta_url"]
          });
        });
      }

      contentWrapper.className = 'grid-content';
      contentWrapper.style.flexDirection = item_layout ? 'column' : 'column-reverse';

      const img = document.createElement('img');
      img.src = item["image_src"] || '';
      img.alt = item["item_id"] || '';
      // img.style.height = '80%';
      // img.style.width = '100%';

      const title = document.createElement('div');
      title.className = 'title';
      title.innerHTML = item["text"] || '';

      if (item_layout) {
        contentWrapper.appendChild(img);
        contentWrapper.appendChild(title);
      } else {
        contentWrapper.appendChild(title);
        contentWrapper.appendChild(img);
      }

      itemChild.appendChild(contentWrapper);
      div.appendChild(itemChild);
      grid.appendChild(div);
    });

    wrapper.appendChild(grid);

    // CTA
    if (hasCTA) {
      const ctaWrapper = document.createElement('div');
      ctaWrapper.className = 'wgt-ctaWrapper';
      ctaWrapper.style.height = `${ctaPct}%`;
      ctaWrapper.style.display = 'flex';
      ctaWrapper.style.alignItems = 'center';
      ctaWrapper.style.justifyContent = cta_align === 'right' ? 'flex-end' : 'flex-start';

      const cta = document.createElement('div');
      // cta.href = cta_link || '#';
      cta.innerHTML = cta_text;
      cta.className = 'wgt-cta';
      cta.style.paddingLeft = "5px";
      cta.style.paddingRight = "5px";
      // cta.target = '_blank';
      // cta.rel = 'noopener noreferrer';

      // Add click listener here to track the event with id
      cta.addEventListener('click', () => {
        AdEventTracker?.TriggerEventFromWidgetConfig?.({
          widgetOrder: this.widgetOrder,
          widgetId: this.widgetId,
          adWidgetId: this.adWidgetId,
          eventName: `CTAClick`,
          widgetTagName: 'wgt-grid',
          clickUrl:cta_link
        });
      });

      ctaWrapper.appendChild(cta);
      wrapper.appendChild(ctaWrapper);
    }

    this.innerHTML = '';
    this.appendChild(wrapper);

    if (!this.isRendered) {
      this.dispatchEvent(new CustomEvent('wgt-rendered', {
        detail: { tag: this.tagName.toLowerCase() },
        bubbles: true,
        composed: true
      }));
      this.isRendered = true;
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

  play() {
    if (this.played) return; // Only play once
    this.played = true;
    this.render();
  }

  destroy() {
    // Disconnect observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clear internal state
    this.items = [];
    this.played = false;
    this.isRendered = false;

    // Clear DOM
    this.innerHTML = '';
  }
}

customElements.define('wgt-grid', WgtGrid);