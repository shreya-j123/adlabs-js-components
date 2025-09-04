// Event Enum
const VservAdlabsEvents = {
  INITIALIZED: "bridgeInitialized",
  AD_PARAMS_SET: "adParamsSet",
  CLICK: "click",
  PAUSE: "pause",
  RESUME: "resume",
  CLOSE: "close",
  RENDER: "render",
  ERROR: "error",
  CLOSEABLE: "closeable",
  INTERACTION_START: "interactionStarted",
  INTERACTION_END: "interactionEnded",
};

if (typeof window !== "undefined") {
  window.VservAdlabsEvents = VservAdlabsEvents;
}
const eventsMap = new Map();

const VservAdlabs = (function () {
  let _htmlEventListeners = {};
  let _jsonDataCache = {};

  return {
    init: function () {
      if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener(
          "message",
          function (event) {
            if (event.source !== window.parent || !event.data?.event) return;

            const { event: eventType, data } = event.data;

            if (eventType === VservAdlabsEvents.AD_PARAMS_SET) {
              VservAdlabs.setAdParams(data);
            } else {
              VservAdlabs.notifyAd(eventType, data);
            }
          },
          false
        );
      }
      console.log("VservAdlabs: Initialized");
      VservAdlabs.notifyRenderer(VservAdlabsEvents.INITIALIZED);
      return true;
    },

    notifyAd: function (eventName, data = {}) {
      console.log(">>> notify Ad", eventName, data);
      if (_htmlEventListeners[eventName]) {
        _htmlEventListeners[eventName].forEach((listener) => {
          try {
            listener(data || {});
          } catch (e) {
            console.error(`VservAdlabs: Listener error for ${eventName}`, e);
          }
        });
      }

      try {
        const event = new CustomEvent("app:" + eventName, {
          detail: data || {},
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
      } catch (e) {
        console.error("VservAdlabs: Custom event dispatch error", e);
      }

      return true;
    },

    addEventListener: function (eventName, callback) {
      //if event already has callback, dispatch it
      if (_htmlEventListeners[eventName]) {
        _htmlEventListeners[eventName].forEach((listener) => {
          try {
            listener();
          } catch (e) {
            console.warn(`VservAdlabs: Listener error for ${eventName}`, e);
          }
        });
      }

      if (!_htmlEventListeners[eventName]) {
        _htmlEventListeners[eventName] = [];
      }
      _htmlEventListeners[eventName].push(callback);

      return function () {
        VservAdlabs.removeEventListener(eventName, callback);
      };
    },

    removeEventListener: function (eventName, callback) {
      if (!_htmlEventListeners[eventName]) return;

      if (callback) {
        _htmlEventListeners[eventName] = _htmlEventListeners[eventName].filter(
          (cb) => cb !== callback
        );
      } else {
        delete _htmlEventListeners[eventName];
      }
    },

    notifyRenderer(eventName, data = {}) {
      if (!eventName) return;
      const message = {
        event: eventName,
        data: data || {},
        timestamp: Date.now(),
      };
      const json = JSON.stringify(message);

      const handlers = [
        {
          condition: () => !!window.ReactNativeWebView?.postMessage,
          action: () => window.ReactNativeWebView.postMessage(json),
        },
        {
          condition: () =>
            !!window.webkit?.messageHandlers?.vservAdlabsBridge?.postMessage,
          action: () =>
            window.webkit.messageHandlers.vservAdlabsBridge.postMessage(
              message
            ),
        },
        {
          condition: () => !!window?.vservAdlabsBridge?.notifyRenderer,
          action: () => window.vservAdlabsBridge.notifyRenderer(json),
        },
        {
          condition: () =>
            window.parent !== window && !!window.parent?.postMessage,
          action: () => window.parent.postMessage(message, "*"),
        },
      ];

      for (const { condition, action } of handlers) {
        if (condition()) {
          action();
          return;
        }
      }

      // Fallback for debugging
      console.log("[vservAdlabsBridge -> App]", message);
    },

    setAdParams: function (jsonData) {
      try {
        // const {jsonData} = params;
        let parsed = jsonData;
        if (typeof jsonData === "string") {
          try {
            parsed = JSON.parse(jsonData);
          } catch (e) {
            console.error("VservAdlabs: Invalid JSON for key:");
            return false;
          }
        }

        _jsonDataCache = parsed;
        this.notifyAd(VservAdlabsEvents.AD_PARAMS_SET, _jsonDataCache);
        return true;
      } catch (e) {
        console.error("VservAdlabs: setJsonData error", e);
        return false;
      }
    },
    getAdParams: function (key) {
      if (!key) return _jsonDataCache;
      return _jsonDataCache[key] || null;
    },
  };
})();

// Auto-init
// if (typeof window !== "undefined") {
//   document.addEventListener("DOMContentLoaded", () => {
VservAdlabs.init();
//   });
// }

// Module exports
if (typeof module !== "undefined" && module.exports) {
  module.exports = VservAdlabs;
  module.exports.VservAdlabsEvents = VservAdlabsEvents;
}

if (typeof exports !== "undefined") {
  exports.default = VservAdlabs;
  exports.VservAdlabsEvents = VservAdlabsEvents;
}
