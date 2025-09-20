class WgtOneTapReminder extends HTMLElement {
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
      'ad_widget_id', 
      'widget_id',
      "title", 
      "description", 
      "start_date_time", 
      "end_date_time", 
      "location",
      "timezone"
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
        case 'description':
        case 'start_date_time':
        case 'end_date_time':
        case 'location':
        case 'timezone':
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
    const otr_id = `otr-${Math.random().toString(36).substr(2, 5)}`;

    this.adWidgetId = this.getAttribute('ad_widget_id') || otr_id;
    this.widgetId = this.getAttribute('widget_id') || null;

    this.widgetOrder = this.getAttribute('order') || "OneTapReminder";
    this.setAttribute("id", this.widgetOrder);

    // create the reminder pop-up and link
    this.classList.add('hide');
    const wrapper = document.createElement('div');
    wrapper.classList.add('reminder-wrapper');

    const content = document.createElement('div');
    content.classList.add('reminder-content');

    const close_btn = document.createElement('div');
    close_btn.classList.add('close_btn');
    close_btn.innerHTML = '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#0F1729"/> </svg>';

    const headline = document.createElement('div');
    headline.classList.add('reminder-headline');
    headline.textContent = 'Add to Calendar';

    // Define providers
    const calendars = [
    { provider: "apple" },
    { provider: "google" },
    { provider: "outlook" },
    { provider: "yahoo" }
    ];


    calendars.forEach(c => {
        const btn = document.createElement('button');
        btn.classList.add('reminder-button');
        btn.dataset.provider = c.provider;
        btn.title = `Add to ${c.provider.charAt(0).toUpperCase() + c.provider.slice(1)} Calendar`;
        btn.setAttribute('aria-label', `Add event to ${c.provider} calendar`);

        //inject SVG icon from your getProviderIcon function
        btn.innerHTML = this.getProviderIcon(c.provider);

        // Add click handler (optional)
        btn.addEventListener('click', () => {
            this.handleProviderClick(c.provider);
        });

        content.appendChild(btn);
    });

    close_btn.addEventListener('click', () => {
      this.classList.remove('show');  
    });
    
    wrapper.appendChild(headline);
    wrapper.appendChild(content);

    this.innerHTML = '';
    this.appendChild(close_btn);
    this.appendChild(wrapper);

    // prevent clicks inside the wrapper from closing
    wrapper.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    this.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        this.classList.remove("show");
      }
    });
    // create the reminder pop-up and link


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

  getProviderIcon(provider) {
    const icons = {
      apple: `<svg class="button-icon" viewBox="0 0 24 24" fill="#000"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`,
      google: `<svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="22" height="22" x="13" y="13" fill="#fff"></rect><polygon fill="#1e88e5" points="25.68,20.92 26.688,22.36 28.272,21.208 28.272,29.56 30,29.56 30,18.616 28.56,18.616"></polygon><path fill="#1e88e5" d="M22.943,23.745c0.625-0.574,1.013-1.37,1.013-2.249c0-1.747-1.533-3.168-3.417-3.168 c-1.602,0-2.972,1.009-3.33,2.453l1.657,0.421c0.165-0.664,0.868-1.146,1.673-1.146c0.942,0,1.709,0.646,1.709,1.44 c0,0.794-0.767,1.44-1.709,1.44h-0.997v1.728h0.997c1.081,0,1.993,0.751,1.993,1.64c0,0.904-0.866,1.64-1.931,1.64 c-0.962,0-1.784-0.61-1.914-1.418L17,26.802c0.262,1.636,1.81,2.87,3.6,2.87c2.007,0,3.64-1.511,3.64-3.368 C24.24,25.281,23.736,24.363,22.943,23.745z"></path><polygon fill="#fbc02d" points="34,42 14,42 13,38 14,34 34,34 35,38"></polygon><polygon fill="#4caf50" points="38,35 42,34 42,14 38,13 34,14 34,34"></polygon><path fill="#1e88e5" d="M34,14l1-4l-1-4H9C7.343,6,6,7.343,6,9v25l4,1l4-1V14H34z"></path><polygon fill="#e53935" points="34,34 34,42 42,34"></polygon><path fill="#1565c0" d="M39,6h-5v8h8V9C42,7.343,40.657,6,39,6z"></path><path fill="#1565c0" d="M9,42h5v-8H6v5C6,40.657,7.343,42,9,42z"></path></svg>`,
      outlook: `<svg class="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#1a237e" d="M43.607,23.752l-7.162-4.172v11.594H44v-6.738C44,24.155,43.85,23.894,43.607,23.752z"></path><path fill="#0c4999" d="M33.919,8.84h9.046V7.732C42.965,6.775,42.19,6,41.234,6H17.667c-0.956,0-1.732,0.775-1.732,1.732 V8.84h9.005H33.919z"></path><path fill="#0f73d9" d="M33.919,33.522h7.314c0.956,0,1.732-0.775,1.732-1.732v-6.827h-9.046V33.522z"></path><path fill="#0f439d" d="M15.936,24.964v6.827c0,0.956,0.775,1.732,1.732,1.732h7.273v-8.558H15.936z"></path><path fill="#2ecdfd" d="M33.919 8.84H42.964999999999996V16.866999999999997H33.919z"></path><path fill="#1c5fb0" d="M15.936 8.84H24.941000000000003V16.866999999999997H15.936z"></path><path fill="#1467c7" d="M24.94 24.964H33.919V33.522H24.94z"></path><path fill="#1690d5" d="M24.94 8.84H33.919V16.866999999999997H24.94z"></path><path fill="#1bb4ff" d="M33.919 16.867H42.964999999999996V24.963H33.919z"></path><path fill="#074daf" d="M15.936 16.867H24.941000000000003V24.963H15.936z"></path><path fill="#2076d4" d="M24.94 16.867H33.919V24.963H24.94z"></path><path fill="#2ed0ff" d="M15.441,42c0.463,0,26.87,0,26.87,0C43.244,42,44,41.244,44,40.311V24.438 c0,0-0.03,0.658-1.751,1.617c-1.3,0.724-27.505,15.511-27.505,15.511S14.978,42,15.441,42z"></path><path fill="#139fe2" d="M42.279,41.997c-0.161,0-26.59,0.003-26.59,0.003C14.756,42,14,41.244,14,40.311V25.067 l29.363,16.562C43.118,41.825,42.807,41.997,42.279,41.997z"></path><path fill="#00488d" d="M22.319,34H5.681C4.753,34,4,33.247,4,32.319V15.681C4,14.753,4.753,14,5.681,14h16.638 C23.247,14,24,14.753,24,15.681v16.638C24,33.247,23.247,34,22.319,34z"></path><path fill="#fff" d="M13.914,18.734c-3.131,0-5.017,2.392-5.017,5.343c0,2.951,1.879,5.342,5.017,5.342 c3.139,0,5.017-2.392,5.017-5.342C18.931,21.126,17.045,18.734,13.914,18.734z M13.914,27.616c-1.776,0-2.838-1.584-2.838-3.539 s1.067-3.539,2.838-3.539c1.771,0,2.839,1.585,2.839,3.539S15.689,27.616,13.914,27.616z"></path></svg>`,
      yahoo: `<svg class="button-icon" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 16 16"><g fill="#7B1FA2"><circle cx="12.5" cy="14" r="1"></circle><path d="M15.699 1.289A.96.96 0 0 0 15.008 1a1 1 0 0 0-.993.894l-1.509 9.528a.5.5 0 0 0 .977.207l2.475-9.311a.31.31 0 0 0 .011-.051.476.476 0 0 0 .031-.163c.007-.321-.1-.61-.301-.815zM10.079.107a2.13 2.13 0 0 1-.683-.086.5.5 0 0 0-.604.287L6.007 7.017 3.207.308a.5.5 0 0 0-.604-.287 2.291 2.291 0 0 1-.68.086.501.501 0 0 0-.475.699L5 8.978V15.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5l.006-6.536L10.552.806a.502.502 0 0 0-.045-.479.53.53 0 0 0-.428-.22z"></path></g></svg>`
    };
    return icons[provider] || '';
  }

  getEventDetails(provider = null) {
    return {
        title: this.getAttribute("title") || "Event",
        description: this.getAttribute("description") || "",
        location: this.getAttribute("location") || "",
        start: this.formatDateTimeForProvider(
            this.getAttribute("start_date_time"),
            provider
        ),
        end: this.formatDateTimeForProvider(
            this.getAttribute("end_date_time"), 
            provider
        ),
        timezone: this.getAttribute("timezone") || "UTC"
    };
  }

  formatDateTimeForProvider(dateStr, provider) {
    const date = new Date(dateStr);
    if (provider === "outlook") return date.toISOString();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}00`;
  }

  generateICS() {
    const { title, description, location, start, end, timezone } = this.getEventDetails();
    return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nSUMMARY:${title}\r\nDESCRIPTION:${description}\r\nLOCATION:${location}\r\nDTSTART:${start}Z\r\nDTEND:${end}Z\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  }

  createDownloadableICS() {
    const blob = new Blob([this.generateICS()], { type: "text/calendar" });
    return URL.createObjectURL(blob);
  }

  handleProviderClick(provider) {
    const { title, description, location, start, end } = this.getEventDetails(provider);

    let get_url;

    switch (provider) {
      case "google":
        get_url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
          title
        )}&details=${encodeURIComponent(
          description
        )}&location=${encodeURIComponent(location)}&dates=${start}Z/${end}Z`;
        break;
      case "outlook":
        get_url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
          title
        )}&body=${encodeURIComponent(
          description
        )}&location=${encodeURIComponent(
          location
        )}&startdt=${encodeURIComponent(start)}&enddt=${encodeURIComponent(
          end
        )}&allday=false`;
        break;
      case "yahoo":
        get_url = `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${encodeURIComponent(
          title
        )}&st=${start}Z&et=${end}Z&desc=${encodeURIComponent(
          description
        )}&in_loc=${encodeURIComponent(location)}`;
        break;
      case "apple":
        get_url = this.createDownloadableICS();
        break;
      default:
        get_url = "#";
        break;
    }

    const item_id = provider;

    if (provider === "apple") {
        AdEventTracker?.TriggerEventFromWidgetConfig?.({
            widgetOrder: this.widgetOrder,
            widgetId: this.widgetId,
            adWidgetId: this.adWidgetId,
            eventName: `calendar_download_${item_id}`,
            widgetTagName: "wgt-one-tap-reminder",
        });

        const link = document.createElement("a");
        link.href = get_url;
        link.download = `${this.getAttribute("title") || "event"}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(get_url);

    } else {
        AdEventTracker?.TriggerEventFromWidgetConfig?.({
            widgetOrder: this.widgetOrder,
            widgetId: this.widgetId,
            adWidgetId: this.adWidgetId,
            eventName: `calendar_click_${item_id}`,
            widgetTagName: "wgt-one-tap-reminder",
            clickUrl: get_url,
        });
    } 
    
  }


  destroy() {
    this.remove();
    this.isRendered = false;
    this.isCompleted = false;
  }
}

customElements.define('wgt-one-tap-reminder', WgtOneTapReminder);