class AdBadge extends HTMLElement {
  constructor() {
    super();
  }

  static get observedAttributes() {
    return ['text_color', 'background_color', 'text'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'background_color':
      case 'text':
      case 'text_color':
        this.render();
        break;
    }
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.innerHTML = '';
  }

  getAttributeValue(attr, fallback = '') {
    return this.getAttribute(attr) || fallback;
  }

  render() {
    const text = this.getAttributeValue('text', 'Sponsored');
    const backgroundColor = this.getAttributeValue('background_color', '#6e6e6e');
    const textColor = this.getAttributeValue('text_color', '#ffffff');

    this.innerHTML = `
      <div style="
        display: inline-block;
        background-color: ${backgroundColor};
        color: ${textColor};
        padding: 4px;
        font-size: 8px;
        font-weight: 500;
        border-radius: 4px;
        font-family: sans-serif;
        line-height: 1.4;
        position: absolute;
        right: 4px;
        bottom: 4px;
        font-weight: bold;
        z-index: 1;
      ">${text}</div>
    `;
  }
}

customElements.define('ad-badge', AdBadge);
