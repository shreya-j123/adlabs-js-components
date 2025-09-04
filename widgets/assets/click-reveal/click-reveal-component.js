class WgtClickReveal extends HTMLElement {
	constructor() {
		super();
		this.isRendered = false;
		this.isCompleted = false;
		this.widgetOrder = null;
		this.adWidgetId = null;
		this.widgetId = null;

		this.items = [];
		this.hasRenderedWidgetsGroup = false;
		this._resizeHandler = this._resizeHandler.bind(this);
	}

	static get observedAttributes() {
		return[
			"order",
			"section_bg_color",
			"section_bg_src",
			"text",
			"instruction",
			"wrapper_element",
			"wrapper_src",
			"wrapper_color",
			"reveal_animation",
			"transition_animation",
			"items"		
		];
	}

	connectedCallback() {
	    this.render();
	    window.addEventListener('resize', this._resizeHandler);
	}

	disconnectedCallback() {
		this.destroy();
		this._observer?.disconnect();
		window.removeEventListener('resize', this._resizeHandler);
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
	      case 'items':
	      	this.items = JSON.parse(newValue);
	  			this.render();
	        break;
	      case 'text':
	      case 'instruction':
	      case 'wrapper_element':
	      case 'wrapper_src':
	      case 'wrapper_color':
	      case 'reveal_animation':
	      case 'transition_animation':
			this.render();
	        break;
	    }
	}

	render() {
		const click_reveal_id = `click_reveal-${Math.random().toString(36).substr(2, 5)}`;
		if (!this.adWidgetId) {
	      this.adWidgetId = this.getAttribute('ad_widget_id') || click_reveal_id;
	    }
	    this.widgetId = this.getAttribute('widget_id') || null;
	    this.widgetOrder = this.getAttribute('order') || "ClickReveal";
	    this.setAttribute("id", this.widgetOrder);

		const section_bg_color = this.getAttribute('section_bg_color') || "#d6d6d6";
		const section_bg_src = this.getAttribute('section_bg_src');
		const text = this.getAttribute('text');
		const instruction = this.getAttribute('instruction');
		const wrapper_element = this.getAttribute('wrapper_element');
		const wrapper_src = this.getAttribute('wrapper_src');
		const wrapper_color = this.getAttribute('wrapper_color');
		const reveal_animation = this.getAttribute('reveal_animation');
		const transition_animation = this.getAttribute("transition_animation");


		const wrapper = document.createElement('div');
		wrapper.className = 'click-reveal-wrapper';

		// text block
		if(text){
			const textContainer = document.createElement('div');
			textContainer.className = 'text-block';
			const textInnerDiv = document.createElement('div');
			textInnerDiv.innerHTML = text;
			textContainer.appendChild(textInnerDiv);
			wrapper.appendChild(textContainer);
		}

		// interaction block
		const interactionContainer = document.createElement('div');
		interactionContainer.className = 'interaction-container';
		const interactionInnerDiv = document.createElement('div');
		interactionInnerDiv.className = 'layout';

		if(!text && !instruction){
			interactionContainer.style.height = '100%';
		}else if(!text || !instruction){
			interactionContainer.style.height = '80%';
		}

		// wrapper block start
		const itemCount = this.items.length;
		this.createDynamicLayout(itemCount, interactionInnerDiv, wrapper_element, wrapper_color, wrapper_src, reveal_animation, transition_animation);
		// wrapper block end

		interactionContainer.appendChild(interactionInnerDiv);
		wrapper.appendChild(interactionContainer);

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
				
				console.log(item.reveal_widget);

				const existingWrapper = document.querySelector(
					`widget-wrapper[reveal_widget="${item.reveal_widget}"]`
				);
				if (existingWrapper) {
					// console.log("Widget wrapper already exists for:", item.reveal_widget);
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
		this.remove();
		this.isRendered = false;
    	this.isCompleted = false;
		// AdEventTracker?._hiddenWidgetSet?.clear();
	}

	createDynamicLayout(count, layout, wrapper_element, wrapper_color, wrapper_src, reveal_animation, transition_animation) {
	  	const Self = this;
	  	Self.setBeforeBackgroundColor(wrapper_color);
	  	function createBlock(item, orientation, count){
	  		let wrapper_id = "wrapper_"+item.item_id;

	  		const itemBlock = document.createElement('div');
		    itemBlock.className = 'item-block';
		   
		    if (orientation == "portrait" && count > 3) {
		    	itemBlock.style.width = '33.33%';
		    	itemBlock.style.height = '50%';
		    }
		    else{
		    	itemBlock.style.width = 100/count+'%';
		    	itemBlock.style.height = '100%';
		    }

		    const inner = document.createElement('div');
		    inner.className = 'shape';
		    inner.setAttribute("id", wrapper_id);
		  	
		    switch (wrapper_element) {
	        case "1": 
	        	inner.appendChild(Self.createBalloon()); 
	        	break;
	        case "2": 
	        	inner.appendChild(Self.createGiftBox(wrapper_color)); 
	        	break;
	        case "3": 
	        	inner.appendChild(Self.createBubble()); 
	        	break;
	        case "4": 
	        	inner.appendChild(Self.createCloud(wrapper_color)); 
	        	break;
	        case "5": 
	        	inner.appendChild(Self.createCustomImage(wrapper_src)); 
	        	break;
		    }
		    

		    if (item.reveal_src) {
				const reveal_element = document.createElement('div');
				const reveal_img = document.createElement("img");
				reveal_img.setAttribute('src', item.reveal_src);
				reveal_img.classList.add("reveal_img")
				reveal_element.appendChild(reveal_img);
				// Wait until balloon/bubble/etc. is created, then append
				reveal_element.classList.add("reveal_element");
				inner.prepend(reveal_element);
		    }

			function runAnimation(el, animationClass) {
				return new Promise(resolve => {
					el.addEventListener("animationend", resolve, { once: true });
					el.classList.add(animationClass);
				});
			}

		  	if (item?._preview_wrapper_visible == false) {
				const wrapperEl = inner.querySelector(`#wrapper_${item.item_id} .wrapper_element`);
				const revealEl = inner.querySelector(`#wrapper_${item.item_id} .reveal_element`);
				runAnimation(wrapperEl, reveal_animation + "-out");
				runAnimation(revealEl, reveal_animation + "-in");
			}
			else{
				//Add click listener to this specific item
				inner.addEventListener("click", () => {
					console.log(`Item clicked: ${item.item_id}`);
					AdEventTracker?.TriggerEventFromWidgetConfig?.({
						widgetOrder: Self.widgetOrder,
						widgetId: Self.widgetId,
						adWidgetId: Self.adWidgetId,
						eventName: `ItemClick_${item.item_id ?? 'unknown'}`,
						widgetTagName: 'wgt-click-reveal'
					});
					const wrapperEl = Self.querySelector(`#wrapper_${item.item_id} .wrapper_element`);
					const revealEl = Self.querySelector(`#wrapper_${item.item_id} .reveal_element`);

					function wait(ms) {
						return new Promise(resolve => setTimeout(resolve, ms));
					}

					async function runAnimations() {
						// Step 1: Out animation
						await runAnimation(wrapperEl, reveal_animation + "-out");

						// Step 2: Wait 1 sec
						// await wait(1000);

						// Step 3: In animation
						await runAnimation(revealEl, reveal_animation + "-in");

						// Step 4: Wait 1 sec
						await wait(1500);

						// Step 5: Activate reveal_widget if needed
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
					}

					runAnimations();

				});
			}

		    itemBlock.appendChild(inner);

		    return itemBlock;
	  	}

	  	requestAnimationFrame(() => {
		  	requestAnimationFrame(() => {
				const { width, height } = layout.getBoundingClientRect();
				let orientation = '';

				if (width / height > 1.6) {
				  orientation = 'landscape';
				} else {
				  orientation = 'portrait'; 
				}

				console.log(orientation);
				Self.items.forEach(item => {
			    layout.appendChild(createBlock(item, orientation, count));
			  });
			});
		});
	  // return layout;
	}

	createBalloon() {
		const balloon_wrapper = document.createElement("div");
		balloon_wrapper.classList.add("balloon-area", "wrapper_element");
		const balloonId = `balloon-${Math.random().toString(36).substr(2, 9)}`;
		balloon_wrapper.innerHTML = `
		  <svg class="balloon-svg" viewBox="0 0 120 250">
		    <path d="M60,25 C35,25 15,50 20,80 C25,110 40,130 60,135 C80,130 95,110 100,80 C105,50 85,25 60,25 Z" fill="var(--shape-color)"/>
		    <path d="M60,130 L52,140 L68,140 Z" fill="var(--shape-color)"/>
		    <path id="${balloonId}" class="rope" d="M60,140 Q66,190 60,225" stroke="#b9b8e3" stroke-width="2.5" fill="none"/>
		    <ellipse cx="45" cy="45" rx="10" ry="18" fill="white" opacity="0.22"/>
		  </svg>
		`;
		const ropePath = balloon_wrapper.querySelector(`#${balloonId}`);
		const waveFrames = [
		  "M60,140 Q66,190 60,225",
		  "M60,140 Q77,190 67,225",
		  "M60,140 Q47,180 58,225",
		  "M60,140 Q46,175 60,225",
		  "M60,140 Q80,178 62,225",
		  "M60,140 Q66,190 60,225",
		];
		let frame = 0;
		setInterval(() => {
		  if (ropePath) {
		    ropePath.setAttribute("d", waveFrames[frame]);
		    frame = (frame + 1) % waveFrames.length;
		  }
		}, 300);
		return balloon_wrapper;
	}

	createBubble() {
		const bubble_wrapper = document.createElement("div");
		bubble_wrapper.classList.add("bubble-container","wrapper_element");
		bubble_wrapper.innerHTML = `<div class="bubble"></div>`;
		return bubble_wrapper;
	}

	createCloud(wrapper_color) {
		const cloud_wrapper = document.createElement("div");
		cloud_wrapper.classList.add("cloud","wrapper_element");
		cloud_wrapper.innerHTML = `<svg xmlns="https://www.w3.org/2000/svg" xml:space="preserve" style="shape-rendering:geometricPrecision;text-rendering:geometricPrecision;image-rendering:optimizeQuality;fill-rule:evenodd;clip-rule:evenodd" viewBox="0 0 6.827 6.827"><defs><style>#${this.adWidgetId} .fil0{fill:none} #${this.adWidgetId} .fill1{fill:${wrapper_color}}</style></defs><g id="Layer_x0020_1"><g id="_491468336"><path id="_491468504" class="fil0" d="M0 0h6.827v6.827H0z"/><path id="_491468600" class="fil0" d="M.853.853h5.12v5.12H.853z"/></g><g id="_491467592"><path id="_491468432" d="M3.413 1.808c-.68-.462-1.681.014-1.598 1.083-1.457.343-1.14 2.304.157 2.304h1.441V1.808z" class="fill1"/><path id="_491468408" d="M4.853 5.195c.617 0 1.12-.519 1.12-1.156 0-.597-.41-1.039-.965-1.145-.261-.482-.645-.655-1.17-.568a1.244 1.244 0 0 0-.421-.515l-.004-.003v3.387h1.44z" class="fill1"/></g></g></svg>`;
		return cloud_wrapper;
	}

	createGiftBox(wrapper_color) {
		const gift_wrapper = document.createElement("div");
		gift_wrapper.classList.add("gift","wrapper_element");
		gift_wrapper.innerHTML = `<svg xmlns="https://www.w3.org/2000/svg" xml:space="preserve" style="shape-rendering:geometricPrecision;text-rendering:geometricPrecision;image-rendering:optimizeQuality;fill-rule:evenodd;clip-rule:evenodd" viewBox="0 0 6.827 6.827"><defs><style>#${this.adWidgetId} .fil2{fill:#af865d} #${this.adWidgetId} .fil0{fill:${wrapper_color}}#${this.adWidgetId} .fil1{fill:#dbad7d}#${this.adWidgetId} .fill3{fill:${wrapper_color};}</style></defs><g id="Layer_x0020_1"><g id="_575896080"><g id="Layer_14"><path id="_603731344" class="fil0" d="M5.431 5.811H1.395a.061.061 0 0 1-.06-.06V2.823h4.157V5.75a.061.061 0 0 1-.06.061z"/><path id="_603730240" class="fil0" d="M5.836 2.824H.99a.061.061 0 0 1-.06-.062v-.489c0-.034.027-.061.06-.061h4.846c.034 0 .061.027.061.061v.49a.061.061 0 0 1-.06.06z"/><path id="_603730432" class="fil1" d="M2.996 2.212h.256s.039-.002.039-.024c0-.077-.03-.161-.086-.288a1.901 1.901 0 0 0-.19-.307 1.885 1.885 0 0 0-.343-.335s-.235-.18-.483-.237a.19.19 0 0 0-.074-.003c-.067.01-.111.057-.142.092a2.17 2.17 0 0 0-.225.317s-.06.096-.092.226a.123.123 0 0 0-.004.042.16.16 0 0 0 .057.1c.174.161.342.243.342.243.144.07.271.127.379.174h.566z"/><path id="_603729472" class="fil1" d="M5.17 1.653c-.031-.13-.09-.226-.09-.226a2.17 2.17 0 0 0-.227-.318c-.03-.034-.074-.08-.14-.091a.19.19 0 0 0-.075.003c-.249.057-.483.236-.483.236-.197.15-.313.297-.343.336-.085.11-.146.22-.154.237-.018.033-.027.05-.036.07-.056.127-.086.21-.086.287 0 .023.039.025.039.025h.822c.107-.047.235-.105.379-.175 0 0 .168-.081.342-.243a.16.16 0 0 0 .056-.099.122.122 0 0 0-.003-.042z"/><path id="_603729952" class="fil2" d="M3.067 2.212c-.431-.303-.901-.483-1.131-.549-.1-.028-.133-.017-.145 0-.013.019-.005.049.018.07.183.178.862.479.862.479h.395z"/><path id="_603729040" class="fil2" d="M5.033 1.663c-.013-.017-.046-.028-.145 0-.23.066-.7.246-1.131.549h.395s.68-.3.863-.478c.022-.022.03-.052.018-.07z"/><path id="_603729280" class="fil2" d="M3.407 1.855a.357.357 0 0 0-.357.357h.714a.357.357 0 0 0-.357-.357z"/><g><path id="_603727744" class="fil1" d="M3.18 2.212h.466v3.599H3.18z"/></g><g><path id="_603716656" class="fil2" d="M3.18 2.824h.466v.15H3.18z"/></g></g></g></g><path style="fill:none" d="M0 0h6.827v6.827H0z"/></svg>`;
		// console.log(gift_wrapper);
		return gift_wrapper;
	}

	createCustomImage(wrapper_src){
		const custom_wrapper = document.createElement("div");
		custom_wrapper.classList.add("custom_image","wrapper_element");
		
		const wrapper_image = document.createElement("img");
		wrapper_image.setAttribute("src", wrapper_src);
		wrapper_image.classList.add("wrapper_image");
		custom_wrapper.appendChild(wrapper_image);
		console.log(custom_wrapper);
		return custom_wrapper;
	}

	setBeforeBackgroundColor(color) {
	    const styleId = 'dynamic-style-'+this.widgetOrder;

	    let styleTag = document.getElementById(styleId);

	    if (!styleTag) {
	      styleTag = document.createElement('style');
	      styleTag.id = styleId;
	      document.head.appendChild(styleTag);
	    }

	    const targetSelector = `#${this.widgetOrder}`;

		styleTag.textContent = `
			${targetSelector} {
		  	--shape-color: ${color || "#d43130"};
			}
		`;
	}

	play(){
		this.render();
	}

	_resizeHandler() {
		this.play();
		// AdEventTracker?._hiddenWidgetSet?.clear();
	}

	destroy(){

	}
}

customElements.define('wgt-click-reveal', WgtClickReveal);