class WgtSpinWheel extends HTMLElement {
	constructor() {
		super();
		this.isRendered = false;
		this.isCompleted = false;
		this.widgetOrder = null;
		this.adWidgetId = null;
		this.widgetId = null;

		this.items = [];
		this.rotation = 0;
    	this.isSpinning = false;

		this.hasRenderedWidgetsGroup = false;
		// this._resizeHandler = this._resizeHandler.bind(this);
	}

	static get observedAttributes() {
		return[
			"order",
			"section_bg_color",
			"section_bg_src",
			"bg_image_rendition",
			"instruction",
			"wheel_border_color",
			"pointer_color",
			"transition_animation",
			"items"		
		];
	}

	connectedCallback() {
	    this.render();
	    // window.addEventListener('resize', this._resizeHandler);
	}

	disconnectedCallback() {
		this.destroy();
		this._observer?.disconnect();
		console.log('Spin wheel removed from DOM');
		// window.removeEventListener('resize', this._resizeHandler);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;

	    switch (name) {
	      case 'items':
	      	this.items = JSON.parse(newValue);
	  			this.render();
	        break;
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
	      case 'bg_image_rendition':
	      case 'instruction':
	      case 'wheel_border_color':
	      case 'pointer_color':
	      case 'transition_animation':
			this.render();
	        break;
	    }
	}

	render() {
		const spin_wheel_id = `spin_wheel-${Math.random().toString(36).substr(2, 5)}`;
		
		const bg_image_rendition = this.getAttribute('bg_image_rendition');
		WidgetController?.applyImageScaling(this, bg_image_rendition);

		if (!this.adWidgetId) {
	      this.adWidgetId = this.getAttribute('ad_widget_id') || spin_wheel_id;
	    }
	    this.widgetId = this.getAttribute('widget_id') || null;
	    this.widgetOrder = this.getAttribute('order') || "SpinWheel";
	    this.setAttribute("id", this.widgetOrder);

		const instruction = this.getAttribute('instruction');
		const wheel_border_color = this.getAttribute('wheel_border_color');
		const pointer_color = this.getAttribute('pointer_color');

		const transition_animation = this.getAttribute("transition_animation");


		const wrapper = document.createElement('div');
		wrapper.className = 'spin-wheel-wrapper';

		// spin block
		const spinContainer = document.createElement('div');
		spinContainer.className = 'spin-container';
		const interactionInnerDiv = document.createElement('div');
		interactionInnerDiv.className = 'layout';

		if(!instruction){
			spinContainer.style.height = '100%';
		}

		spinContainer.appendChild(interactionInnerDiv);
		wrapper.appendChild(spinContainer);

		// instruction block
		if (instruction) {
			const instructionContainer = document.createElement('div');
			instructionContainer.className = 'instruction-block';
			const instructionInnerDiv = document.createElement('div');
			instructionInnerDiv.innerHTML = instruction;
			instructionContainer.appendChild(instructionInnerDiv);
			wrapper.appendChild(instructionContainer);
		}

		this.innerHTML = "";
		this.appendChild(wrapper);

		// wrapper block start
		this.drawWheel(wheel_border_color, transition_animation, pointer_color);
		// wrapper block end

		function waitForWidget(id, callback) {
			const check = () => {
				const el = document.querySelector("#" + id);
				if (el) {
				callback(el);
				} else {
				setTimeout(check, 200);
				}
			};
			check();
		}

		this.items.forEach(item => {
			if(item.reveal_widget != ''){
				// if (!item.reveal_widget || AdEventTracker?._hiddenWidgetSet?.has(item.reveal_widget)) return;
				console.log('reveal widget:', item.reveal_widget);
				const existingWrapper = document.querySelector(
					`widget-wrapper[reveal_widget="${item.reveal_widget}"]`
				);
				if (existingWrapper) {
					console.log("Widget wrapper already exists for:", item.reveal_widget);
					return; // stop here
				}

				const group_id = `widget_group-${Math.random().toString(36).substr(2, 5)}`;
				const widget_group = document.createElement('widget-wrapper');
				widget_group.setAttribute("order", group_id);
				widget_group.setAttribute("reveal_widget", item.reveal_widget);
				widget_group.setAttribute("transition_animation", transition_animation);
				widget_group.setAttribute("is_active", false);
				widget_group.setAttribute("back", item.back);
				document.querySelector?.('ad-frame-deck')?.appendChild(widget_group);

				waitForWidget(item.reveal_widget, (get_widget) => {
					get_widget.setAttribute("paused", "true");
					widget_group.appendChild(get_widget);
					// AdEventTracker?._hiddenWidgetSet?.add(item.reveal_widget);
					getFrameOrientation(excludedWidgetTags);
				});
			}
		});


		requestAnimationFrame(() => {
			if (!this.isRendered) {
			this.dispatchEvent(new CustomEvent('wgt-rendered', {
				detail: { tag: this.tagName.toLowerCase() },
				bubbles: true,
				composed: true
			}));
			this.isRendered = true;
			}
		});
	}

	destroy() {

	}

