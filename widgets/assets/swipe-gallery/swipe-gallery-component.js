class SwipeLogoGallery extends HTMLElement {
  constructor() {
    super();
    this.swiperInstance = null;
    this.items = [];
    this.viewedItems = new Set();
    this.isRendered = false; 
    this.isCompleted = false;
    this.adWidgetId = null;
    this.widgetId = null;
    this.widgetOrder = null;
  }

  static get observedAttributes() {
    return [
      'order',
      'section_bg_color', 
      'logo_position', 
      'logo_src', 
      'headline', 
      'item_bg_color', 
      'item_border_color', 
      'item_border_style', 
      'item_layout', 
      'items', 
      'ad_widget_id', 
      'widget_id',
      'paused'
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
        let oldItems = [];
        let newItems = [];

        try {
          newItems = JSON.parse(newValue);
          oldItems = oldValue ? JSON.parse(oldValue) : [];
        } catch (e) {
          console.error('Invalid JSON in items attribute');
          newItems = [];
          oldItems = [];
        }

        this.items = newItems;

        const hadItems = oldItems.length > 0;
        const hasItems = newItems.length > 0;

        if (hasItems && newItems.length > oldItems.length) {
          // New items added
          this.render();
        } else if (hasItems && newItems.length < oldItems.length) {
          // Items removed, but still have some
          this.render();
        } else if (!hasItems) {
          // All items removed
          this.destroy(); // Only call if destroy method exists
        }
        break;
      case 'logo_position':
      case 'logo_src':
      case 'headline':
      case 'item_bg_color':
      case 'item_border_color':
      case 'item_border_style':
      case 'item_layout':
        this.render();
        break;
      case 'paused':
        this.isOverlayActive = newValue === 'true';
        // this._updateAutoplayState(); 
        this.play();
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

  render(){
    this.isRendered = false;
    
    const width = this.clientWidth;
    const height = this.clientHeight;

    const swiper_id = `swiper-${Math.random().toString(36).substr(2, 5)}`;

    const logo_src = this.getAttribute('logo_src');
    const logo_position = this.getAttributeValue('logo_position', 'left');
    const headline = this.getAttributeValue('headline', '');

    const item_border_color = this.getAttributeValue('item_border_color', '');
    const item_bg_color = this.getAttributeValue('item_bg_color', '');
    const item_border_style = this.getAttributeValue('item_border_style', '0');
    const item_layout = this.getAttributeValue('item_layout', '1');
    if (!this.adWidgetId) {
      this.adWidgetId = this.getAttribute('ad_widget_id') || swiper_id;
    }
    this.widgetId = this.getAttribute('widget_id') || null;
    this.widgetOrder = this.getAttribute('order') || "SwiperGallery";
    this.setAttribute("id", this.widgetOrder);

    if (!this.items || this.items.length === 0) {
      this.destroy();
      return;
    }

    const total = 100;
    // logo section size
    const LogoPct = logo_src ? 20 : 0;
    const swiperPct = total - LogoPct;

    // headline section size
    const headlinePct = headline ? 20 : 0;
    const galleryPct = total - headlinePct;

    const wrapper = document.createElement('div');
    wrapper.className = 'wgt-gallery-wrapper';

    const swiperContainer = document.createElement('div');
    swiperContainer.className = 'swiper-container';
    swiperContainer.style.height = `${galleryPct}%`;

    if(headline){
      const headlineWrapper = document.createElement('div');
      headlineWrapper.className = 'headline-wrapper';

      headlineWrapper.innerHTML = headline;

      wrapper.appendChild(headlineWrapper);
    }

    if(logo_src){
      const logoWrapper = document.createElement('div');
      logoWrapper.className = 'logo-wrapper';

      const img = document.createElement('img');
      img.className = 'logo';
      img.src = logo_src;
      img.alt = 'Logo';

      logoWrapper.appendChild(img);
      swiperContainer.appendChild(logoWrapper);
      if ((logo_position === "right") && (!swiperContainer.classList.contains('row-reverse'))) {
        swiperContainer.classList.add('row-reverse');
      }
    }

    // swiper
    const swiper = document.createElement('div');
    swiper.className = 'swiper-wrapper-div';
    swiper.style.width = `${swiperPct}%`;

    const swiperWrapper = document.createElement('div');
    swiperWrapper.classList.add(`swiper-wrapper`);
    
    const isSingleSlide = this.items.length === 1;
    // console.log("slide"+isSingleSlide);

    this.items.forEach(item => {
      const itemWrapper = document.createElement('div');
      itemWrapper.className = 'item-wrapper';
      itemWrapper.classList.add(`swiper-slide`);
      if (isSingleSlide) {
        itemWrapper.classList.add('single-slide');
      }
      
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'content-wrapper';
      contentWrapper.setAttribute("item-id", item['item_id'])
      contentWrapper.style.backgroundColor = item_bg_color;
      contentWrapper.style.borderColor = item_border_color;
      contentWrapper.style.borderRadius = item_border_style+"px";

      contentWrapper.classList.remove('l-content', 'v-content');
      contentWrapper.classList.add((height < width) ? 'l-content' : 'v-content');

      if (item['cta_url']) {
        // contentWrapper.href = item['cta_url'];
        // contentWrapper.target = '_blank';
        // contentWrapper.rel = 'noopener noreferrer';

        //Add tracking
        contentWrapper.addEventListener('click', () => {
          AdEventTracker?.TriggerEventFromWidgetConfig?.({
            widgetOrder: this.widgetOrder,
            widgetId: this.widgetId,
            adWidgetId: this.adWidgetId,
            eventName: `ItemClick_${item["item_id"] ?? 'unknown'}`,
            widgetTagName: 'wgt-swiper-gallery',
            clickUrl:item['cta_url']
          });
        });
      }

      const hasImage = !!item['image_src'];
      const hasText = !!item['text'];

      if(hasImage){
        const imageblock = document.createElement('div');
        imageblock.className = 'image-block';
        const img = document.createElement('img');
        img.src = item['image_src'];
        imageblock.appendChild(img)
        contentWrapper.appendChild(imageblock);
        if (hasText && contentWrapper.classList.contains('v-content')) {
          imageblock.style.height = '50%';
        }
        if (hasText && contentWrapper.classList.contains('l-content')) {
          imageblock.style.width = '50%';
        }
      }

      if(hasText){
        const text = document.createElement('div');
        text.className = 'text-content';
        const contentBox = document.createElement('div');
        contentBox.className = 'content-box';
        contentBox.innerHTML = item['text'];
        text.appendChild(contentBox);
        contentWrapper.appendChild(text);

        if (hasImage && contentWrapper.classList.contains('v-content')) {
          text.style.maxHeight = '50%';
        }
      }

      if (item_layout == 2) {
        if((contentWrapper.classList.contains('v-content')) && (!contentWrapper.classList.contains('col-reverse'))){
          contentWrapper.classList.add('col-reverse');
        }
        else if((contentWrapper.classList.contains('l-content')) && (!contentWrapper.classList.contains('row-reverse'))){
          contentWrapper.classList.add('row-reverse');
        }
      }
      
        
      itemWrapper.appendChild(contentWrapper);
      swiperWrapper.appendChild(itemWrapper);
    });


    if(!isSingleSlide){
      const swiperArrows = document.createElement('div');
      swiperArrows.className = 'swiper-button-next';
      
      swiper.appendChild(swiperArrows)
    }

    swiper.appendChild(swiperWrapper);

    swiper.classList.add(`swiper`,`swiper-${swiper_id}`);
    swiperContainer.appendChild(swiper);
    

    wrapper.appendChild(swiperContainer);

    this.innerHTML = '';
    this.appendChild(wrapper);

    // Safely wait for layout before initializing Swiper
    if(!isSingleSlide){
      this.waitForStableSize(() => {
        this.waitForSwiper(() => {
          this.initSwiper(swiper_id);
        });
      });
    }else {
      this.swiperInstance = null;
    }
  }
  
  initSwiper(swiper_id) {
    if (typeof Swiper === 'undefined') {
      AdEventTracker?.ErrorLogger?.log?.('Swiper Gallery', 'Swiper container missing');
      return;
    }

    const swiperBlock = this.querySelector(`.swiper-${swiper_id}`);
    const wrapperDiv = this.querySelector('.swiper-wrapper-div');

    if (!swiperBlock || !wrapperDiv) return;

    const wrapperWidth = wrapperDiv.clientWidth;
    let slidesPerView;

    if (this.items.length > 2) {
      if (wrapperWidth < 200) {
        slidesPerView = 1;
      } else if (wrapperWidth > 350) {
        slidesPerView = 2;
      } else {
        slidesPerView = 1.3;
      }
    } else {
      slidesPerView = 1;
    }


    if (this.swiperInstance) {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }

    try {
      let lastRealIndex = 0;
      this.swiperInstance = new Swiper(swiperBlock, {
        loop: true,
        autoplay: {
          delay: 2500,
          disableOnInteraction: true,
          enabled: false
        },
        slidesPerView,
        spaceBetween: 10,
        navigation: {
          nextEl: this.querySelector('.swiper-button-next')
        },
        on: {
          init: (swiper) => {
            this.dispatchRenderedEvent();  // Only dispatch when Swiper finishes setup
            lastRealIndex = swiper.realIndex;
          },
          touchEnd: (swiper) => {
            if (Math.abs(swiper.touches.diff)) {
              AdEventTracker?.TriggerEventFromWidgetConfig?.({
                widgetOrder: this.widgetOrder,
                widgetId: this.widgetId,
                adWidgetId: this.adWidgetId,
                eventName: 'Swiped',
                widgetTagName: 'wgt-swiper-gallery'
              });
            }
          },
          slideChange: (swiper) => {
            if (swiper.realIndex !== lastRealIndex) {
               lastRealIndex = swiper.realIndex;
              const activeSlide = swiper.slides[swiper.activeIndex];
              if (!activeSlide) return;

              const contentWrapper = activeSlide.querySelector('.content-wrapper');
              if (!contentWrapper) return;

              const itemId = contentWrapper.getAttribute('item-id');
              if (!itemId || this.viewedItems.has(itemId)) return;

              this.viewTracker(itemId);
            }
          }
        }
      });
      
    } catch (err) {
      AdEventTracker?.ErrorLogger?.log?.('Swiper Gallery', err);
    }
  }

  viewTracker(itemId){
    this.viewedItems.add(itemId);
    AdEventTracker?.TriggerEventFromWidgetConfig?.({
      widgetOrder: this.widgetOrder,
      widgetId: this.widgetId,
      adWidgetId: this.adWidgetId,
      eventName: `ItemView_${itemId ?? 'unknown'}`,
      widgetTagName: 'wgt-swiper-gallery'
    });
  }

  waitForSwiper(callback, retries = 5) {
    if (typeof Swiper !== 'undefined') {
      callback();
    } else if (retries > 0) {
      setTimeout(() => this.waitForSwiper(callback, retries - 1), 100);
    } else {
      console.warn('Swiper not available after waiting');
    }
  }

  waitForStableSize(callback, attempts = 5) {
    const check = () => {
      const width = this.clientWidth;
      const height = this.clientHeight;

      if (width > 0 && height > 0) {
        callback();
      } else if (attempts > 0) {
        requestAnimationFrame(() => setTimeout(check, 50));
      } else {
        console.warn('wgt-swiper-gallery: failed to detect stable size');
      }
    };

    check();
  }

  dispatchRenderedEvent() {
    if (this.isRendered) return;
    this.isRendered = true;

    this.dispatchEvent(new CustomEvent('wgt-rendered', {
      bubbles: true,
      composed: true,
      detail: { tag: this.tagName.toLowerCase() }
    }));

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
    if (!this.hasAttribute('paused') || this.getAttribute('paused') !== 'true') {
      // for single slide
      if (this.items.length === 1 && this.items[0] && !this.viewedItems.has(this.items[0]['item_id'])) {
        const singleItemId = this.items[0]['item_id'];
        this.viewTracker(singleItemId);
      }

      if (this.swiperInstance && this.swiperInstance.autoplay) {
        console.log("autoplay");
        this.swiperInstance.autoplay.start();
        this.viewTracker(this.swiperInstance.activeIndex);
      }
    }
    else{
      // Stop autoplay immediately after init
      this.swiperInstance.autoplay.stop();
    }
  }

  pause() {
    if (this.swiperInstance && this.swiperInstance.autoplay) {
      this.swiperInstance.autoplay.stop();
    }
  }

  resume() {
    this.play(); // Resume is same as play in Swiper
  }

  destroy() {
    if (this.swiperInstance) {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.items = [];
    this.viewedItems.clear();
    this.isRendered = false;

    this.innerHTML = '';
  }
}

customElements.define('wgt-swiper-gallery', SwipeLogoGallery);
