class WgtAnimatedImage extends HTMLElement {
    constructor() {
        super();
        this.isRendered = false;
        this.isCompleted = false;
        this.container = null;

        this.adWidgetId = null;
        this.widgetId = null;
        this.widgetOrder = null;
    }

    static get observedAttributes() {
        return [
            "image_src",
            "section_bg_color",
            "text",
            "transition_animation",  
            "reveal_animation",      
            "loop",
            "ad_widget_id",
            "widget_id",
            "order",
            "paused"
        ];
    }

    connectedCallback() {
        this.render();
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
            case 'paused':
            case 'image_src':
            case 'text':
            case 'transition_animation':
            case 'reveal_animation':
            case 'loop':
                this.render();
                if(this.isRendered) {
                    this.play();
                }
                break;
        }
    }

    render() {
        const animated_img_id = `animated_img-${Math.random().toString(36).substr(2, 5)}`;

        this.adWidgetId = this.getAttribute('ad_widget_id') || animated_img_id;
        this.widgetId = this.getAttribute('widget_id') || null;

        this.widgetOrder = this.getAttribute('order') || "animated_img";
        this.setAttribute("id", this.widgetOrder);

        const image = this.getAttribute("image_src") || "";
        const text = this.getAttribute("text") || "";
        const bgColor = this.getAttribute("section_bg_color") || "#ffffff";
        // const ctaUrl = this.getAttribute("cta_url") || null;

        this.innerHTML = "";

        const container = document.createElement("div");
        container.classList.add("animated-img-container");
        container.style.background = bgColor;

        const img = document.createElement("img");
        img.src = image;
        img.alt = "animated Image";

        const textDiv = document.createElement("div");
        textDiv.classList.add("animated-img-text");
        textDiv.innerHTML = text;

        const contentWrapper = document.createElement("div");
        contentWrapper.classList.add("animated-img-content");

        // if (ctaUrl) {
        //   const link = document.createElement("a");
        //   link.href = ctaUrl;
        //   link.target = "_blank";
        //   link.style.cssText =
        //     "display:block;width:100%;height:100%;text-decoration:none;color:inherit;";

        //   link.appendChild(img);
        //   link.appendChild(textDiv);
        //   contentWrapper.appendChild(link);

        //   link.addEventListener("click", () => {
        //     AdEventTracker?.TriggerEventFromWidgetConfig?.({
        //       widgetOrder: this.widgetOrder,
        //       widgetId: this.widgetId,
        //       adWidgetId: this.adWidgetId,
        //       eventName: `ImageClick`,
        //       widgetTagName: "wgt-animated-image",
        //       clickUrl: ctaUrl,
        //     });
        //   });
        // } else {
        //   contentWrapper.appendChild(img);
        //   contentWrapper.appendChild(textDiv);
        // }
        contentWrapper.appendChild(img);
        contentWrapper.appendChild(textDiv);
        container.appendChild(contentWrapper);
        this.appendChild(container);

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

        this.container = container;
        this.img = img;
        this.bgColor = bgColor;
    } 

    // ---- Step 2: Reveal Phase ----
    startRevealAnimation(img, container, bgColor, revealAnimation, loop) {
        if (revealAnimation === "1") {
        // Zigzag
        img.classList.add("animated-img");

        const strips = [];
        ["strip1", "strip2", "strip3", "strip4"].forEach((cls) => {
            const strip = document.createElement("div");
            strip.classList.add("zigzag-strip", cls);
            strip.style.setProperty("--zigzag-bg", bgColor);
            container.appendChild(strip);
            strips.push(strip);
        });

        if (loop) {
            console.log("looping zigzag");
            const lastStrip = strips[strips.length - 1];
            lastStrip.addEventListener("animationend", () => {
            strips.forEach((strip) => {
                strip.style.animation = "none";
                strip.style.display = "none";
            });
            void container.offsetWidth;
            setTimeout(() => {
                strips.forEach((strip, i) => {
                strip.style.display = "";
                strip.style.animation = "";
                strip.classList.remove(`strip${i + 1}`);
                void strip.offsetWidth;
                strip.classList.add(`strip${i + 1}`);
                });
            }, 2000);
            });
        } else {
            strips[strips.length - 1].addEventListener("animationend", () => {
            img.classList.add("zoom-in-out");
            });
        }
        } else if (revealAnimation === "2") {
        // Slice
        img.classList.add("animated-img");

        const slices = [];
        for (let i = 0; i < 6; i++) {
            const slice = document.createElement("div");
            slice.classList.add("slice-strip", `slice${i + 1}`);
            slice.style.setProperty("--slice-bg", bgColor);
            container.appendChild(slice);
            slices.push(slice);
        }

        if (loop) {
            const lastSlice = slices[slices.length - 1];
            lastSlice.addEventListener("animationend", () => {
            slices.forEach((slice) => {
                slice.style.animation = "none";
                slice.style.display = "none";
            });
            void container.offsetWidth;
            setTimeout(() => {
                slices.forEach((slice, i) => {
                slice.style.display = "";
                slice.style.animation = "";
                slice.classList.remove(`slice${i + 1}`);
                void slice.offsetWidth;
                slice.classList.add(`slice${i + 1}`);
                });
            }, 2000);
            });
        } else {
            slices[slices.length - 1].addEventListener("animationend", () => {
            img.classList.add("zoom-in-out");
            });
        }
        } else if (revealAnimation === "3") {
        // Wipe
        img.classList.add("animated-img", "anim-wipe");

        if (loop) {
            img.addEventListener("animationend", () => {
            img.style.animation = "none";
            void img.offsetWidth;
            setTimeout(() => {
                img.style.animation = "";
                img.classList.add("anim-wipe");
            }, 2000);
            });
        } else {
            img.addEventListener("animationend", () => {
            img.classList.add("zoom-in-out");
            });
        }
        } else if (revealAnimation === "4") {
        // Blind
        img.classList.add("animated-img", "anim-blind");

        if (loop) {
            img.addEventListener("animationend", () => {
            img.style.animation = "none";
            void img.offsetWidth;
            setTimeout(() => {
                img.style.animation = "";
                img.classList.add("anim-blind");
            }, 2000);
            });
        } else {
            img.addEventListener("animationend", () => {
            img.classList.add("zoom-in-out");
            });
        }
        } else {
        img.classList.add("animated-img");
        }
    }

    play() {
        const isOverlayActive = this.hasAttribute('paused') && this.getAttribute('paused') === 'true';
        const transitionAnimation = this.getAttribute("transition_animation") || "";
        const revealAnimation = this.getAttribute("reveal_animation") || "";
        const loop = this.getAttribute("loop") === "true";

        if(this.isRendered && !isOverlayActive) {
            const img = this.img;
            const container = this.container;
            const bgColor = this.bgColor;

            console.log({ img, container, bgColor, transitionAnimation, revealAnimation, loop });

            if (!img || !container) return; // safeguard
        
            requestAnimationFrame(() => {
                img.style.opacity = "1";
            });

            if (transitionAnimation) {
                console.log("transitioning");
                img.classList.add(`trans-${transitionAnimation}`);
                img.addEventListener(
                    "animationend",
                    () => {
                        console.log("reveal animation");
                        img.classList.remove(`trans-${transitionAnimation}`);
                        this.startRevealAnimation(img, container, bgColor, revealAnimation, loop);
                    },
                    { once: true }
                );
            } else {
                this.startRevealAnimation(img, container, bgColor, revealAnimation, loop);
            }
        }
    }
    pause() {

    }
    destroy() {

    }
}
customElements.define("wgt-animated-image", WgtAnimatedImage);