class AdBadge extends HTMLElement{constructor(){super()}static get observedAttributes(){return["text_color","background_color","text"]}attributeChangedCallback(t,e,r){if(e!==r)switch(t){case"background_color":case"text":case"text_color":this.render()}}connectedCallback(){this.render()}disconnectedCallback(){this.innerHTML=""}getAttributeValue(t,e=""){return this.getAttribute(t)||e}render(){let t=this.getAttributeValue("text","Sponsored"),e=this.getAttributeValue("background_color","#6e6e6e"),r=this.getAttributeValue("text_color","#ffffff");this.innerHTML=`
      <div style="
        display: inline-block;
        background-color: ${e};
        color: ${r};
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
      ">${t}</div>
    `}}customElements.define("ad-badge",AdBadge);