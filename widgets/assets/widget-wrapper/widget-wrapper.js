class WidgetWrapper extends HTMLElement {
	constructor() {
		super();
		this._backButton = null; // store reference to back button
		this._resizeHandler = this._resizeHandler.bind(this);
	}

	static get observedAttributes() {
		return [
			"order",
			"reveal_widget",
			"transition_animation",
			"is_active",
			"back"
		];
	}

	connectedCallback() {
		this._initBackButton();
		this.render();
		window.addEventListener('resize', this._resizeHandler);
	}

	disconnectedCallback() {
		this._removeBackButton();
		window.removeEventListener('resize', this._resizeHandler);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		this.render();
	}

	/**
	 * Creates the back button once
	 */
	_initBackButton() {
		const back_enabled = this.getAttribute('back');
		// alert(back_enabled);
		if(back_enabled === 'true'){
			if (!this.querySelector('.back-btn')) {
				const backBtn = document.createElement('div');
				backBtn.classList.add('back-btn', 'tiny-font');
				backBtn.textContent = "Back";

				backBtn.addEventListener("click", () => this._handleBackClick());
				this._backButton = backBtn;
				this.appendChild(backBtn);
			}
		}
	}

	/**
	 * Removes the back button (cleanup)
	 */
	_removeBackButton() {
		if (this._backButton) {
			this._backButton.removeEventListener("click", this._handleBackClick);
			this._backButton.remove();
			this._backButton = null;
		}
	}

	_updatePlayState(state) {
		const deck = document.querySelector('ad-frame-deck');
		if (!deck) return;
		deck.querySelectorAll('*').forEach(widget => {
			if (widget.tagName.startsWith('WGT-')) {
				if (widget.closest('widget-wrapper')) {
					return;
				}
				// console.log('Updating play state for widget:', widget);
				widget.setAttribute('paused', state);
			}
		});
	}

	/**
	 * Handles clicking the back button
	 */
	_handleBackClick() {
		const animation = this.getAttribute('transition_animation') || "fade";
		this.classList.add(animation + "-out");
		this.style.pointerEvents = "none";
		this.style.zIndex = "3";

		// console.log(this);

		this._forEachWidget(el => {
			const onAnimEnd = () => {
				this._updatePlayState('false');
				el.setAttribute('paused', 'true');
				this.setAttribute('is_active', 'false');
				this.classList.remove(animation + "-out", animation + "-in");
				document.querySelector('ad-frame-deck')
						?.append(this);
				this.removeEventListener('animationend', onAnimEnd);
			};
			this.addEventListener('animationend', onAnimEnd);
		});
	}

	/**
	 * Runs when the element should be displayed
	 */
	render() {
		const animation = this.getAttribute('transition_animation') || "fade";
		const isActive = this.getAttribute('is_active') === "true";

		if (isActive) {
			this.classList.add(animation + "-in");
			this.style.pointerEvents = "auto";
			this.style.zIndex = "1000"; // bring to front

			this._forEachWidget(el => {
				const onAnimEnd = () => {
					console.log('animationend');
					this._updatePlayState('true');

					const order = el.getAttribute('order');
					console.log(WidgetController?._overlayWidgetMap);
					if (!WidgetController?._overlayWidgetMap?.has(order)) {
						el.setAttribute('paused', 'false');
					}
					
					this.removeEventListener('animationend', onAnimEnd);
				};
				this.addEventListener('animationend', onAnimEnd);
			});
		}
	}

	/**
	 * Runs for each <wgt-*> element inside
	 */
	_forEachWidget(callback) {
		this.querySelectorAll('*').forEach(el => {
			if (el.tagName.toLowerCase().startsWith('wgt-')) {
				callback(el);
			}
		});
	}

	/**
	 * Handles window resize (currently empty)
	 */
	_resizeHandler() {
		// handle responsive logic here if needed
	}
}

customElements.define('widget-wrapper', WidgetWrapper);
