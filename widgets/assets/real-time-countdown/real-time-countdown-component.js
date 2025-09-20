class WgtRealTimeCountdown extends HTMLElement {
    constructor() {
        super();
        this.isRendered = false; 
        this.isCompleted = false;
        this.adWidgetId = null;
        this.widgetId = null;
        this.widgetOrder = null;

        this.timer = null;
        this.daysElem = null;
        this.hoursElem = null;
        this.minutesElem = null;
        this.secondsElem = null;
    }

    static get observedAttributes() {
        return [
            "order", 
            "ad_widget_id", 
            "widget_id",
            "title", 
            "date_time", 
            "section_bg_color",
            "section_bg_src",
            "cta_url"
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
            case 'title':
            case 'date_time':
            case 'section_bg_color':
                this.style.backgroundColor = newValue;
                break;
            case 'section_bg_src':
                this.style.backgroundImage = newValue ? `url(${newValue})` : '';
                break;
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
        const otr_id = `RealTimeCountdown-${Math.random().toString(36).substr(2, 5)}`;

        this.adWidgetId = this.getAttribute('ad_widget_id') || otr_id;
        this.widgetId = this.getAttribute('widget_id') || null;

        this.widgetOrder = this.getAttribute('order') || "RealTimeCountdown";
        this.setAttribute("id", this.widgetOrder);

        const title = this.getAttributeValue('title');
        const dateTime = this.getAttributeValue('date_time');
        const ctaUrl = this.getAttributeValue('cta_url');

        // create the countdown container
        if (!this.querySelector('.countdown-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'countdown-wrapper';

            this.daysElem = document.createElement('span');
            this.daysElem.textContent = '';
            this.hoursElem = document.createElement('span');
            this.hoursElem.textContent = '';
            this.minutesElem = document.createElement('span');
            this.minutesElem.textContent = '';
            // this.secondsElem = document.createElement('span');
            // this.secondsElem.textContent = seconds;         

            wrapper.appendChild(this.daysElem);
            wrapper.appendChild(this.hoursElem);
            wrapper.appendChild(this.minutesElem);
            // wrapper.appendChild(this.secondsElem);

            this.innerHTML = ``;
            this.appendChild(wrapper);
        }
        // create the countdown container


        if (!dateTime) {
            console.error('WgtRealTimeCountdown: "date" and "time" are required.');
            return;
        }

        const targetTime = new Date(`${dateTime}`).getTime();
        if (isNaN(targetTime)) {
            console.error('CountdownComponent: Invalid date or time format.');
            return;
        }

        // console.log(`WgtRealTimeCountdown: Countdown to ${new Date(targetTime).toString()}`);

        if (this.timer) {
            clearInterval(this.timer);
        }

        let days, hours, minutes, seconds;

        this.timer = setInterval(() => {
            const now = new Date().getTime();
            const diff = targetTime - now;

            if (diff <= 0) {
                clearInterval(this.timer);
                this.displayTime(0, 0, 0, 0);
                // Dispatch a custom event when the countdown reaches zero
                const event = new CustomEvent('countdown-finished', {
                detail: { message: 'Countdown has finished!' }
                });
                this.dispatchEvent(event);
                return;
            }

            days = Math.floor(diff / (1000 * 60 * 60 * 24));
            hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            seconds = Math.floor((diff % (1000 * 60)) / 1000);

            this.displayTime(days, hours, minutes, seconds);
        }, 1000);


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

    displayTime(days, hours, minutes, seconds) {
        this.daysElem.textContent = days.toString().padStart(2, '0');
        this.hoursElem.textContent = hours.toString().padStart(2, '0');
        this.minutesElem.textContent = minutes.toString().padStart(2, '0');
        // this.secondsElem.textContent = seconds.toString().padStart(2, '0');

        // console.log(`Countdown: ${days}d ${hours}h ${minutes}m ${seconds}s`);
        // Hide/remove days if zero
        if (days <= 0) {
            this.daysElem.style.display = "none";   // hide
            // OR: this.daysElem.remove();          // permanently remove
        } else {
            this.daysElem.style.display = "";       // show again
        }

        // Hide/remove hours if zero
        if (days <= 0 && hours <= 0) {
            this.hoursElem.style.display = "none";
            // OR: this.hoursElem.remove();
        } else {
            this.hoursElem.style.display = "";
        }
    }

    destroy() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.remove();
        this.isRendered = false;
        this.isCompleted = false;
    }
}

customElements.define('wgt-real-time-countdown', WgtRealTimeCountdown);