	drawWheel(wheel_border_color, transition_animation, pointer_color) {
	  	const wheel = this.querySelector(".spin-container");
		const spinClass = "is-spinning";
		if (!wheel) {
			console.error("Spin wheel container not found.");
			return;
		}

		const spinner = document.createElement('div');
		spinner.classList.add('spinner');
		wheel.innerHTML = ''; 
		wheel.appendChild(spinner);

		const segments = this.items;
		const numSegments = segments.length;
		
		if (numSegments === 0) {
			console.warn("No segments to draw.");
			return;
		}

		const anglePerSegment = 360 / numSegments;
		const segmentOffset = Math.floor(180 / numSegments);

		let gradientParts = [];

		const borderSize = 0.3; // Percentage of the segment's width for the border
		const segmentAngle = anglePerSegment;

		spinner.setAttribute(
			"style",
			`border: 1px solid ${wheel_border_color};
			background: conic-gradient(
				from 0deg,
				${
					segments.map(({ bg_color }, i) => `${bg_color} 0 ${(100 / numSegments) * (numSegments - i)}%`).reverse()
				}`
		);

		// Create labels for conic gradient
		const gradient = `conic-gradient(${gradientParts.join(", ")})`;
		spinner.style.background = gradient;

		spinner.innerHTML = "";

		const dividers = document.createElement('div');
		dividers.classList.add('wheel-dividers');
		spinner.appendChild(dividers);

		segments.forEach(({ item_id, text }, i) => {
			const rotation = ((anglePerSegment * i) * -1) - segmentOffset + 90;
			spinner.insertAdjacentHTML(
			"beforeend",
			`<li class="segment-label" data-id=${item_id} style="--rotate: ${rotation}deg">
				<span class="segment-inner">${text}</span>
			</li>`
			);
		});

		for (let i = 0; i < numSegments; i++) {
		  const line = document.createElement('div');
		  line.classList.add('wheel-divider');
		  line.style.transform = `rotate(${i * anglePerSegment}deg)`;
		  line.style.backgroundColor = wheel_border_color;
		  dividers.appendChild(line);
		}

		// Create pointer
		const pointer = document.createElement('div');
		pointer.classList.add('spin-pointer');
		const pointerBorder = document.createElement('div');
		pointerBorder.classList.add('pointer-border');
		pointer.innerHTML = '<svg fill="#000000" viewBox="-5 -1.5 24 24" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin" class="jam jam-water-drop-f"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M7 .565c4.667 6.09 7 10.423 7 13a7 7 0 1 1-14 0c0-2.577 2.333-6.91 7-13z"></path></g></svg><span class="spin-text">Spin</span>';
		pointer.querySelector('svg').setAttribute("fill", pointer_color);
		pointer.appendChild(pointerBorder);

		wheel.appendChild(pointer);

	    const updatePointerSize = () => {
	        const spinnerWidth = spinner.clientWidth;
	        console.log(spinnerWidth);
	        pointer.style.width = (spinnerWidth * 0.4) + "px";  // 40% of wheel
	    };

	    requestAnimationFrame(() => {
		  updatePointerSize();
		});

		const pointer_ro = new ResizeObserver(updatePointerSize);
		pointer_ro.observe(spinner);

		const spinertia = (min, max) => {
			min = Math.ceil(min);
			max = Math.floor(max);
			return Math.floor(Math.random() * (max - min + 1)) + min;
		};

		let rotation = 0;

		wheel.addEventListener('click', roateWheel);
		const Self = this;

		function roateWheel() {
			AdEventTracker?.TriggerEventFromWidgetConfig?.({
				widgetOrder: Self.widgetOrder,
				widgetId: Self.widgetId,
				adWidgetId: Self.adWidgetId,
				eventName: `WheelClick`,
				widgetTagName: 'wgt-spin-wheel',
			});
			if (this.isSpinning) return;
			Self.isSpinning = true;
			wheel.classList.add(spinClass);
			rotation = Math.floor(Math.random() * 360 + spinertia(2000, 5000));
			spinner.style.transform = `rotate(${rotation}deg)`;
		};

		spinner.addEventListener("transitionend", () => {
			Self.isSpinning = false;
			rotation %= 360;
			const selected = Math.floor(rotation / anglePerSegment);
			wheel.classList.remove(spinClass);
			
			spinner.style.transform = `rotate(${rotation}deg)`;
			let item = segments[selected];
			if (!item) return;

			Self.querySelector('.pointer-border').style.backgroundColor = item.bg_color;

			AdEventTracker?.TriggerEventFromWidgetConfig?.({
				widgetOrder: Self.widgetOrder,
				widgetId: Self.widgetId,
				adWidgetId: Self.adWidgetId,
				eventName: `ItemSelected_${item.item_id ?? 'unknown'}`,
				widgetTagName: 'wgt-spin-wheel',
			});
			
			setTimeout(() => {
				if (item.reveal_widget) {
					Self.append(
						document.querySelector('ad-frame-deck')
						?.querySelector(`[reveal_widget="${item.reveal_widget}"]`)
					);
					const reveal_wrapper = document.querySelector?.('ad-frame-deck')?.querySelector(`[reveal_widget="${item.reveal_widget}"]`);
					if (!reveal_wrapper) return;
					reveal_wrapper.setAttribute("transition_animation", transition_animation || "wrapper-fade");
					reveal_wrapper.setAttribute("back", item.back || false);
					reveal_wrapper.setAttribute("is_active", "true");
				}
			},1000);
		});
	}

	play(){
		// this.render();
	}

	_resizeHandler() {
		// play();
		// AdEventTracker?._hiddenWidgetSet?.clear();
	}

	destroy(){
		this.remove();
		this.isRendered = false;
    	this.isCompleted = false;
		// AdEventTracker?._hiddenWidgetSet?.clear();
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
		#${this.widgetOrder} .spin-pointer::before {
			background-color: ${color} !important;
		}
		`;
	}
}

customElements.define('wgt-spin-wheel', WgtSpinWheel);