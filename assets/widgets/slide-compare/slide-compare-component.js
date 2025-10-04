class WgtSlideCompare extends HTMLElement {
  constructor() {
    super();
    this.isCompleted = false
    this.isRendered = false;
    this.adWidgetId = null;
    this.widgetId = null;
    this.widgetOrder = null;

    this.moveSliderThumb = this.moveSliderThumb.bind(this);
    this.hasStarted = false;
    this.hasCompleted = false;
  }

  static get observedAttributes() {
    return [
      'order', 
      'before_src', 
      'after_src', 
      'slider_color', 
      'section_bg_color',
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
      case 'before_src':
        this.play();
        break;
      case 'after_src':
        this.play();
        break;
    }
  }

  connectedCallback() {
    this.resizeObserver = new ResizeObserver(() => this.play());
    this.resizeObserver.observe(this);
    this.play();
  }

  disconnectedCallback() {   
    this.destroy();
  }

  getAttributeValue(attr, fallback = '') {
    const val = this.getAttribute(attr);
    return val !== null ? val : fallback;
  }

  render(){
    const slide_compare_id = `grid-${Math.random().toString(36).substr(2, 5)}`;

    this.adWidgetId = this.getAttribute('ad_widget_id') || slide_compare_id;
    this.widgetId = this.getAttribute('widget_id') || null;

    this.widgetOrder = this.getAttribute('order') || "SlideToCompare";
    this.setAttribute("id", this.widgetOrder);

    const section_bg = this.getAttributeValue('section_bg_color', 'transparent');

    const before_src = this.getAttributeValue('before_src', '');
    const after_src = this.getAttributeValue('after_src', '');
    const slider_color = this.getAttributeValue('slider_color', '#CCCCCC');

    const wrapper = document.createElement('div');
    wrapper.classList.add('slide_compare_wrapper');

    const rangeId = `image-comparison-range-${Math.random().toString(36).substr(2, 5)}`;
    const label = document.createElement('label');

    label.setAttribute('for', rangeId);
    label.classList.add('image-comparison__label');
    label.textContent = 'Move image comparison slider';

    wrapper.appendChild(label);

    const input = document.createElement('input');

    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = '0';
    input.id = rangeId;
    input.setAttribute('data-image-comparison-range', '');

    input.classList.add('image-comparison__range');

    wrapper.appendChild(input);


    const after_image_wrapper = document.createElement('div');
    after_image_wrapper.classList.add('image-comparison__image-wrapper', 'image-comparison__image-wrapper--overlay', 'clipping');
    after_image_wrapper.setAttribute('data-image-comparison-overlay', '');

    const after_image_figure = document.createElement('figure');
    after_image_figure.classList.add('image-comparison__figure');

    if(after_src){
      const after_image = document.createElement('img');
      after_image.setAttribute('src', after_src);
      after_image.classList.add('image-comparison__image');
      after_image_figure.appendChild(after_image);
    }

    after_image_wrapper.appendChild(after_image_figure);
    wrapper.appendChild(after_image_wrapper);

    //SLIDER 
    const slider_line_wrapper = document.createElement('div');
    slider_line_wrapper.classList.add('image-comparison__slider', 'sliding_animation');
    slider_line_wrapper.style.backgroundColor = slider_color;
    slider_line_wrapper.setAttribute('data-image-comparison-slider', '');

    const slider_span = document.createElement('span');
    slider_span.style.backgroundColor = slider_color;
    slider_span.classList.add('image-comparison__thumb');
    slider_span.setAttribute('data-image-comparison-thumb','');

    const svg_slider = '<svg class="image-comparison__thumb-icon" xmlns="https://www.w3.org/2000/svg" width="18" height="10" viewBox="0 0 18 10" fill="currentColor"> <path class="image-comparison__thumb-icon--left" d="M12.121 4.703V.488c0-.302.384-.454.609-.24l4.42 4.214a.33.33 0 0 1 0 .481l-4.42 4.214c-.225.215-.609.063-.609-.24V4.703z"></path> <path class="image-comparison__thumb-icon--right" d="M5.879 4.703V.488c0-.302-.384-.454-.609-.24L.85 4.462a.33.33 0 0 0 0 .481l4.42 4.214c.225.215.609.063.609-.24V4.703z"></path> </svg>';
    slider_span.innerHTML = svg_slider;
    slider_line_wrapper.appendChild(slider_span);
    wrapper.appendChild(slider_line_wrapper);

    // AFTER IMAGE
    const before_image_wrapper = document.createElement('div');
    before_image_wrapper.classList.add('image-comparison__image-wrapper');
    before_image_wrapper.setAttribute('data-image-comparison-overlay', '');

    const before_image_figure = document.createElement('figure');
    before_image_figure.classList.add('image-comparison__figure');

    if(before_src){
      const before_image = document.createElement('img');
      before_image.setAttribute('src', before_src);
      before_image.classList.add('image-comparison__image');
      before_image_figure.appendChild(before_image);
    }

    before_image_wrapper.appendChild(before_image_figure);


    wrapper.appendChild(before_image_wrapper);
    

    this.innerHTML = '';
    wrapper.setAttribute('data-component', 'image-comparison-slider');
    this.appendChild(wrapper);
    const imageComparisonSlider = this.querySelector('[data-component="image-comparison-slider"]')
    this.init(imageComparisonSlider);

    // Container resize
    requestAnimationFrame(() => {
      const beforeImg = this.querySelector('.image-comparison__image-wrapper--overlay img');
      const afterImg = this.querySelector('.image-comparison__image-wrapper:not(.image-comparison__image-wrapper--overlay) img');

      if (beforeImg && afterImg) {
        const beforeRect = beforeImg.getBoundingClientRect();
        const afterRect = afterImg.getBoundingClientRect();

        const width = Math.max(beforeRect.width, afterRect.width);
        const height = Math.max(beforeRect.height, afterRect.height);

        if (wrapper && width > 0 && height > 0) {
          wrapper.style.width = `${width}px`;
          wrapper.style.height = `${height}px`;
        }
        this.setBeforeBackgroundColor(section_bg);
        // console.log('Rendered size:', width, height);
      }
    });


    if (!this.isRendered) {
      this.dispatchEvent(new CustomEvent('wgt-rendered', {
        detail: { tag: this.tagName.toLowerCase() },
        bubbles: true,
        composed: true
      }));
      this.isRendered = true;
    }
  }

  

  setSliderstate(e, element) {
    const sliderRange = element.querySelector('[data-image-comparison-range]');

    if (e.type === 'input') {
      sliderRange.classList.add('image-comparison__range--active');
      return;
    }

    sliderRange.classList.remove('image-comparison__range--active');
    element.removeEventListener('mousemove', this.moveSliderThumb);
  }

  moveSliderThumb(e) {
    // console.log(e);
    this.querySelector(".image-comparison__slider")?.classList?.remove('sliding_animation');
    this.querySelector(".image-comparison__image-wrapper--overlay")?.classList?.remove('clipping');
  }

  moveSliderRange(e, element) {
    const value = e.target.value;
    const slider = element.querySelector('[data-image-comparison-slider]');
    const imageWrapperOverlay = element.querySelector('[data-image-comparison-overlay]');

    slider.style.left = `${value}%`;
    imageWrapperOverlay.style.clipPath = `inset(0 ${100 - value}% 0 0)`;

    element.addEventListener('mousemove', this.moveSliderThumb);
    this.setSliderstate(e, element);

    //Fire SlideStarted only once
    if (!this.hasStarted && value > 0 && value < 25) {
      this.hasStarted = true;
      this.hasCompleted = false;
      // console.log('SlideStarted');
      AdEventTracker?.TriggerEventFromWidgetConfig?.({
        widgetOrder: this.widgetOrder,
        widgetId: this.widgetId,
        adWidgetId: this.adWidgetId,
        eventName: `SlideStarted`,
        widgetTagName: 'wgt-slide-compare'
      });
    }

    //Fire SlideCompleted only once
    if (!this.hasCompleted && value >= 100) {
      this.hasCompleted = true;
      this.hasStarted = false;
      // console.log('SlideCompleted');
      AdEventTracker?.TriggerEventFromWidgetConfig?.({
        widgetOrder: this.widgetOrder,
        widgetId: this.widgetId,
        adWidgetId: this.adWidgetId,
        eventName: `SlideCompleted`,
        widgetTagName: 'wgt-slide-compare'
      });
    }
  }

  setBeforeBackgroundColor(color) {
    const styleId = 'dynamic-style-'+this.widgetOrder;

    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    // console.log(`#${this.widgetOrder}`);
    styleTag.textContent = `
      #${this.widgetOrder} .image-comparison__figure::before {
        background-color: ${color} !important;
      }
    `;
  }

  init(element) {
    const sliderRange = element.querySelector('[data-image-comparison-range]');

    if ('ontouchstart' in window === false) {
      sliderRange.addEventListener('mouseup', e => this.setSliderstate(e, element));
      sliderRange.addEventListener('mousedown', this.moveSliderThumb);
    }

    sliderRange.addEventListener('pointerdown', this.moveSliderThumb);
    sliderRange.addEventListener('input', e => this.moveSliderRange(e, element));
    sliderRange.addEventListener('change', e => this.moveSliderRange(e, element));
  }


  play(){
    this.render();
  }

  destroy(){
    this.remove();
  }

  destroy() {
    // Disconnect observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clear internal state
    this.isRendered = false;

    // Clear DOM
    this.innerHTML = '';
  }
}

customElements.define("wgt-slide-compare", WgtSlideCompare);
