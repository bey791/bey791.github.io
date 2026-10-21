(function () {
  "use strict";
  var root = document.documentElement;

  function beleadedHost() {
    return location.hostname === "www.beleaded.com" || location.hostname === "beleaded.com";
  }

  function clearCalendlyTimer() {
    if (calendlyOpenTimer) {
      window.clearTimeout(calendlyOpenTimer);
      calendlyOpenTimer = 0;
    }
  }

/* Popup and overlay for calendly.com links.
   site.js captures the plain left click, shows the hold, and loads this file.
   This file loads widget.css and widget.js, pins the page, and opens the popup.
   A 3 second new-tab fallback is armed on every open. The timer is cleared when
   the overlay is on the page, including when a late overlay is detected, and again
   in prepareOpenPopup. If the overlay is still missing when the timer fires, the
   open generation is bumped, the hold ends, and that href opens in one new tab.
   A popup that appears after that bump is closed. A tab and a popup never both stay up.
   If init throws or the script fails, that same href opens in one new tab.
   Escape or a click on the backdrop, before the overlay exists, cancels the open.
   book_meeting is registered when this file loads. */
var calendlyCss = "https://assets.calendly.com/assets/external/widget.css";
var calendlyJs = "https://assets.calendly.com/assets/external/widget.js";
var calendlyLoadState = "idle";
var calendlyWaiters = [];
var calendlyScrollY = 0;
var calendlyHtmlOverflow = "";
var calendlyOpener = null;
var calendlyCursorState = null;
var calendlySawOverlay = false;
var calendlyCloseReady = false;
var calendlyObserver = null;
var calendlyOpenGen = 0;
var calendlyLiveGen = 0;
var calendlyOpenTimer = 0;

function calendlyPopupOpen() {
  return !!document.querySelector(".calendly-overlay");
}

function flushCalendlyWaiters(ok) {
  var waiters = calendlyWaiters;
  var i;
  calendlyWaiters = [];
  for (i = 0; i < waiters.length; i++) waiters[i](ok);
}

function markCalendlyReady() {
  if (window.Calendly && typeof window.Calendly.initPopupWidget === "function") {
    calendlyLoadState = "ready";
    flushCalendlyWaiters(true);
    return;
  }
  calendlyLoadState = "failed";
  flushCalendlyWaiters(false);
}

function ensureCalendly(done) {
  if (window.Calendly && typeof window.Calendly.initPopupWidget === "function") {
    calendlyLoadState = "ready";
    done(true);
    return;
  }
  if (calendlyLoadState === "failed") {
    done(false);
    return;
  }
  calendlyWaiters.push(done);
  if (calendlyLoadState === "loading") return;
  calendlyLoadState = "loading";

  if (!document.querySelector('link[href="' + calendlyCss + '"]')) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = calendlyCss;
    document.head.appendChild(link);
  }

  var script = document.querySelector('script[src="' + calendlyJs + '"]');
  if (!script) {
    script = document.createElement("script");
    script.async = true;
    script.src = calendlyJs;
    script.addEventListener("load", markCalendlyReady);
    script.addEventListener("error", function () {
      calendlyLoadState = "failed";
      flushCalendlyWaiters(false);
    });
    document.head.appendChild(script);
  } else {
    script.addEventListener("load", markCalendlyReady);
    script.addEventListener("error", function () {
      calendlyLoadState = "failed";
      flushCalendlyWaiters(false);
    });
  }
}

function bindCalendlyHold(hold) {
  if (!hold || hold.getAttribute("data-bl-cal")) return;
  hold.setAttribute("data-bl-cal", "1");
  hold.addEventListener("click", function (ev) {
    ev.preventDefault();
    if (calendlyPopupOpen()) return;
    cancelPendingCalendly();
  });
}

function showCalendlyHold() {
  var hold = document.querySelector(".bl-cal-hold");
  var spin, i;
  if (hold) {
    bindCalendlyHold(hold);
    return;
  }
  hold = document.createElement("div");
  spin = document.createElement("div");
  hold.className = "bl-cal-hold";
  hold.setAttribute("aria-hidden", "true");
  spin.className = "bl-cal-hold-spin";
  for (i = 0; i < 3; i++) spin.appendChild(document.createElement("div"));
  hold.appendChild(spin);
  bindCalendlyHold(hold);
  document.body.appendChild(hold);
}

function removeCalendlyHold() {
  var hold = document.querySelector(".bl-cal-hold");
  if (hold && hold.parentNode) hold.parentNode.removeChild(hold);
}

function calendlyInertNodes() {
  return [
    document.querySelector(".site-header"),
    document.querySelector("main"),
    document.querySelector(".site-footer"),
    document.querySelector(".book-bar")
  ];
}

function setCalendlyInert(on) {
  var nodes = calendlyInertNodes();
  var i;
  for (i = 0; i < nodes.length; i++) {
    if (!nodes[i]) continue;
    if (on) nodes[i].setAttribute("inert", "");
    else nodes[i].removeAttribute("inert");
  }
}

function holdCalendlyCursor() {
  calendlyCursorState = {
    has: root.classList.contains("has-cursor"),
    on: root.classList.contains("cur-on")
  };
    window.blCur = true;
  root.classList.remove("has-cursor");
  root.classList.remove("cur-on");
}

function restoreCalendlyCursor() {
  var state = calendlyCursorState;
  if (state) {
    root.classList.toggle("has-cursor", !!state.has);
    root.classList.toggle("cur-on", !!state.on);
  }
  calendlyCursorState = null;
    window.blCur = false;
}

function pinCalendlyBody(y) {
  var body = document.body;
  var sw = window.innerWidth - document.documentElement.clientWidth;
  calendlyHtmlOverflow = root.style.overflow;
  root.classList.add("bl-cal-open");
  root.style.overflow = "hidden";
  body.style.position = "fixed";
  body.style.top = "-" + y + "px";
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "auto";
  body.style.paddingRight = sw + "px";
  root.style.setProperty("--bl-cal-sb", sw + "px");
}

function unpinCalendlyBody() {
  var body = document.body;
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";
  body.style.paddingRight = "";
  root.style.removeProperty("--bl-cal-sb");
}

function beginCalendlyUi(opener) {
  var y;
  if (opener) calendlyOpener = opener;
  if (root.classList.contains("bl-cal-open")) return;
  y = window.scrollY || window.pageYOffset || 0;
  calendlyScrollY = y;
  holdCalendlyCursor();
  pinCalendlyBody(y);
  setCalendlyInert(true);
  ensureCalendlyObserver();
}

function endCalendlyUi() {
  var y, opener;
  removeCalendlyHold();
  if (!root.classList.contains("bl-cal-open")) return;
  y = calendlyScrollY;
  unpinCalendlyBody();
  root.classList.remove("bl-cal-open");
  root.style.overflow = calendlyHtmlOverflow;
  calendlyHtmlOverflow = "";
  /* Chrome drops nested classic scrollbars when the page scrollbar toggles. Re-evaluate the page's own scrollers. */
  Array.prototype.forEach.call(document.querySelectorAll(".table-wrap,.owners-scroll,.prose pre"), function (el) {
    var sl = el.scrollLeft;
    el.style.overflowX = "hidden";
    void el.offsetWidth;
    el.style.overflowX = "";
    el.scrollLeft = sl;
  });
  window.scrollTo({ top: y, left: 0, behavior: "instant" });
  setCalendlyInert(false);
  restoreCalendlyCursor();
  opener = calendlyOpener;
  calendlyOpener = null;
  calendlyCloseReady = false;
  if (opener && typeof opener.focus === "function") {
    try { opener.focus({ preventScroll: true }); }
    catch (err) { opener.focus(); }
  }
}

function focusCalendlyClose() {
  var btn = document.querySelector(".calendly-overlay button.calendly-popup-close");
  if (btn && typeof btn.focus === "function") btn.focus();
}

function upgradeCalendlyClose() {
  var old = document.querySelector(".calendly-overlay .calendly-popup-close");
  var btn;
  if (!old) return null;
  if (old.tagName === "BUTTON") return old;
  btn = document.createElement("button");
  btn.type = "button";
  btn.className = "calendly-popup-close";
  btn.setAttribute("aria-label", "Close booking");
  btn.addEventListener("click", function (ev) {
    ev.preventDefault();
    if (window.Calendly && typeof window.Calendly.closePopupWidget === "function") {
      window.Calendly.closePopupWidget();
    }
  });
  if (old.parentNode) old.parentNode.replaceChild(btn, old);
  return btn;
}

function prepareOpenPopup() {
  if (!calendlyPopupOpen()) return;
  clearCalendlyTimer();
  calendlySawOverlay = true;
  removeCalendlyHold();
  if (calendlyCloseReady) return;
  calendlyCloseReady = true;
  upgradeCalendlyClose();
  focusCalendlyClose();
  if (window.requestAnimationFrame) requestAnimationFrame(focusCalendlyClose);
}

function onCalendlyMutations() {
  if (calendlyPopupOpen()) {
    clearCalendlyTimer();
    if (calendlyLiveGen !== calendlyOpenGen) {
      if (window.Calendly && typeof window.Calendly.closePopupWidget === "function") {
        window.Calendly.closePopupWidget();
      }
      return;
    }
    prepareOpenPopup();
    return;
  }
  if (calendlySawOverlay) {
    calendlySawOverlay = false;
    endCalendlyUi();
  }
}

function ensureCalendlyObserver() {
  if (calendlyObserver || !window.MutationObserver) return;
  calendlyObserver = new MutationObserver(onCalendlyMutations);
  calendlyObserver.observe(document.body, { childList: true, subtree: true });
}

function cancelPendingCalendly() {
  calendlyOpenGen = calendlyOpenGen + 1;
  if (calendlyOpenTimer) {
    window.clearTimeout(calendlyOpenTimer);
    calendlyOpenTimer = 0;
  }
  endCalendlyUi();
}

function calendlyWidgetReady() {
  return !!(window.Calendly && typeof window.Calendly.initPopupWidget === "function");
}

function openCalendlyPopup(href, opener) {
  var gen = calendlyOpenGen + 1;
  var settled = false;
  calendlyOpenGen = gen;
  calendlyLiveGen = gen;
  showCalendlyHold();
  beginCalendlyUi(opener);
  if (calendlyOpenTimer) {
    window.clearTimeout(calendlyOpenTimer);
    calendlyOpenTimer = 0;
  }
  calendlyOpenTimer = window.setTimeout(function () {
    if (settled || gen !== calendlyOpenGen) return;
    if (calendlyPopupOpen()) {
      settled = true;
      calendlyOpenTimer = 0;
      prepareOpenPopup();
      return;
    }
    settled = true;
    calendlyOpenTimer = 0;
    calendlyOpenGen = calendlyOpenGen + 1;
    endCalendlyUi();
    window.open(href, "_blank", "noopener");
  }, 3000);

  function finishFallback() {
    if (settled || gen !== calendlyOpenGen) return;
    if (calendlyPopupOpen()) {
      settled = true;
      if (calendlyOpenTimer) {
        window.clearTimeout(calendlyOpenTimer);
        calendlyOpenTimer = 0;
      }
      prepareOpenPopup();
      return;
    }
    settled = true;
    if (calendlyOpenTimer) {
      window.clearTimeout(calendlyOpenTimer);
      calendlyOpenTimer = 0;
    }
    endCalendlyUi();
    window.open(href, "_blank", "noopener");
  }

  ensureCalendly(function (ok) {
    if (settled || gen !== calendlyOpenGen) return;
    if (!ok || !calendlyWidgetReady()) {
      finishFallback();
      return;
    }
    try {
      window.Calendly.initPopupWidget({ url: href });
    } catch (err) {
      finishFallback();
      return;
    }
    if (settled || gen !== calendlyOpenGen) return;
    if (!calendlyPopupOpen()) return;
    settled = true;
    if (calendlyOpenTimer) {
      window.clearTimeout(calendlyOpenTimer);
      calendlyOpenTimer = 0;
    }
    prepareOpenPopup();
  });
}

function calendlyAnchorFrom(target) {
  var el = target;
  if (!el) return null;
  if (el.nodeType !== 1) el = el.parentElement;
  if (!el || !el.closest) return null;
  return el.closest("a");
}

function preloadCalendlyFrom(target) {
  var a = calendlyAnchorFrom(target);
  if (!a || a.hostname !== "calendly.com") return;
  ensureCalendly(function () {});
}

document.addEventListener("pointerover", function (e) {
  preloadCalendlyFrom(e.target);
});
document.addEventListener("focusin", function (e) {
  if (root.classList.contains("bl-cal-open")) {
    var overlay = document.querySelector(".calendly-overlay");
    if (overlay && e.target && !overlay.contains(e.target)) focusCalendlyClose();
  }
  preloadCalendlyFrom(e.target);
});
document.addEventListener("keydown", function (e) {
  var overlay, btn, frame, active;
  if (e.key === "Escape" || e.keyCode === 27) {
    if (calendlyPopupOpen()) {
      if (window.Calendly && typeof window.Calendly.closePopupWidget === "function") {
        window.Calendly.closePopupWidget();
      }
      return;
    }
    if (root.classList.contains("bl-cal-open") || document.querySelector(".bl-cal-hold")) {
      cancelPendingCalendly();
    }
    return;
  }
  if (e.key !== "Tab" || !root.classList.contains("bl-cal-open")) return;
  overlay = document.querySelector(".calendly-overlay");
  if (!overlay) return;
  btn = overlay.querySelector("button.calendly-popup-close");
  frame = overlay.querySelector("iframe");
  if (!btn) return;
  active = document.activeElement;
  if (active === btn) {
    e.preventDefault();
    if (!e.shiftKey && frame && typeof frame.focus === "function") frame.focus();
    else btn.focus();
    return;
  }
  if (!active || !overlay.contains(active)) {
    e.preventDefault();
    btn.focus();
  }
});
/* book_meeting fires once per page load, on production hosts only.
   bl_last_cta is JSON. position is sent only when that JSON parses and
   position is a non-empty string of 32 characters or fewer.
   An empty string, a bad value, or a missing position sends unknown.
   The event payload is exactly position and page_path. page_path is location.pathname.
   Invitee fields from the Calendly message are never read or sent. */
var bookMeetingSent = false;
window.addEventListener("message", function (event) {
  var data, position, stored, parsed;
  if (!beleadedHost()) return;
  if (!event || event.origin !== "https://calendly.com") return;
  data = event.data;
  if (!data || data.event !== "calendly.event_scheduled") return;
  if (bookMeetingSent) return;
  bookMeetingSent = true;
  position = "unknown";
  try {
    stored = window.localStorage.getItem("bl_last_cta");
    if (stored) {
      parsed = JSON.parse(stored);
      if (parsed && typeof parsed.position === "string" && parsed.position && parsed.position.length <= 32) position = parsed.position;
    }
  } catch (err) {}
  if (typeof gtag === "function") gtag("event", "book_meeting", { position: position, page_path: location.pathname });
});

  window.blCalendlyPreload = function (anchor) {
    preloadCalendlyFrom(anchor);
  };

  window.blCalendlyOpen = function (anchor, gen) {
    var href;
    if (gen && window.blCalGen && gen !== window.blCalGen) return;
    href = anchor && anchor.href;
    if (!href) return;
    openCalendlyPopup(href, anchor);
  };
})();
