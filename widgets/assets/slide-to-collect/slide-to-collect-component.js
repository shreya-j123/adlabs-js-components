class WgtSlideToCollect extends HTMLElement {
    constructor() {
        super();
        this.isRendered = false; 
        this.isCompleted = false;
        this.adWidgetId = null;
        this.widgetId = null;
        this.widgetOrder = null;

        this.itemsConfig = [];
        this.fallingItems = [];
        this.score = 0;
        this.timer = null;
        this.resizeObserver = null;
        this.isPaused = false;
        this.timeLeft = 0;
        this.reveal_widget = null;
        this.transition_animation = null;
    }

    static get observedAttributes() {
        return [
            "order", 
            "ad_widget_id", 
            "widget_id",
            "section_bg_src",
            "section_bg_color",
            "bucket_src",
            "score_bg_color",
            "score_text_color",
            "game_timer",
            "items",
            "success_message",
            "failure_message",
            "reveal_widget",
            "transition_animation",
            "paused"
        ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        if (name === "items") {
          try {
            this.itemsConfig = JSON.parse(newValue);
          } catch (e) {
            console.error("Invalid items JSON", e);
            this.itemsConfig = [];
          }
        }

        if (name === "paused") {
          if (newValue === "true") {
            this.pause();
          } else {
            this.play();
          }
        }

        if (this.isConnected && name !== "paused") {
          this.render();
        }
    }

    connectedCallback() {
        this.render();
        this.startGame();

        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this);

        // Mouse controls
        this.isDragging = false;
        // Mouse controls only on bucket
        this.bucket.addEventListener("mousedown", (e) => this.startDrag(e));
        window.addEventListener("mousemove", (e) => this.dragMove(e));
        window.addEventListener("mouseup", () => this.endDrag());

        // Touch controls only on bucket
        this.bucket.addEventListener("touchstart", (e) => this.startDrag(e.touches[0]));
        window.addEventListener("touchmove", (e) => this.dragMove(e.touches[0]));
        window.addEventListener("touchend", () => this.endDrag());
    }

    disconnectedCallback() {
        this.destroy();
    }

    getAttributeValue(attr, fallback = '') {
        const val = this.getAttribute(attr);
        return val !== null ? val : fallback;
    }

    startDrag(e) {
        this.isDragging = true;
        this.dragMove(e); // move immediately on press
    }

    dragMove(e) {
        if (!this.isDragging || !this.bucket) return;

        const containerRect = this.container.getBoundingClientRect();
        const bucketWidth = this.bucket.offsetWidth/2;

        let newLeft = e.clientX - containerRect.left - bucketWidth;

        // Clamp inside bounds
        if (newLeft < (bucketWidth)) newLeft = (bucketWidth);
        if (newLeft > this.offsetWidth - bucketWidth) {
          newLeft = this.offsetWidth - bucketWidth;
        }

        this.bucket.style.left = newLeft + "px";
    }

    endDrag() {
        this.isDragging = false;
    }

    render() {
        const stc_id = `SlideToCollect-${Math.random().toString(36).substr(2, 5)}`;

        this.adWidgetId = this.getAttribute('ad_widget_id') || stc_id;
        this.widgetId = this.getAttribute('widget_id') || null;

        this.widgetOrder = this.getAttribute('order') || "SlideToCollect";
        this.setAttribute("id", this.widgetOrder);

        // section
        const section_bg_color = this.getAttribute("section_bg_color");
        const section_bg_src = this.getAttribute("section_bg_src");

        // score
        const score_text_color = this.getAttribute("score_text_color");
        const score_bg_color = this.getAttribute("score_bg_color");

        // timer
        const timer_text_color = this.getAttribute("timer_text_color");
        const timer_bg_color = this.getAttribute("timer_bg_color");

        // bucket
        const bucket_src = this.getAttribute("bucket_src");

        this.reveal_widget = this.getAttributeValue("reveal_widget");
        this.transition_animation = this.getAttribute("transition_animation");

        // create HTML wrapper start
        const game_wrapper = document.createElement("div");
        game_wrapper.classList.add("game-container");
        game_wrapper.style.backgroundImage = `url(${section_bg_src || ""}`;
        game_wrapper.style.backgroundColor = section_bg_color || "#CCCCCC";

        const score_wrapper = document.createElement("div");
        score_wrapper.classList.add("score-container");
        score_wrapper.style.color = score_text_color || "#FFFFFF";
        score_wrapper.style.backgroundColor = score_bg_color || "#CCCCCC";

        const timer_wrapper = document.createElement("div");
        timer_wrapper.classList.add("timer-container");
        timer_wrapper.style.color = timer_text_color || "#FFFFFF";
        timer_wrapper.style.backgroundColor = timer_bg_color || "#CCCCCC";

        const score_overlay = document.createElement("div");
        score_overlay.classList.add("score_overlay");


        this.innerHTML = '';
        game_wrapper.appendChild(score_wrapper);
        game_wrapper.appendChild(timer_wrapper);
        game_wrapper.appendChild(score_overlay);
        if(bucket_src){
            const bucket = document.createElement("div");
            bucket.classList.add("bucket");
            
            const bucket_image = document.createElement("img");
            bucket_image.setAttribute("src", `${bucket_src || ""}`);
            bucket.appendChild(bucket_image);
            game_wrapper.appendChild(bucket);
        }
        this.appendChild(game_wrapper);


        this.container = this.querySelector(".game-container");
        this.scoreBoard = this.querySelector(".score-container");
        this.timerBoard = this.querySelector(".timer-container");
        this.bucket = this.querySelector(".bucket");

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

        if(this.reveal_widget != ''){
            const existingWrapper = document.querySelector(
                `widget-wrapper[reveal_widget="${this.reveal_widget}"]`
            );
            if (existingWrapper) {
                console.log("Widget wrapper already exists for:", this.reveal_widget);
                return; // stop here
            }

            const group_id = `widget_group-${Math.random().toString(36).substr(2, 5)}`;
            const widget_group = document.createElement('widget-wrapper');
            widget_group.setAttribute("order", group_id);
            widget_group.setAttribute("reveal_widget", this.reveal_widget);
            widget_group.setAttribute("transition_animation", this.transition_animation);
            widget_group.setAttribute("is_active", false);
            document.querySelector?.('ad-frame-deck')?.appendChild(widget_group);

            waitForWidget(this.reveal_widget, (get_widget) => {
                get_widget.setAttribute("paused", "true");
                widget_group.appendChild(get_widget);
                // AdEventTracker?._hiddenWidgetSet?.add(item.this.reveal_widget);
                getFrameOrientation(excludedWidgetTags);
            });
            
        }
        // create HTML wrapper end

        
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

    startGame() {
        const GameTimer = this.getAttribute("game_timer");
        this.timeLeft = parseInt(GameTimer || "20", 10);
        this.score = 0;
        this.scoreBoard.innerHTML = `<span class="game-score">0</span><br/><span class="score-icon">Score</span>`;
        this.timerBoard.innerHTML =  `<span class="game-timer">${GameTimer}</span><br/><span class="timer-icon">Timer</span>`;

        this.timer = setInterval(() => {
          if (this.isPaused) return;
          if (this.timeLeft < 0) {
            clearInterval(this.timer);
            // alert("Game Over! Final Score: " + this.score);
            this.endGame();
          } else {
            this.spawnItem();
            this.querySelector(".game-timer").textContent = this.timeLeft;
          }
          this.timeLeft--;
        }, 1000);
    }

    endGame(isKilled = false) {
        const overlay = this.querySelector(".score_overlay");
        if (!overlay) return;

        let message = "";
        if (this.score > 0) {
            message = this.getAttribute("success_message") || "";
        } else {
            message = this.getAttribute("failure_message") || "";
        }

        overlay.innerHTML = `<div><div>${message}</div><div class='score-text'>Your Score</div><div class='user-score'>${this.score}</div><div><span class='replay game-btn'>Replay</span>${this.reveal_widget ? "<span class='skip game-btn'>Skip</span>": ''}</div></div>`;
        overlay.style.visibility = "visible";

        clearInterval(this.timer);

        // Attach button listeners
        const replayBtn = overlay.querySelector(".replay");
        const skipBtn = overlay.querySelector(".skip");

        replayBtn?.addEventListener("click", () => {
          this.restart();
        });

        skipBtn?.addEventListener("click", () => {
          this.revealNextWidget();
        });
    }

    revealNextWidget(){
        if(!this.reveal_widget) return;

        const reveal_wrapper = document.querySelector?.('ad-frame-deck')?.querySelector(`widget-wrapper[reveal_widget="${this.reveal_widget}"]`);

        this.append(reveal_wrapper);

        if (!reveal_wrapper) return;
        reveal_wrapper.setAttribute("transition_animation", this.transition_animation || "wrapper-fade");
        reveal_wrapper.setAttribute("is_active", "true");
    }

    spawnItem() {
        if (!this.itemsConfig.length) return;
        const config = this.itemsConfig[Math.floor(Math.random() * this.itemsConfig.length)];

        const item = document.createElement("img");
        item.src = config.image_src;
        item.classList.add("falling-items");
        item.dataset.score = config.score || 1;
        item.dataset.kill = config.kill || false;
        item.style.left = Math.random() * (this.offsetWidth - 40) + "px";

        this.container.appendChild(item);
        this.fallingItems.push(item);

        this.animateItem(item);
    }

    animateItem(item) {
      let top = 0;
      const fallDuration = 2500; // 4 seconds to fall completely
      const startTime = performance.now();

      const fall = (now) => {
        if (this.isPaused) {
          requestAnimationFrame(fall);
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(elapsed / fallDuration, 1);

        // Map progress (0 → 1) to container height
        top = progress * (this.offsetHeight - item.offsetHeight);
        item.style.top = top + "px";

        if (this.checkCollision(item, this.bucket)) {
          if (item.dataset.kill === "true") {
            item.remove();
            this.fallingItems = this.fallingItems.filter(i => i !== item);
            this.endGame(true);   // pass a flag for killed
            return;
          } else {
            this.updateScore(parseInt(item.dataset.score, 10));
            item.remove();
            this.fallingItems = this.fallingItems.filter(i => i !== item);
            return;
          }
        }


        if (progress < 1) {
          requestAnimationFrame(fall);
        } else {
          // reached bottom
          item.remove();
          this.fallingItems = this.fallingItems.filter(i => i !== item);
        }
      };

      requestAnimationFrame(fall);
    }


    checkCollision(item, bucket) {
        const rect1 = item.getBoundingClientRect();
        const rect2 = bucket.getBoundingClientRect();
        return !(
          rect1.top > rect2.bottom ||
          rect1.bottom < rect2.top ||
          rect1.right < rect2.left ||
          rect1.left > rect2.right
        );
    }

    updateScore(value) {
      this.score += value;
      // this.scoreBoard.textContent = "Score: " + this.score;
      this.querySelector(".game-score").textContent = this.score;

      // Create floating score text
      const floatText = document.createElement("div");
      floatText.textContent = (value > 0 ? "+" : "") + value;
      floatText.style.position = "absolute";
      floatText.style.left = this.bucket.offsetLeft + this.bucket.offsetWidth / 2 - 10 + "px";
      floatText.style.top = this.bucket.offsetTop - 20 + "px";
      floatText.style.color = value > 0 ? "lime" : "red";
      floatText.style.fontWeight = "bold";
      floatText.style.pointerEvents = "none";
      floatText.style.animation = "floatUp 1s ease forwards";

      this.container.appendChild(floatText);

      // Remove after animation
      floatText.addEventListener("animationend", () => floatText.remove());
    }

    handleResize() {
        if (this.bucket) {
          const maxLeft = this.offsetWidth - this.bucket.offsetWidth;
          const currentLeft = this.bucket.offsetLeft;
          if (currentLeft > maxLeft) {
            this.bucket.style.left = maxLeft + "px";
          }
        }
    }

    // === Control functions ===
    pause() {
        console.log("pause");
        this.isPaused = true;
    }

    play() {
        this.isPaused = false;
    }

    resume(){
        console.log("play");
        this.isPaused = false;
    }

    restart() {
        this.destroy();
        this.render();
        const overlay = this.querySelector(".score_overlay");
        if (overlay) overlay.style.visibility = "hidden"; // reset overlay
        this.startGame();
    }

    destroy() {
        if (this.timer) clearInterval(this.timer);
        this.fallingItems.forEach(item => item.remove());
        this.fallingItems = [];
        this.isPaused = false;
        if (this.resizeObserver) this.resizeObserver.disconnect();
    }
}

customElements.define('wgt-slide-collect', WgtSlideToCollect);