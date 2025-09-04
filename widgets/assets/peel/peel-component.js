class WgtPeel extends HTMLElement {
  // static _overlayWidgetMap = new Map(); 

  constructor() {
    super();
    this._target = null;
    this._peelInstance = null;
    this._peelWrapper = null;
    this._observer = null;
    this._overlayOn = '2';
    this._peelTextElement = null;
    this.isCompleted = false;
    this._resizeHandler = () => this.reset();
    this.isRendered = false;
    this.adWidgetId = null;
    this.widgetId = null;
    this.widgetOrder = null;
  }

  static get observedAttributes() {
    return [
      'order',
      'cover_src',
      'mode',
      'section_bg_color',
      'text',
      'reveal_widget',
      'instruction',
      'ad_widget_id', 
      'widget_id',
    ];
  }
  
  connectedCallback() {
    this.render();
    this.waitForTargetAndInit();
    window.addEventListener('resize', this._resizeHandler);
  }

  disconnectedCallback() {
    this.destroy();
    this._observer?.disconnect();
    window.removeEventListener('resize', this._resizeHandler);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) {
      return; // No change or element not connected
    }

    switch (name) {
      case 'mode':
      case 'reveal_widget':
        this.destroy();
        this.render();
        this.waitForTargetAndInit();
        break;
      case 'cover_src':
      case 'section_bg_color':
      case 'text':
      case 'instruction':
        // Re-render the wrapper/text if already initialized, otherwise wait for target
        if (this._peelWrapper && this._target) {
          this.addPeelTextOverlay(this._peelWrapper.querySelector('.peel-top'));
        } else {
          this.render();
          this.waitForTargetAndInit();
        }
        break;
      case 'order':
      case 'ad_widget_id':
      case 'widget_id':
        this.render(); // Just update internal IDs/order
        break;
    }
  }

  render() {
    this._overlayOn = this.getAttribute('mode') || '2';
    const peel_id = `peel-${Math.random().toString(36).substr(2, 5)}`;
    if (!this.adWidgetId) {
      this.adWidgetId = this.getAttribute('ad_widget_id') || peel_id;
    }
    this.widgetId = this.getAttribute('widget_id') || null;
    this.widgetOrder = this.getAttribute('order') || "PeelAndSurprise";
    this.setAttribute("id", this.widgetOrder);
  }

  waitForTargetAndInit() {
    WidgetController.waitForTargetAndInit(this, this.preparePeelWrapper);
  }

  async preparePeelWrapper(target) {
    const coverImage = this.getAttribute('cover_src');

    if (!target) return console.warn('[wgt-peel] Missing target or cover image');
    if (!coverImage) return console.warn('[wgt-peel] Missing cover image attribute.');


    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    if (target.offsetWidth < 1 || target.offsetHeight < 1) {
      return console.warn('[wgt-peel] Target has no visible size yet.');
    }

    if (this._peelWrapper && this._peelWrapper.isConnected) {
      console.warn('[wgt-peel] Peel wrapper already exists. Skipping.');
      return;
    }

    this.destroy();

    const appendWrapper = () => {
      const currentWidth = target.offsetWidth;
      const currentHeight = target.offsetHeight;

      if (currentWidth < 1 || currentHeight < 1) {
        return console.warn('[wgt-peel] Target has no visible size after ad-render');
      }

      const peelWrapper = document.createElement('div');
      peelWrapper.classList.add(`peel-wrapper`);
      peelWrapper.id = `peel--container-${Date.now()}`;
      Object.assign(peelWrapper.style, {
        width: `${currentWidth}px`, 
        height: `${currentHeight}px`
      });

      const peelContainer = document.createElement('div');
      peelContainer.classList.add(`peel`);

      const peelTop = document.createElement('div');
      // const coverSrc = document.createElement('img');
      peelTop.classList.add(`peel-top`);

      // coverSrc.setAttribute('src',coverImage);
      // coverSrc.classList.add(`cover-image`);

      const peelBack = document.createElement('div');
      peelBack.classList.add(`peel-back`);

      const peelBottom = document.createElement('div');
      peelBottom.classList.add(`peel-bottom`);

      this._target = target;

      const targetOrder = this.getAttribute('reveal_widget') || '__default__';
      const map = WidgetController?._overlayWidgetMap;
      // console.log(map);
      if (!map.has(targetOrder)) {
        map.set(targetOrder, { total: 0, completed: 0 });
      }

      map.get(targetOrder).total += 1;
      this._widgetOrder = targetOrder; // Remember for completion phase

      // peelTop.appendChild(coverSrc);
      peelWrapper.appendChild(peelTop);
      peelWrapper.appendChild(peelBack);
      peelWrapper.appendChild(peelBottom);
      peelWrapper.appendChild(peelContainer);

      peelTop.style.backgroundImage = `url(${coverImage})`;
      peelTop.style.backgroundColor = this.getAttribute('section_bg_color') || 'transparent';
      this.appendChild(peelWrapper);
      const existingWrapper = document.querySelector(
        `wgt-peel[id="${this.widgetOrder}"]`
      );
      if (existingWrapper) {
        console.log("Widget wrapper already exists for:", this.widgetOrder);
        return; // stop here
      }
      target.appendChild(this);

      this._peelWrapper = peelWrapper;

      this.addPeelTextOverlay(peelTop);
      this.startPeelEffect(`#${peelWrapper.id}`, currentWidth, currentHeight, coverImage, this._overlayOn);
    };

    // A small delay to ensure the target is fully rendered and sized
    setTimeout(() => {
      if (!this._peelWrapper) { // Only append if no wrapper already exists from a rapid re-render
        console.log("append");
        appendWrapper();
      }
    }, 300);
  }

  addPeelTextOverlay(parentEl) {
    this._peelTextElement?.remove();
    this._peelTextElement = null;

    const PeelTextHtml = this.getAttribute('text');
    const PeelInstruction = this.getAttribute('instruction');

    if (!PeelTextHtml && !PeelInstruction) {
      return; // No text or instruction provided, no need to add overlay
    }

    const PeelOverlayWrapper = document.createElement('div');
    PeelOverlayWrapper.classList.add(`overlay_wrapper`);

    if (PeelTextHtml) {
      const PeelTextDiv = document.createElement('div');
      PeelTextDiv.classList.add(`text_wrapper`);
      PeelTextDiv.innerHTML = PeelTextHtml;
      PeelOverlayWrapper.appendChild(PeelTextDiv);
    }
    if (PeelInstruction) {
      const PeelInstructionDiv = document.createElement('div');
      PeelInstructionDiv.classList.add(`instruction_wrapper`);
      PeelInstructionDiv.innerHTML = `
        <span class="peel-icon">
          <svg width="40" height="33" viewBox="0 0 40 33" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M33.6845 4.51532C33.2445 4.66532 32.9045 4.80532 32.5545 4.87532C32.3545 4.91532 32.1145 4.84532 31.9145 4.78532C31.6345 4.69532 31.3845 4.70532 31.1645 4.90532C30.8445 5.19532 30.4345 5.25532 30.0345 5.27532C29.8345 5.28532 29.6145 5.20532 29.4345 5.09532C28.9645 4.81532 28.4845 4.91532 28.0045 5.04532C27.6845 5.13532 27.3645 5.26532 27.0545 5.39532C26.4845 5.64532 25.9245 5.69532 25.3045 5.57532C24.9345 5.49532 24.5445 5.54532 24.1645 5.57532C23.5245 5.61532 22.8745 5.67532 22.2345 5.74532C22.0845 5.76532 21.9045 5.79532 21.7945 5.89532C21.4345 6.21532 20.9945 6.30532 20.5445 6.35532C20.2145 6.40532 19.8845 6.46532 19.5645 6.48532C19.3245 6.50532 19.0845 6.46532 18.8445 6.46532C18.6945 6.46532 18.5445 6.49532 18.4145 6.54532C18.2345 6.61532 18.0745 6.71532 17.8945 6.79532C17.5845 6.93532 17.2845 6.89532 16.9645 6.80532C16.7845 6.75532 16.5745 6.76532 16.3745 6.76532C16.1345 6.76532 15.8945 6.79532 15.6545 6.81532C15.4645 6.83532 15.2745 6.84532 15.0845 6.87532C14.4545 6.97532 13.8145 7.08532 13.1845 7.20532C13.0445 7.23532 12.8945 7.30532 12.7845 7.39532C12.4745 7.68532 12.1345 7.87532 11.6945 7.78532C11.4745 7.74532 11.3145 7.80532 11.1545 7.96532C11.0845 8.03532 10.9345 8.06532 10.8345 8.05532C10.5145 8.04532 10.1945 7.94532 9.88446 7.96532C9.61446 7.98532 9.31446 8.07532 9.08446 8.22532C8.87446 8.38532 8.69446 8.46532 8.43446 8.37532C8.19446 8.28532 8.00446 8.30532 7.81446 8.54532C7.70446 8.68532 7.44446 8.73532 7.24446 8.74532C6.94446 8.76532 6.64446 8.71532 6.35446 8.68532C6.34446 8.66532 6.33446 8.63532 6.32446 8.61532C6.72446 8.42532 7.13446 8.24532 7.54446 8.06532C7.60446 8.03532 7.71446 8.02532 7.74446 7.96532C7.89446 7.67532 8.15446 7.66532 8.43446 7.63532C8.50446 7.62532 8.58446 7.62532 8.62446 7.58532C8.98446 7.25532 9.46446 7.22532 9.91446 7.15532C10.0945 7.12532 10.1545 7.06532 10.1845 6.89532C10.2445 6.55532 10.5245 6.32532 10.8745 6.37532C11.3345 6.43532 11.7145 6.35532 12.0645 6.03532C12.3645 5.75532 12.7645 5.67532 13.1645 5.62532C13.7245 5.55532 14.2945 5.52532 14.8645 5.45532C15.0345 5.43532 15.2045 5.35532 15.3645 5.28532C15.5145 5.21532 15.6445 5.11532 15.7745 5.01532C16.0545 4.80532 16.3645 4.80532 16.7045 4.81532C17.1245 4.82532 17.5445 4.74532 17.9645 4.69532C18.2345 4.66532 18.4945 4.58532 18.7645 4.59532C19.3345 4.61532 19.8545 4.51532 20.2645 4.07532C20.3345 4.00532 20.4745 3.99532 20.5945 3.98532C20.6745 3.97532 20.7645 4.00532 20.8445 4.04532C21.1745 4.20532 21.4545 4.14532 21.6945 3.87532C21.8445 3.71532 22.0045 3.72532 22.1845 3.80532C22.5745 3.97532 22.9645 4.10532 23.4145 4.08532C23.7045 4.07532 23.8845 3.90532 24.1145 3.79532C24.2845 3.71532 24.4845 3.65532 24.6745 3.64532C25.3545 3.60532 26.0445 3.55532 26.7245 3.58532C27.2045 3.60532 27.7045 3.71532 28.1645 3.86532C28.5445 3.98532 28.8845 4.05532 29.2545 3.88532C29.4645 3.79532 29.6645 3.82532 29.8645 3.91532C30.0845 4.01532 30.3045 4.10532 30.5345 4.18532C31.0545 4.35532 31.5545 4.41532 32.0645 4.11532C32.1945 4.03532 32.4145 4.05532 32.5745 4.10532C32.9245 4.19532 33.2645 4.34532 33.6845 4.51532Z" fill="white"/>
            <path d="M29.3445 8.52515C28.9145 9.15515 28.3645 9.27515 27.7345 9.07515C27.4945 8.99515 27.2845 9.00515 27.0845 9.15515C26.8845 9.30515 26.6745 9.35515 26.4345 9.28515C26.3545 9.26515 26.2545 9.23515 26.1745 9.25515C25.7345 9.35515 25.3245 9.35515 24.9345 9.07515C24.8845 9.04515 24.7345 9.10515 24.6645 9.16515C24.2445 9.49515 23.8245 9.48515 23.4245 9.17515C23.1645 8.98515 22.9545 8.95515 22.7345 9.20515C22.6145 9.34515 22.4545 9.37515 22.2945 9.28515C21.9945 9.11515 21.6745 9.18515 21.3645 9.23515C20.9245 9.29515 20.4945 9.35515 20.0545 9.37515C19.6145 9.39515 19.2145 9.44515 18.9545 9.86515C18.9145 9.92515 18.7545 9.93515 18.6645 9.91515C18.4445 9.86515 18.2245 9.73515 18.0045 9.90515C17.8645 10.0151 17.7345 10.1452 17.6345 10.2852C17.5345 10.4352 17.4245 10.4652 17.2445 10.5052C16.7245 10.6152 16.2345 10.5052 15.7245 10.4852C15.3845 10.4752 15.0445 10.5452 14.7045 10.6052C14.6445 10.6152 14.5745 10.6852 14.5345 10.7452C14.4145 10.9952 14.2045 11.0152 13.9745 10.9752C13.5345 10.8952 13.0945 10.8152 12.6545 10.7252C12.6745 10.6852 12.6945 10.5752 12.7445 10.5552C13.1545 10.3452 13.4045 9.87515 13.9245 9.84515C14.1445 9.83515 14.3645 9.75515 14.5845 9.73515C15.2045 9.67515 15.7245 9.29515 16.3245 9.18515C16.5945 9.13515 16.9045 9.11515 17.1745 9.17515C17.6445 9.28515 18.0445 9.25515 18.4945 8.98515C18.9445 8.70515 19.4845 8.72515 19.9945 8.94515C20.0945 8.98515 20.2645 8.99515 20.3245 8.93515C20.6045 8.67515 20.9345 8.67515 21.2445 8.77515C21.7245 8.93515 22.1345 8.84515 22.5245 8.57515C22.8145 8.36515 23.0845 8.39515 23.3845 8.54515C23.4745 8.59515 23.6145 8.61515 23.7145 8.59515C24.6045 8.38515 25.5045 8.23515 26.4145 8.21515C26.5945 8.21515 26.7845 8.16515 26.9645 8.17515C27.1745 8.18515 27.4045 8.19515 27.6045 8.27515C27.8745 8.38515 28.1245 8.39515 28.4145 8.37515C28.6945 8.34515 29.0045 8.46515 29.3445 8.52515Z" fill="white"/>
            <path d="M28.8846 27.5754C28.4746 27.8354 28.0746 28.1254 27.6446 28.3554C26.8946 28.7554 26.0746 28.9354 25.2246 28.9454C24.3446 28.9554 23.4546 28.9754 22.5746 28.9554C21.0346 28.9254 19.7246 28.3254 18.6346 27.2554C16.3046 24.9654 13.9846 22.6754 11.6646 20.3754C10.8246 19.5454 10.9846 18.3254 12.0046 17.7354C12.9146 17.2054 13.8946 17.2654 14.7646 17.9054C15.8246 18.6754 16.8846 19.4354 17.9446 20.1954C18.0046 20.2354 18.0646 20.2754 18.1546 20.3254C18.1546 20.2154 18.1646 20.1254 18.1646 20.0354C18.1446 16.8054 18.1246 13.5754 18.0946 10.3554C18.0946 9.79541 18.2346 9.30541 18.5846 8.86541C19.1946 8.09541 20.5346 7.93541 21.3046 8.54541C21.8646 8.99541 22.1346 9.56541 22.1346 10.2754C22.1346 11.0354 22.1446 11.7854 22.1446 12.5454C22.1446 12.6154 22.1546 12.6954 22.1546 12.7954C22.7846 12.4954 23.4046 12.4754 24.0146 12.7754C24.6346 13.0754 24.9846 13.5954 25.1246 14.2854C25.7546 13.9754 26.3846 13.9454 27.0146 14.2554C27.6346 14.5654 27.9846 15.0754 28.1246 15.7654C28.5046 15.5854 28.8846 15.4854 29.2946 15.5254C30.3546 15.6354 31.1646 16.4854 31.1346 17.5554C31.0746 19.5854 30.9846 21.6154 30.8746 23.6454C30.8146 24.7954 30.3846 25.8154 29.6846 26.7254C29.6446 26.7854 29.6046 26.8454 29.5646 26.9154C29.3346 27.1254 29.1146 27.3454 28.8846 27.5754ZM16.0546 23.2254C17.1446 24.2954 18.2346 25.3654 19.3146 26.4454C20.2546 27.3754 21.3646 27.8954 22.6946 27.9154C23.6146 27.9254 24.5446 27.9254 25.4646 27.8854C27.7046 27.7754 29.6446 25.9054 29.8146 23.6654C29.9246 22.2254 29.9546 20.7854 30.0146 19.3354C30.0446 18.7354 30.0746 18.1454 30.0846 17.5454C30.0946 17.0054 29.6946 16.5854 29.1646 16.5654C28.6546 16.5454 28.2146 16.9254 28.1646 17.4454C28.1546 17.5254 28.1546 17.6154 28.1346 17.6954C28.0846 17.9254 27.9446 18.0654 27.7146 18.1054C27.5046 18.1454 27.2746 18.0454 27.1846 17.8454C27.1346 17.7354 27.1146 17.5954 27.1046 17.4754C27.0946 17.0154 27.0946 16.5554 27.0946 16.0954C27.0946 15.7154 26.9346 15.4054 26.5946 15.2154C25.9546 14.8554 25.1946 15.2954 25.1646 16.0454C25.1446 16.5554 25.1746 17.0554 25.1646 17.5654C25.1646 17.9054 24.9446 18.1354 24.6446 18.1354C24.3446 18.1454 24.1346 17.9254 24.1046 17.5754C24.1046 17.5154 24.1046 17.4554 24.1046 17.3954C24.0946 16.4854 24.0946 15.5654 24.0846 14.6554C24.0846 14.2854 23.9646 13.9754 23.6346 13.7654C23.3146 13.5654 22.9746 13.5554 22.6446 13.7454C22.2946 13.9454 22.1446 14.2554 22.1546 14.6454C22.1646 15.5854 22.1646 16.5154 22.1746 17.4554C22.1746 17.5554 22.1746 17.6654 22.1446 17.7654C22.0946 17.9754 21.9446 18.1054 21.7346 18.1354C21.5246 18.1754 21.3246 18.1054 21.2346 17.9154C21.1646 17.7754 21.1246 17.6054 21.1246 17.4454C21.1046 15.0854 21.0846 12.7254 21.0746 10.3654C21.0746 10.2554 21.0746 10.1354 21.0546 10.0254C20.9546 9.30541 20.1046 8.95541 19.5246 9.40541C19.2146 9.63541 19.1346 9.95541 19.1346 10.3254C19.1646 13.9654 19.1846 17.5954 19.2146 21.2354C19.2146 21.4954 19.1646 21.7154 18.9146 21.8454C18.6746 21.9654 18.4646 21.8754 18.2646 21.7254C17.5946 21.2454 16.9346 20.7654 16.2646 20.2854C15.4946 19.7354 14.7346 19.1754 13.9546 18.6454C13.4546 18.3054 12.8246 18.3654 12.3846 18.7554C12.1346 18.9754 12.1146 19.2554 12.3146 19.5154C12.3746 19.5854 12.4346 19.6554 12.4946 19.7154C13.6846 20.8854 14.8646 22.0554 16.0546 23.2254Z" fill="white"/>
          </svg>
        </span>
        <span class="peel-instruction-text">${PeelInstruction}</span>
      `;
      PeelOverlayWrapper.appendChild(PeelInstructionDiv);
    }

    parentEl.appendChild(PeelOverlayWrapper);
    this._peelTextElement = PeelOverlayWrapper;

    requestAnimationFrame(() => {
      const textContainer = PeelOverlayWrapper.querySelector('.instruction_wrapper .peel-instruction-text');
      if (textContainer) {
        // find the first child element (any tag) inside .peel-instruction-text
        const childEl = textContainer.firstElementChild;
        if (childEl) {
          const computedColor = getComputedStyle(childEl).color;
          console.log('Fetched color:', computedColor);

          const svgPaths = PeelOverlayWrapper.querySelectorAll('.instruction_wrapper svg path');
          svgPaths.forEach(path => path.setAttribute('fill', computedColor));
        }
      }
    });

  }

  async startPeelEffect(containerSelector, width, height, coverImageSrc, mode) {
    try {
      const Self = this;
      var p = new Peel(containerSelector, {
        corner: Peel.Corners.TOP_LEFT
      });
      this._peelInstance = p;
      p.setPeelPosition(100, 100);
      p.setFadeThreshold(.7);

      p.t = 0;
      var tween = new TweenLite(p, 1.5, {
        t:1,
        paused:true,
        ease: Power2.easeIn,
        onUpdate: function() {
          p.setTimeAlongPath(this.target.t);
          // Completion logic
          if (p.getAmountClipped() === 1) {
            console.log("completed");

            AdEventTracker?.TriggerEventFromWidgetConfig?.({
              widgetOrder: this.widgetOrder,
              widgetId: this.widgetId,
              adWidgetId: Self.adWidgetId,
              eventName: `PeelCompleted`,
              widgetTagName: 'wgt-peel'
            });
            Self.handlePlay();
            p.removeEvents();
            Self.destroy();
          }
        },
      });

      let autoPeelTriggered = false;

      p.handleDrag(function (evt, x, y) {
        AdEventTracker?.TriggerEventFromWidgetConfig?.({
          widgetOrder: this.widgetOrder,
          widgetId: this.widgetId,
          adWidgetId: Self.adWidgetId,
          eventName: `PeelStarted`,
          widgetTagName: 'wgt-peel'
        });

        this.setPeelPosition(x, y);
        p.setPeelPath(x, y, (width*2), (height*2));

        const distance = Math.sqrt(x * x + y * y);
        const diagonal = Math.sqrt(width * width + height * height);
        const progress = distance / diagonal;

        if (!autoPeelTriggered && progress >= 0.3) {
          autoPeelTriggered = true;
          tween.play();
        }
      });

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
    } catch (err) {
      console.error('[wgt-peel] peel init error:', err.message);
    }
  }

  handlePlay() {
    WidgetController.handlePlay(this);
  }

  destroy() {
    this._peelWrapper?.remove();
    this._peelTextElement?.remove();
    this.remove();

    this._peelInstance?.removeEvents();

    this._peelInstance = null;
    this._peelWrapper = null;
    this._peelTextElement = null;
    this.isRendered = false;
    this.isCompleted = false;
  }

  reset() {
    this.destroy();
    this.waitForTargetAndInit();
  }
}

customElements.define('wgt-peel', WgtPeel);