(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var smallMq = window.matchMedia ? window.matchMedia("(max-width: 768px)") : null;
  var reduce = !!(reduceMq && reduceMq.matches);
  var motion = "IntersectionObserver" in window;
  var scrollDriven = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));
  /* Reduced motion holds canvas and marquee loops. Small screens keep those loops and only pause them while a finger is scrolling. */
  function isSmall() { return !!(smallMq && smallMq.matches); }
  function holdMotion() { return reduce; }
  var scrolling = false, scrollTimer = 0, canvasResumes = [];
  function resumeCanvases() { canvasResumes.forEach(function (fn) { fn(); }); }
  root.classList.add("js");
  if (motion) root.classList.add("motion");
  if (reduce) root.classList.add("reduce");
  if (!scrollDriven || reduce || isSmall()) root.classList.add("jsreveal");

  /* ---------------- Header, progress, nav ---------------- */
  var header = document.querySelector(".site-header");
  var bar = document.querySelector(".progress span");
  var ticking = false;
  function onScroll() {
    if (isSmall()) {
      scrolling = true;
      root.classList.add("is-scrolling");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        scrolling = false;
        root.classList.remove("is-scrolling");
        resumeCanvases();
      }, 180);
    }
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      if (header) header.classList.toggle("scrolled", y > 8);
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      }
      runScrollHandlers();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  var navToggle = document.querySelector(".nav-toggle");
  var navList = document.getElementById("nav-list");
  var navScrim = null;
  var scrollLockY = 0;
  if (navToggle && navList) {
    navScrim = document.createElement("button");
    navScrim.type = "button";
    navScrim.className = "nav-scrim";
    navScrim.setAttribute("aria-label", "Close menu");
    navScrim.hidden = true;
    document.body.appendChild(navScrim);
    navToggle.setAttribute("aria-label", "Open menu");
  }
  function setNav(open) {
    if (!navToggle || !navList) return;
    var wasOpen = document.body.classList.contains("nav-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navToggle.textContent = open ? "Close" : "Menu";
    navList.setAttribute("data-open", String(open));
    if (navScrim) {
      navScrim.hidden = !open;
      navScrim.setAttribute("data-open", String(open));
    }
    if (open) {
      scrollLockY = window.scrollY || 0;
      document.body.style.top = "-" + scrollLockY + "px";
      document.body.classList.add("nav-open");
    } else if (wasOpen) {
      document.body.classList.remove("nav-open");
      document.body.style.top = "";
      window.scrollTo(0, scrollLockY);
    }
  }
  if (navToggle && navList) {
    navToggle.addEventListener("click", function () {
      setNav(navToggle.getAttribute("aria-expanded") !== "true");
    });
    navScrim.addEventListener("click", function () { setNav(false); });
  }
  window.addEventListener("resize", function () {
    if (window.innerWidth > 1020 && navToggle && navToggle.getAttribute("aria-expanded") === "true") setNav(false);
  });
  var drops = Array.prototype.slice.call(document.querySelectorAll(".nav-drop"));
  function closeDrops(except) {
    drops.forEach(function (d) {
      if (d === except) return;
      var b = d.querySelector("button"), m = d.querySelector(".drop");
      if (b) b.setAttribute("aria-expanded", "false");
      if (m) m.setAttribute("data-open", "false");
    });
  }
  drops.forEach(function (d) {
    var b = d.querySelector("button"), m = d.querySelector(".drop");
    if (!b || !m) return;
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = b.getAttribute("aria-expanded") !== "true";
      closeDrops(d);
      b.setAttribute("aria-expanded", String(open));
      m.setAttribute("data-open", String(open));
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".nav-drop")) closeDrops(null);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeDrops(null); setNav(false); }
  });
  document.querySelectorAll(".nav-list a, .drop a").forEach(function (a) {
    a.addEventListener("click", function () { closeDrops(null); setNav(false); });
  });

  /* ---------------- Scroll-linked handlers registry ---------------- */
  var scrollHandlers = [];
  function runScrollHandlers() { for (var i = 0; i < scrollHandlers.length; i++) scrollHandlers[i](); }

  /* ---------------- Reveal (never hides anything already on screen) ---------------- */
  var revealIO = motion ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }) : null;

  function splitWords(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = "1";
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement("span"); w.className = "w";
            var s = document.createElement("span"); s.textContent = p; s.style.setProperty("--i", i++);
            w.appendChild(s); frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    })(el);
  }

  function setupReveals(scope) {
    if (!motion) return;
    var vh = window.innerHeight;
    var calm = holdMotion();
    var sel = (scrollDriven && !calm) ? "[data-split]:not([data-seen])" : "[data-reveal]:not([data-seen]), [data-split]:not([data-seen])";
    scope.querySelectorAll(sel).forEach(function (el) {
      el.setAttribute("data-seen", "");
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.9 && r.bottom > 0) return; // already visible: leave it alone
      if (calm) return; // reduced motion: no stacked entrance transforms
      if (el.hasAttribute("data-split") && !reduce) { splitWords(el); el.classList.add("split"); }
      else if (el.hasAttribute("data-split")) { el.setAttribute("data-reveal", ""); }
      if (reduce) el.classList.add("fade");
      el.classList.add("pre");
      revealIO.observe(el);
    });
  }

  /* ---------------- Counters ---------------- */
  function setupCounters(scope) {
    scope.querySelectorAll("[data-count]:not([data-counted])").forEach(function (el) {
      el.setAttribute("data-counted", "");
      var raw = el.getAttribute("data-count");
      var end = parseFloat(raw);
      var dec = (raw.split(".")[1] || "").length;
      var pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "";
      var fmt = function (v) { return pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; };
      if (!motion) { el.textContent = fmt(end); return; }
      var run = function () {
        var t0 = performance.now(), dur = 1600;
        (function tick(t) {
          var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          el.textContent = fmt(end * e);
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      };
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); run(); }
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  /* ---------------- Hero rotator: live compose ---------------- */
  function typeInto(slide, gen, rot, done) {
    var ps = Array.prototype.slice.call(slide.querySelectorAll("[data-type] p"));
    if (!ps.length) { done(); return; }
    ps.forEach(function (p) { if (!p.dataset.full) p.dataset.full = p.textContent; p.textContent = ""; });
    var caret = document.createElement("span"); caret.className = "caret";
    var i = 0, j = 0;
    function step() {
      if (rot.dataset.gen !== gen) return;
      var p = ps[i], full = p.dataset.full;
      if (j === 0) p.appendChild(caret);
      if (j < full.length) {
        var ch = full.charAt(j); j++;
        caret.insertAdjacentText("beforebegin", ch);
        var wait = ch === "." || ch === "?" ? 240 : ch === "," ? 110 : 16 + Math.random() * 26;
        setTimeout(step, wait);
      } else {
        i++; j = 0;
        if (i < ps.length) setTimeout(step, 300); else { caret.remove(); done(); }
      }
    }
    setTimeout(step, 1150);
  }
  function restoreText(slide) {
    slide.querySelectorAll("[data-type] p").forEach(function (p) { if (p.dataset.full) p.textContent = p.dataset.full; });
    var c = slide.querySelector(".caret"); if (c) c.remove();
  }
  function setupRotator(scope) {
    scope.querySelectorAll("[data-rotator]:not([data-on])").forEach(function (rot) {
      rot.setAttribute("data-on", "");
      var slides = Array.prototype.slice.call(rot.querySelectorAll("[data-slide]"));
      var tabs = Array.prototype.slice.call(rot.querySelectorAll("[data-tab]"));
      var cur = 0;
      function go(n) {
        cur = n;
        var gen = String(Date.now()); rot.dataset.gen = gen;
        slides.forEach(function (s, k) {
          var on = k === n;
          s.classList.toggle("active", on);
          s.classList.remove("is-typing", "typed");
          s.setAttribute("aria-hidden", on ? "false" : "true");
          if (on) { s.removeAttribute("inert"); } else { s.setAttribute("inert", ""); restoreText(s); }
        });
        tabs.forEach(function (t, k) {
          t.setAttribute("aria-selected", k === n ? "true" : "false");
          t.setAttribute("tabindex", k === n ? "0" : "-1");
          t.classList.remove("run");
        });
        if (motion && tabs[n]) { void tabs[n].offsetWidth; tabs[n].classList.add("run"); }
        var slide = slides[n];
        if (!motion) { restoreText(slide); return; }
        typeInto(slide, gen, rot, function () {
          slide.classList.add("is-typing");
          setTimeout(function () {
            if (rot.dataset.gen !== gen) return;
            slide.classList.remove("is-typing"); slide.classList.add("typed");
          }, 1300);
        });
      }
      tabs.forEach(function (t, k) {
        t.addEventListener("click", function () { go(k); });
        t.addEventListener("keydown", function (e) {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            var n = (k + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
            go(n); tabs[n].focus();
          }
        });
        var b = t.querySelector(".bar");
        if (b) b.addEventListener("animationend", function () { if (t.classList.contains("run")) go((cur + 1) % slides.length); });
      });
      // Start only when visible, so the typing is seen from the first character
      if (motion && "IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (en) {
          if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); go(0); }
        }, { threshold: 0.3 });
        slides.forEach(function (s, k) { if (k) { s.setAttribute("inert", ""); s.setAttribute("aria-hidden", "true"); } });
        io.observe(rot);
      } else { go(0); }
      // Pointer tilt on the compose card
      var zone = rot.querySelector("[data-tilt-zone]");
      if (zone && motion && !holdMotion() && window.matchMedia("(hover: hover)").matches) {
        zone.addEventListener("pointermove", function (e) {
          var card = zone.querySelector(".slide.active [data-tilt]"); if (!card) return;
          var r = zone.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = "rotateY(" + (x * 7).toFixed(2) + "deg) rotateX(" + (-y * 7).toFixed(2) + "deg) translateZ(6px)";
          zone.style.setProperty("--px", x.toFixed(3)); zone.style.setProperty("--py", y.toFixed(3));
        });
        zone.addEventListener("pointerleave", function () {
          zone.querySelectorAll("[data-tilt]").forEach(function (c) { c.style.transform = ""; });
          zone.style.setProperty("--px", "0"); zone.style.setProperty("--py", "0");
        });
      }
    });
  }

  /* ---------------- New York clock (real, live) ---------------- */
  function setupClock(scope) {
    scope.querySelectorAll("[data-nyclock]:not([data-on])").forEach(function (el) {
      el.setAttribute("data-on", "");
      var tEl = el.querySelector("[data-time]"), sEl = el.querySelector("[data-state]");
      function upd() {
        try {
          var now = new Date();
          var time = now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
          var parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
          var wd = "", hr = 0;
          parts.forEach(function (p) { if (p.type === "weekday") wd = p.value; if (p.type === "hour") hr = parseInt(p.value, 10) % 24; });
          var open = wd !== "Sat" && wd !== "Sun" && hr >= 8 && hr < 17;
          if (tEl) tEl.textContent = time + " in New York";
          if (sEl) sEl.textContent = open ? "US inboxes are open. Campaigns are sending." : "Campaigns send 8:00 AM to 5:00 PM Eastern.";
          el.classList.toggle("open", open);
        } catch (e) {}
      }
      upd(); setInterval(upd, 30000);
    });
  }

  /* ---------------- DNS scan ---------------- */
  function setupScan(scope) {
    scope.querySelectorAll("[data-scan]:not([data-on])").forEach(function (rep) {
      rep.setAttribute("data-on", "");
      if (!motion) return;
      var rows = Array.prototype.slice.call(rep.querySelectorAll("[data-check]"));
      var r = rep.getBoundingClientRect();
      rows.forEach(function (row) { row.classList.add("pending"); });
      function run() {
        rep.classList.add("scanning");
        rows.forEach(function (row, k) {
          setTimeout(function () {
            row.classList.remove("pending"); row.classList.add("done");
            if (k === rows.length - 1) setTimeout(function () { rep.classList.remove("scanning"); }, 600);
          }, 500 + k * 380);
        });
      }
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); run(); }
      }, { threshold: 0.35 });
      io.observe(rep);
    });
  }

  /* ---------------- Sticky flow ---------------- */
  function setupFlow(scope) {
    scope.querySelectorAll("[data-flow]:not([data-on])").forEach(function (list) {
      list.setAttribute("data-on", "");
      if (!motion) return;
      list.classList.add("live");
      var steps = Array.prototype.slice.call(list.querySelectorAll(".flow-step"));
      var meter = scope.querySelector("[data-meter]");
      var label = scope.querySelector("[data-meter-label]");
      function update() {
        if (list.offsetParent === null) return;
        var mid = window.innerHeight * 0.52, best = 0, bestD = Infinity;
        steps.forEach(function (s, k) {
          var r = s.getBoundingClientRect(), c = r.top + r.height / 2, d = Math.abs(c - mid);
          if (d < bestD) { bestD = d; best = k; }
        });
        steps.forEach(function (s, k) {
          s.classList.toggle("current", k === best);
          s.classList.toggle("passed", k < best);
        });
        var lr = list.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (mid - lr.top) / lr.height));
        if (meter) meter.style.setProperty("--p", p.toFixed(3));
        if (label) label.textContent = "Step " + (best + 1) + " of " + steps.length;
      }
      scrollHandlers.push(update);
      update();
    });
  }

  /* ---------------- Parallax (small, tasteful) ---------------- */
  function setupParallax(scope) {
    if (!motion) return;
    scope.querySelectorAll("[data-parallax]:not([data-on])").forEach(function (el) {
      el.setAttribute("data-on", "");
      var figs = el.querySelectorAll("figure");
      function update() {
        if (holdMotion()) {
          if (figs[0]) figs[0].style.translate = "";
          if (figs[1]) figs[1].style.translate = "";
          if (figs[2]) figs[2].style.translate = "";
          return;
        }
        if (el.offsetParent === null) return;
        var r = el.getBoundingClientRect();
        var k = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        if (Math.abs(k) > 1.5) return;
        if (figs[0]) figs[0].style.translate = "0 " + (k * 40).toFixed(1) + "px";
        if (figs[1]) figs[1].style.translate = "0 " + (k * -24).toFixed(1) + "px";
        if (figs[2]) figs[2].style.translate = "0 " + (k * 56).toFixed(1) + "px";
      }
      scrollHandlers.push(update); update();
    });
    scope.querySelectorAll(".cta-mark:not([data-on])").forEach(function (m) {
      m.setAttribute("data-on", "");
      function update() {
        if (holdMotion()) { m.style.removeProperty("--py"); return; }
        if (m.offsetParent === null) return;
        var r = m.getBoundingClientRect();
        var k = (r.top - window.innerHeight) / window.innerHeight;
        if (k < -2 || k > 0.5) return;
        m.style.setProperty("--py", (k * 60).toFixed(1) + "px");
      }
      scrollHandlers.push(update); update();
    });
  }

  /* ---------------- Spotlight + magnetic ---------------- */
  function setupPointer(scope) {
    if (!window.matchMedia("(hover: hover)").matches || holdMotion()) return;
    scope.querySelectorAll(".feature, .post, .plan, .panel, .nl, .work-card, .svc-card, .ind-card, .glossary dt, .faq-list details, .calc-out").forEach(function (c) { c.classList.add("spot"); });
    scope.querySelectorAll(".spot:not([data-on])").forEach(function (c) {
      c.setAttribute("data-on", "");
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
    if (!motion) return;
    scope.querySelectorAll(".btn, .chip-btn, .rot-tab, .filter, .copy, .nav-cta a").forEach(function (b) {
      if (b.hasAttribute("data-mag")) return;
      b.setAttribute("data-mag", "");
      var k = b.classList.contains("btn") ? 0.18 : 0.12;
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * k).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * (k + 0.1)).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------------- Copy buttons ---------------- */
  function setupCopy(scope) {
    var status = document.getElementById("copy-status");
    scope.querySelectorAll(".copy:not([data-on])").forEach(function (b) {
      b.setAttribute("data-on", "");
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-copy"), label = b.textContent;
        function done(msg) {
          b.textContent = msg;
          if (status) status.textContent = msg === "Copied" ? "Email address copied" : "Email address selected";
          setTimeout(function () { b.textContent = label; }, 1800);
        }
        function fallback() {
          var el = document.getElementById(b.getAttribute("aria-controls"));
          if (el) { var rg = document.createRange(); rg.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(rg); }
          done("Selected");
        }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(function () { done("Copied"); }, fallback);
          else fallback();
        } catch (e) { fallback(); }
      });
    });
  }


  /* ---------------- Filters (work page) ---------------- */
  function setupFilters(scope) {
    scope.querySelectorAll("[data-filterable]:not([data-on])").forEach(function (box) {
      box.setAttribute("data-on", "");
      var bar = box.querySelector("[data-filters]");
      if (!bar) return;
      var items = Array.prototype.slice.call(box.querySelectorAll("[data-tags]"));
      var btns = Array.prototype.slice.call(bar.querySelectorAll("[data-filter]"));
      var status = box.querySelector("[data-filter-status]");
      var empty = box.querySelector("[data-filter-empty]");
      bar.hidden = false;
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          var f = b.getAttribute("data-filter"), n = 0;
          btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          items.forEach(function (it) {
            var on = f === "all" || (" " + it.getAttribute("data-tags") + " ").indexOf(" " + f + " ") > -1;
            it.hidden = !on;
            if (on) {
              n++;
              it.classList.remove("pre");
              it.classList.remove("flash-in"); void it.offsetWidth; it.classList.add("flash-in");
            }
          });
          if (empty) empty.hidden = n > 0;
          if (status) status.textContent = n + (n === 1 ? " engagement shown" : " engagements shown");
        });
      });
    });
  }


  /* ---------------- Deliverability switchboard ---------------- */
  function setupBoard(scope) {
    scope.querySelectorAll("[data-board]:not([data-on])").forEach(function (board) {
      board.setAttribute("data-on", "");
      var sws = Array.prototype.slice.call(board.querySelectorAll("[data-sw]"));
      var out = board.querySelector("[data-outcome]"), verdict = board.querySelector("[data-verdict]");
      var msgs = {
        inbox: "Everything checks out. The email lands in the primary inbox.",
        bounce: "Unverified addresses bounce, and every bounce tells Gmail and Outlook the list is bought or stale. The next send suffers for it.",
        auth: "Without SPF, DKIM and DMARC the domain can't prove the email is really from you. Gmail and Outlook.com now reject or junk unauthenticated bulk mail.",
        warm: "A new inbox with no sending history that starts at full volume gets throttled within days, and what does get through lands in spam."
      };
      function update() {
        var on = {}; sws.forEach(function (i) { on[i.getAttribute("data-sw")] = i.checked; });
        var state, msg;
        if (!on.verify) { state = "bounce"; msg = msgs.bounce; }
        else if (!on.spf || !on.dkim || !on.dmarc) { state = "spam"; msg = msgs.auth; }
        else if (!on.warm) { state = "spam"; msg = msgs.warm; }
        else { state = "inbox"; msg = msgs.inbox; }
        if (out.getAttribute("data-outcome") !== state) {
          out.setAttribute("data-outcome", state);
          var env = out.querySelector(".env");
          if (env) { env.style.animation = "none"; void env.offsetWidth; env.style.animation = ""; }
        }
        if (verdict && verdict.textContent !== msg) {
          verdict.textContent = msg; verdict.classList.remove("swap"); void verdict.offsetWidth; verdict.classList.add("swap");
        }
      }
      sws.forEach(function (i) { i.addEventListener("change", update); });
      update();
    });
  }


  /* ---------------- Program picker ---------------- */
  function setupPicker(scope) {
    scope.querySelectorAll("[data-picker]:not([data-on])").forEach(function (pk) {
      pk.setAttribute("data-on", "");
      var grid = scope.querySelector("[data-pick-target]"); if (!grid) return;
      var btns = Array.prototype.slice.call(pk.querySelectorAll("[data-pick]"));
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          var on = b.getAttribute("aria-pressed") !== "true";
          btns.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          grid.classList.toggle("picking", on);
          grid.querySelectorAll("[data-card]").forEach(function (c) { c.classList.toggle("lit", on && c.getAttribute("data-card") === b.getAttribute("data-pick")); });
          if (on) {
            b.setAttribute("aria-pressed", "true");
            var card = grid.querySelector('[data-card="' + b.getAttribute("data-pick") + '"]');
            if (card) { card.classList.remove("pre"); var r = card.getBoundingClientRect(); if (r.top < 90 || r.bottom > window.innerHeight) card.scrollIntoView({ block: "center", behavior: motion ? "smooth" : "auto" }); }
          }
        });
      });
    });
  }


  /* ---------------- Hero: reactive dot field, cursor glow, live capacity ---------------- */
  function setupHero(scope) {
    scope.querySelectorAll(".hero:not([data-on])").forEach(function (hero) {
      hero.setAttribute("data-on", "");
      var cv = hero.querySelector("canvas[data-dots]"), glow = hero.querySelector(".hero-glow");
      var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      // Word hover on the headline
      hero.querySelectorAll("[data-words]").forEach(function (el) {
        (function walk(node) {
          Array.prototype.slice.call(node.childNodes).forEach(function (c) {
            if (c.nodeType === 3) {
              var frag = document.createDocumentFragment();
              c.textContent.split(/(\s+)/).forEach(function (p) {
                if (!p) return;
                if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
                var sp = document.createElement("span"); sp.className = "hw"; sp.textContent = p; frag.appendChild(sp);
              });
              c.parentNode.replaceChild(frag, c);
            } else if (c.nodeType === 1) walk(c);
          });
        })(el);
      });
      // Live capacity counter: 400,000 emails a day of capacity
      var cap = hero.querySelector("[data-cap-n]");
      if (cap) {
        var c0 = performance.now(), perSec = 400000 / 86400;
        setInterval(function () { cap.textContent = Math.floor((performance.now() - c0) / 1000 * perSec).toLocaleString("en-US"); }, holdMotion() ? 1000 : 140);
      }
      if (!cv) return;
      var ctx = cv.getContext("2d"); if (!ctx) return;
      var W = 0, H = 0, dots = [], mx = -9999, my = -9999, t0 = performance.now(), raf = 0, visible = false, ripples = [], lastAmb = 0;
      function size() {
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var r = hero.getBoundingClientRect(); W = r.width; H = r.height;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        dots = []; var gap = W < 700 ? 22 : 26;
        for (var y = gap / 2; y < H; y += gap) for (var x = gap / 2; x < W; x += gap) dots.push({ x: x, y: y, o: Math.random() * 6.283 });
      }
      function frame(now) {
        raf = 0;
        if (!visible || holdMotion() || scrolling) return;
        var t = (now - t0) / 1000;
        if (now - lastAmb > 5200) { lastAmb = now; ripples.push({ x: W * (0.15 + Math.random() * 0.7), y: H * (0.2 + Math.random() * 0.6), t: now }); }
        for (var q = ripples.length - 1; q >= 0; q--) if (now - ripples[q].t > 2200) ripples.splice(q, 1);
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i], dx = d.x - mx, dy = d.y - my, dist = Math.sqrt(dx * dx + dy * dy);
          var k = dist < 240 ? (1 - dist / 240) : 0; k = k * k;
          for (var q2 = 0; q2 < ripples.length; q2++) {
            var rp = ripples[q2], age = (now - rp.t) / 1000, rr = age * 420, ddx = d.x - rp.x, ddy = d.y - rp.y;
            var band = Math.abs(Math.sqrt(ddx * ddx + ddy * ddy) - rr);
            if (band < 46) { var k2 = (1 - band / 46) * Math.max(0, 1 - age / 2.2) * 0.9; if (k2 > k) k = k2; }
          }
          var amb = 0.5 + 0.5 * Math.sin(d.x * 0.011 + d.y * 0.009 + t * 0.8 + d.o);
          var r = 1 + amb * 0.6 + k * 2.8, a = 0.09 + amb * 0.06 + k * 0.85;
          var m = Math.min(1, k * 1.6);
          var cr = Math.round(17 + (120 - 17) * m), cg = Math.round(18 + (190 - 18) * m), cb = Math.round(4 + (30 - 4) * m);
          ctx.beginPath(); ctx.arc(d.x, d.y - k * 10, r, 0, 6.283);
          ctx.fillStyle = "rgba(" + cr + "," + cg + "," + cb + "," + a.toFixed(3) + ")"; ctx.fill();
        }
        if (!holdMotion() && !scrolling) raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && visible && !holdMotion() && !scrolling) raf = requestAnimationFrame(frame); }
      canvasResumes.push(function () { if (holdMotion() || scrolling) { if (raf) { cancelAnimationFrame(raf); raf = 0; } return; } start(); });
      var io = new IntersectionObserver(function (en) {
        visible = en.some(function (x) { return x.isIntersecting; });
        if (visible && !holdMotion()) { if (!W) size(); start(); }
      }, { threshold: 0.05 });
      io.observe(hero);
      window.addEventListener("resize", function () { if (visible) size(); });
      if (fine) {
        hero.addEventListener("pointermove", function (e) {
          var r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
          hero.classList.add("pointer");
          if (glow) { glow.style.setProperty("--gx", mx.toFixed(0) + "px"); glow.style.setProperty("--gy", my.toFixed(0) + "px"); }
        });
        hero.addEventListener("pointerleave", function () { mx = my = -9999; hero.classList.remove("pointer"); });
      }
      hero.addEventListener("pointerdown", function (e) {
        if (e.target.closest("a, button, input, label, [role=tab], .rotator")) return;
        var r = hero.getBoundingClientRect();
        ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }); start();
      });
    });
  }


  /* ---------------- Custom cursor ---------------- */
  function setupCursor() {
    if (reduce || isSmall() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var dot = document.createElement("div"); dot.className = "cur";
    var ring = document.createElement("div"); ring.className = "cur-ring";
    var label = document.createElement("span"); label.className = "cur-label"; ring.appendChild(label);
    document.body.appendChild(dot); document.body.appendChild(ring);
    root.classList.add("has-cursor");
    var x = -100, y = -100, rx = -100, ry = -100, raf = 0;
    function loop() {
      raf = 0; rx += (x - rx) * 0.34; ry += (y - ry) * 0.34;
      dot.style.transform = "translate(" + x + "px," + y + "px)";
      ring.style.transform = "translate(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px)";
      if (Math.abs(x - rx) > 0.2 || Math.abs(y - ry) > 0.2) raf = requestAnimationFrame(loop);
    }
    document.addEventListener("pointermove", function (e) {
      x = e.clientX; y = e.clientY; root.classList.add("cur-on");
      var t = e.target;
      var hot = t.closest ? t.closest("a, button, [role=tab], summary, label.sw, input[type=range], [data-cursor]") : null;
      var lab = "";
      if (hot) { var lh = hot.closest("[data-cursor]"); if (lh) lab = lh.getAttribute("data-cursor") || ""; }
      ring.classList.toggle("on", !!hot);
      ring.classList.toggle("lbl", !!lab);
      if (label.textContent !== lab) label.textContent = lab;
      var dark = t.closest ? t.closest(".on-night, .machine, .call, .board, .btn-dark, .li-msg.out, .bubble.out, .t-agent, .mini-bub.out, .monogram") : null;
      ring.classList.toggle("dark", !!dark); dot.classList.toggle("dark", !!dark);
      if (!raf) raf = requestAnimationFrame(loop);
    });
    document.addEventListener("pointerdown", function () { ring.classList.add("down"); });
    document.addEventListener("pointerup", function () { ring.classList.remove("down"); });
    document.documentElement.addEventListener("mouseleave", function () { root.classList.remove("cur-on"); });
    document.documentElement.addEventListener("mouseenter", function () { root.classList.add("cur-on"); });
  }

  /* ---------------- Cursor light on dark surfaces, shine on lime ---------------- */
  function setupLights(scope) {
    if (holdMotion() || !window.matchMedia("(hover: hover)").matches) return;
    scope.querySelectorAll(".on-night, .machine, .call, .board, .cta-card, .plan-main, .li-card, .report").forEach(function (el) {
      if (el.hasAttribute("data-light")) return;
      el.setAttribute("data-light", "");
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--sx", (e.clientX - r.left).toFixed(0) + "px");
        el.style.setProperty("--sy", (e.clientY - r.top).toFixed(0) + "px");
        el.classList.add("lit-on");
      });
      el.addEventListener("pointerleave", function () { el.classList.remove("lit-on"); });
    });
    scope.querySelectorAll(".site-footer:not([data-fw])").forEach(function (f) {
      f.setAttribute("data-fw", "");
      var w = f.querySelector(".foot-word"); if (!w) return;
      f.addEventListener("pointermove", function (e) {
        var r = w.getBoundingClientRect();
        w.style.setProperty("--fx", (e.clientX - r.left).toFixed(0) + "px");
        w.style.setProperty("--fy", (e.clientY - r.top).toFixed(0) + "px");
      });
      f.addEventListener("pointerleave", function () { w.style.setProperty("--fx", "-999px"); w.style.setProperty("--fy", "-999px"); });
    });
    scope.querySelectorAll(".stack:not([data-tilt3])").forEach(function (st) {
      st.setAttribute("data-tilt3", "");
      var pend = 0, px = 0, py = 0;
      st.addEventListener("pointermove", function (e) {
        var r = st.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5;
        if (pend) return;
        pend = requestAnimationFrame(function () { pend = 0; st.classList.add("tilting"); st.style.transform = "rotateY(" + (px * 10).toFixed(2) + "deg) rotateX(" + (-py * 8).toFixed(2) + "deg)"; });
      });
      st.addEventListener("pointerleave", function () { st.classList.remove("tilting"); st.style.transform = ""; });
    });
  }

  /* ---------------- Marquee that reacts to scrolling ---------------- */
  function setupMarquee(scope) {
    scope.querySelectorAll(".marquee-track:not([data-on])").forEach(function (track) {
      track.setAttribute("data-on", "");
      if (!motion) return;
      var x = 0, half = 0, lastY = window.scrollY || 0, vel = 0, visible = false, paused = false, raf = 0;
      function measure() { half = track.scrollWidth / 2; }
      measure(); window.addEventListener("resize", measure);
      var wrap = track.closest(".marquee");
      if (wrap) { wrap.addEventListener("pointerenter", function () { paused = true; }); wrap.addEventListener("pointerleave", function () { paused = false; }); }
      function tick() {
        raf = 0;
        if (!visible || holdMotion() || scrolling) { track.style.transform = ""; return; }
        var y = window.scrollY || 0; vel = vel * 0.88 + (y - lastY) * 0.12; lastY = y;
        if (half > 0) {
          var speed = (paused ? 0.15 : 0.8) + Math.max(-7, Math.min(7, vel * 0.3));
          x -= speed; if (x <= -half) x += half; if (x > 0) x -= half;
          track.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
        }
        raf = requestAnimationFrame(tick);
      }
      function start() {
        if (raf || !visible || holdMotion() || scrolling) return;
        track.classList.add("js-marq");
        raf = requestAnimationFrame(tick);
      }
      canvasResumes.push(function () {
        if (holdMotion() || scrolling) { if (raf) { cancelAnimationFrame(raf); raf = 0; } track.classList.remove("js-marq"); track.style.transform = ""; return; }
        start();
      });
      new IntersectionObserver(function (en) { visible = en.some(function (e) { return e.isIntersecting; }); if (visible) start(); }).observe(track);
    });
  }

  /* ---------------- Infrastructure graphic: hover a domain to trace its routes ---------------- */
  function setupInfra(scope) {
    scope.querySelectorAll("[data-infra]:not([data-on])").forEach(function (g) {
      g.setAttribute("data-on", "");
      g.querySelectorAll("[data-node]").forEach(function (n) {
        var id = n.getAttribute("data-node");
        n.addEventListener("pointerenter", function () {
          g.classList.add("tracing");
          g.querySelectorAll("[data-from='" + id + "'], [data-to='" + id + "']").forEach(function (p) { p.classList.add("hot"); });
          n.classList.add("hot");
        });
        n.addEventListener("pointerleave", function () {
          g.classList.remove("tracing");
          g.querySelectorAll(".hot").forEach(function (p) { p.classList.remove("hot"); });
        });
      });
    });
  }

  /* ---------------- Outbound calculator ---------------- */
  function setupCalc(scope) {
    scope.querySelectorAll("[data-calc]:not([data-on])").forEach(function (f) {
      f.setAttribute("data-on", "");
      var outs = {}; f.querySelectorAll("[data-out]").forEach(function (o) { outs[o.getAttribute("data-out")] = o; });
      var grid = f.querySelector("[data-inbox-grid]");
      var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };
      function v(n) { var el = f.querySelector("[name=" + n + "]"); return el ? parseFloat(el.value) : 0; }
      function upd() {
        f.querySelectorAll("input[type=range]").forEach(function (r) {
          var lab = f.querySelector("[data-val=" + r.name + "]"); if (!lab) return;
          var val = parseFloat(r.value), unit = r.getAttribute("data-unit") || "";
          lab.textContent = (unit === "%" ? val + "%" : fmt(val) + (unit ? " " + unit : ""));
          r.style.setProperty("--p", ((val - r.min) / (r.max - r.min) * 100).toFixed(1) + "%");
        });
        var P = v("prospects"), T = v("touches"), D = v("days"), E = v("perinbox"), I = v("perdomain"), R = v("reply") / 100, PS = v("positive") / 100, M = v("meet") / 100;
        var emails = P * T, perDay = emails / D, inboxes = Math.max(1, Math.ceil(perDay / E)), domains = Math.max(1, Math.ceil(inboxes / I));
        var replies = emails * R, positive = replies * PS, meetings = positive * M;
        var cost = inboxes * 3 + domains * 1.2;
        var set = function (k, val) { if (outs[k]) outs[k].textContent = val; };
        set("emails", fmt(emails)); set("perday", fmt(perDay)); set("inboxes", fmt(inboxes)); set("domains", fmt(domains));
        set("replies", fmt(replies)); set("positive", fmt(positive)); set("meetings", fmt(meetings));
        set("per1000", (meetings / Math.max(1, emails) * 1000).toFixed(1)); set("cost", "$" + fmt(cost));
        set("prospects-echo", fmt(P));
        if (grid) {
          var html = "", shown = Math.min(domains, 40), per = Math.min(I, 4);
          for (var d = 0; d < shown; d++) { html += '<span class="dom">'; for (var k = 0; k < per; k++) html += "<i></i>"; html += "</span>"; }
          if (domains > 40) html += '<span class="dom-more">+' + fmt(domains - 40) + " more</span>";
          grid.innerHTML = html;
        }
      }
      f.addEventListener("input", upd); upd();
    });
  }


  /* ---------------- Journey: the stream from a list to a meeting ---------------- */
  function setupJourney(scope) {
    scope.querySelectorAll("[data-journey]:not([data-on])").forEach(function (j) {
      j.setAttribute("data-on", "");
      var nodes = Array.prototype.slice.call(j.querySelectorAll(".jn"));
      nodes.forEach(function (n) {
        var b = n.querySelector(".jn-dot");
        b.addEventListener("click", function () {
          var open = !n.classList.contains("open");
          nodes.forEach(function (x) { x.classList.remove("open"); x.querySelector(".jn-dot").setAttribute("aria-expanded", "false"); });
          n.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open));
        });
      });
      document.addEventListener("click", function (e) { if (!e.target.closest(".jn")) nodes.forEach(function (x) { x.classList.remove("open"); }); });
      var cv = j.querySelector("[data-jcanvas]"), ref = j.querySelector("[data-jpath]");
      if (!cv || !ref || !motion) return;
      var ctx = cv.getContext("2d"); if (!ctx) return;
      var pts = [], W = 0, H = 0, len = 0, parts = [], visible = false, raf = 0, last = 0, acc = 0, mx = -9999, my = -9999, pulses = [];
      var stageT = [];
      function size() {
        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var r = j.getBoundingClientRect(); W = r.width; H = r.height;
        if (!W || !H) return;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        len = ref.getTotalLength(); pts = [];
        var N = 600, sx = W / 1200, sy = H / 360;
        for (var i = 0; i <= N; i++) { var p = ref.getPointAtLength(len * i / N); pts.push([p.x * sx, p.y * sy]); }
        stageT = nodes.map(function (n) {
          var r2 = n.querySelector(".jn-dot").getBoundingClientRect(), cx = r2.left + r2.width / 2 - r.left, cy = r2.top + r2.height / 2 - r.top, best = 0, bd = 1e9;
          for (var k = 0; k < pts.length; k++) { var dx = pts[k][0] - cx, dy = pts[k][1] - cy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
          return best / N;
        });
      }
      function at(t) { var i = Math.min(pts.length - 1, Math.max(0, Math.round(t * (pts.length - 1)))); return pts[i]; }
      function spawn() {
        parts.push({ t: 0, v: 0.075 + Math.random() * 0.04, r: 1.3 + Math.random() * 1.1, a: 0.55 + Math.random() * 0.35, lime: false, star: false, dead: 0, wob: Math.random() * 6.28, off: (Math.random() - 0.5) * 14 });
      }
      function frame(now) {
        raf = 0;
        if (!visible || holdMotion() || scrolling) return;
        var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
        acc += dt * 26; while (acc > 1) { spawn(); acc -= 1; }
        ctx.clearRect(0, 0, W, H);
        // cursor glow on the line
        if (mx > -9000 && pts.length) {
          var bi = 0, bd = 1e9;
          for (var k = 0; k < pts.length; k += 3) { var dx = pts[k][0] - mx, dy = pts[k][1] - my, d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = k; } }
          if (bd < 140 * 140) {
            var g = ctx.createRadialGradient(pts[bi][0], pts[bi][1], 0, pts[bi][0], pts[bi][1], 90);
            g.addColorStop(0, "rgba(199,251,109," + (0.55 * (1 - Math.sqrt(bd) / 140)).toFixed(3) + ")"); g.addColorStop(1, "rgba(199,251,109,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pts[bi][0], pts[bi][1], 90, 0, 6.283); ctx.fill();
          }
        }
        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          if (p.dead) { p.dead += dt; if (p.dead > 0.5) { parts.splice(i, 1); continue; } }
          else {
            var pos0 = at(p.t), ddx = pos0[0] - mx, ddy = pos0[1] - my, dist = Math.sqrt(ddx * ddx + ddy * ddy);
            var boost = dist < 160 ? (1 - dist / 160) : 0;
            var prev = p.t; p.t += p.v * dt * (1 + boost * 1.6);
            // attrition at stages
            if (stageT.length) {
              if (prev < stageT[1] && p.t >= stageT[1] && Math.random() < 0.06) { p.dead = 0.001; }
              if (prev < stageT[2] && p.t >= stageT[2]) { p.lime = true; }
              if (prev < stageT[3] && p.t >= stageT[3]) { if (Math.random() < 0.965) { p.dead = 0.001; } else { p.star = true; p.r = 3.4; } }
              if (prev < stageT[4] && p.t >= stageT[4] && Math.random() < 0.5) { p.dead = 0.001; }
            }
            if (p.t >= 1) { parts.splice(i, 1); pulses.push({ t: 0 }); continue; }
          }
          var pos = at(Math.min(1, p.t));
          var wob = Math.sin(p.t * 40 + p.wob) * (p.star ? 0 : 3) + p.off * (p.star ? 0 : 1);
          var x = pos[0], y = pos[1] + wob;
          var alpha = p.dead ? p.a * (1 - p.dead / 0.5) : p.a;
          if (p.star) {
            ctx.beginPath(); ctx.arc(x, y, p.r * 2.6, 0, 6.283); ctx.fillStyle = "rgba(199,251,109," + (alpha * 0.25).toFixed(3) + ")"; ctx.fill();
            var tr = at(Math.max(0, p.t - 0.05));
            ctx.beginPath(); ctx.moveTo(tr[0], tr[1]); ctx.lineTo(x, y); ctx.strokeStyle = "rgba(166,226,58," + (alpha * 0.5).toFixed(3) + ")"; ctx.lineWidth = 2; ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283);
          ctx.fillStyle = p.star ? "rgba(63,107,0," + alpha.toFixed(3) + ")" : (p.lime ? "rgba(120,190,30," + alpha.toFixed(3) + ")" : "rgba(17,18,4," + (alpha * 0.55).toFixed(3) + ")");
          ctx.fill();
        }
        // arrival pulses at the last node
        var end = at(1);
        for (var q = pulses.length - 1; q >= 0; q--) {
          var pu = pulses[q]; pu.t += dt; if (pu.t > 1.2) { pulses.splice(q, 1); continue; }
          ctx.beginPath(); ctx.arc(end[0], end[1], 30 + pu.t * 70, 0, 6.283); ctx.strokeStyle = "rgba(166,226,58," + ((1 - pu.t / 1.2) * 0.7).toFixed(3) + ")"; ctx.lineWidth = 2; ctx.stroke();
        }
        if (!holdMotion() && !scrolling) raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && visible && !holdMotion() && !scrolling) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      canvasResumes.push(function () { if (holdMotion() || scrolling) { if (raf) { cancelAnimationFrame(raf); raf = 0; } return; } start(); });
      new IntersectionObserver(function (en) { visible = en.some(function (x) { return x.isIntersecting; }); if (visible) { if (!pts.length && !holdMotion()) size(); start(); } }, { threshold: 0.05 }).observe(j);
      window.addEventListener("resize", function () { if (visible) size(); });
      j.addEventListener("pointermove", function (e) { var r = j.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
      j.addEventListener("pointerleave", function () { mx = my = -9999; });
      // pre-fill the stream so it's alive on first paint
      if (!holdMotion()) { for (var w = 0; w < 160; w++) { spawn(); parts[parts.length - 1].t = Math.random() * 0.55; if (parts[parts.length - 1].t > 0.25) parts[parts.length - 1].lime = true; } }
    });
  }

  /* ---------------- The system: a wireframe view of the machine ---------------- */
  function setupSystem(scope) {
    scope.querySelectorAll("[data-system]:not([data-on])").forEach(function (sys) {
      sys.setAttribute("data-on", "");
      var stage = sys.querySelector("[data-sys-stage]"), cv = sys.querySelector("canvas[data-sys-canvas]");
      if (!stage || !cv) return;
      var ctx = cv.getContext("2d"); if (!ctx) return;
      var hero = sys.closest(".hero") || sys;
      var top = hero.querySelector(".hero-sys-top");
      var labels = Array.prototype.slice.call(sys.querySelectorAll(".sm[data-sm]"));
      var termIn = sys.querySelector('[data-term="in"]'), termOut = sys.querySelector('[data-term="out"]');
      var logList = sys.querySelector("[data-sys-lines]"), hudCam = sys.querySelector("[data-hud-cam]"), hudCur = sys.querySelector("[data-hud-cur]"), hudState = sys.querySelector("[data-hud-state]"), hudHint = sys.querySelector("[data-hud-hint]");
      var toolsEl = sys.querySelector("[data-sys-tools]"), exploreBtn = sys.querySelector("[data-sys-explore]"), zoomInBtn = sys.querySelector("[data-sys-zoom-in]"), zoomOutBtn = sys.querySelector("[data-sys-zoom-out]"), backBtn = sys.querySelector("[data-sys-back]"), resetBtn = sys.querySelector("[data-sys-reset]");
      var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      var INK = "17,18,4", LIME = "199,251,109", LIME3 = "166,226,58", SIG = "63,107,0";
      var HW = 85, HH = 60, HD = 60, TWO = Math.PI * 2;
      var W = 0, H = 0, f = 900, cx = 0, cy = 0, D = 1500, mode = "";
      var yaw = 0, pitch = 0.32, tYaw = 0, tPitch = 0.32, basePitch = 0.32, dolly = 1, tDolly = 1, T = [0, 30, 40], baseT = [0, 30, 40], tT = [0, 30, 40];
      var mx = -1, my = -1, pointerT = -1e9, hover = -1, opened = -1, dragging = false, dragX = 0, dragY = 0, dragYaw = 0, dragPitch = 0, dragMoved = 0;
      var explore = false, inside = -1, pinchD = 0, pointers = {}, quality = (window.matchMedia("(max-width: 700px)").matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4) ? 1 : 2, dprCap = 2, frameAcc = 0, frameN = 0, qT = 0, skip = false;
      var SB = {}, SO = [], FB = {}, FO = [], GL = [];
      var t0 = 0, last = 0, raf = 0, visible = false, sceneT = 0, running = false, finished = false, hudT = 0;
      var mods = [], wires = [], packets = [], pulses = [], emitAcc = 0, inP = null, outP = null, logQueue = [], typing = false;
      var yawSign = 1;
      var DEF = [
        { n: 1000, text: function (n) { return fmt(n) + " accounts"; }, log: "01 targeting: 1,000 accounts researched" },
        { n: 940, text: function (n) { return fmt(n) + " valid"; }, log: "02 verification: 940 valid, 60 removed" },
        { n: 6, text: function (n) { return n + " inboxes, 2 domains"; }, log: "03 infrastructure: 2 domains, 6 inboxes, warm" },
        { n: 3760, text: function (n) { return fmt(n) + " touches"; }, log: "04 sequencer: 3,760 touches over 21 days" },
        { n: 96, text: function (n) { return fmt(n) + " replies, 32 positive"; }, log: "05 replies: 96 in, 32 positive" },
        { n: 16, text: function (n) { return n + " meetings"; }, log: "06 calendar: 16 meetings booked" },
        { n: 0, text: function () { return "Yours to close"; }, log: "07 handoff: your calendar" }
      ];
      var SURVIVE = [1, 0.94, 1, 0.34, 0.5, 0.5, 1];
      var KIND = ["lead", "lead", "lead", "lead", "reply", "positive", "meeting", "meeting"];
      function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
      function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
      function frac(v) { return v - Math.floor(v); }
      function ease(u) { return 1 - Math.pow(1 - u, 3); }

      /* ---- layout ---- */
      function build() {
        var prev = mods; mods = []; wires = [];
        var P = [], list = [];
        if (mode === "d") {
          for (var i = 0; i < 7; i++) { var x = (i - 3) * 250; P.push([x, 0, Math.pow(x / 750, 2) * 250]); }
          inP = [-930, 0, 300]; outP = [930, 0, 300];
          list = [[-1, 0, [1, 0], [1, 0]]];
          for (var k = 0; k < 6; k++) list.push([k, k + 1, [1, 0], [1, 0]]);
          list.push([6, 7, [1, 0], [1, 0]]);
          T = [0, 26, 80]; baseT = T.slice(); tT = T.slice();
        } else if (mode === "t") {
          var bx = [-450, -150, 150, 450];
          for (var j = 0; j < 4; j++) P.push([bx[j], 0, 240]);
          P.push([450, 0, -220], [150, 0, -220], [-150, 0, -220]);
          inP = [-660, 0, 240]; outP = [-450, 0, -220];
          list = [[-1, 0, [1, 0], [1, 0]], [0, 1, [1, 0], [1, 0]], [1, 2, [1, 0], [1, 0]], [2, 3, [1, 0], [1, 0]], [3, 4, [0, -1], [0, -1]], [4, 5, [-1, 0], [-1, 0]], [5, 6, [-1, 0], [-1, 0]], [6, 7, [-1, 0], [-1, 0]]];
          T = [0, 26, 30]; baseT = T.slice(); tT = T.slice();
        } else {
          var col = 175, rows = [460, 155, -155, -460];
          P = [[-col, 0, rows[0]], [col, 0, rows[0]], [col, 0, rows[1]], [-col, 0, rows[1]], [-col, 0, rows[2]], [col, 0, rows[2]], [col, 0, rows[3]]];
          inP = [-col, 0, 740]; outP = [-col, 0, rows[3]];
          list = [[-1, 0, [0, -1], [0, -1]], [0, 1, [1, 0], [1, 0]], [1, 2, [0, -1], [0, -1]], [2, 3, [-1, 0], [-1, 0]], [3, 4, [0, -1], [0, -1]], [4, 5, [1, 0], [1, 0]], [5, 6, [0, -1], [0, -1]], [6, 7, [-1, 0], [-1, 0]]];
          T = [0, 20, 90]; baseT = T.slice(); tT = T.slice();
        }
        for (var m = 0; m < 7; m++) {
          var dots = [];
          for (var q = 0; q < 7; q++) dots.push({ a: (q * 2.4 + 0.7) % TWO, r: 16 + ((q * 37) % 40) });
          var pm = prev[m];
          mods.push({ c: P[m], boot: pm ? pm.boot : 0, on: pm ? pm.on : false, hot: 0, count: pm ? pm.count : 0, cT: pm ? pm.cT : -1, dots: dots, bb: null, lab: labels[m] });
        }
        list.forEach(function (w) {
          var A = w[0] < 0 ? { c: inP, term: true } : mods[w[0]], B = w[1] > 6 ? { c: outP, term: true } : mods[w[1]];
          wires.push(route(A, w[2], B, w[3], w[0], w[1]));
        });
      }
      function route(A, e, B, n, from, to) {
        var gap = 30, hA = A.term ? 28 : (e[0] ? HW : HD), hB = B.term ? 28 : (n[0] ? HW : HD);
        var p0 = [A.c[0] + e[0] * hA, A.c[2] + e[1] * hA], p1 = [p0[0] + e[0] * gap, p0[1] + e[1] * gap];
        var p3 = [B.c[0] - n[0] * hB, B.c[2] - n[1] * hB], p2 = [p3[0] - n[0] * gap, p3[1] - n[1] * gap];
        var pts = [p0, p1];
        if (e[0] && n[0]) { var mx0 = (p1[0] + p2[0]) / 2; pts.push([mx0, p1[1]], [mx0, p2[1]]); }
        else if (e[1] && n[1]) { var mz0 = (p1[1] + p2[1]) / 2; pts.push([p1[0], mz0], [p2[0], mz0]); }
        else if (e[0] && n[1]) pts.push([p2[0], p1[1]]);
        else pts.push([p1[0], p2[1]]);
        pts.push(p2, p3);
        var out = [pts[0]];
        for (var i = 1; i < pts.length; i++) { var l = out[out.length - 1]; if (Math.abs(l[0] - pts[i][0]) > 0.5 || Math.abs(l[1] - pts[i][1]) > 0.5) out.push(pts[i]); }
        var cum = [0], len = 0;
        for (var k = 1; k < out.length; k++) { len += Math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1]); cum.push(len); }
        return { pts: out, cum: cum, len: len, from: from, to: to };
      }
      function wireAt(w, s) {
        s = clamp(s, 0, w.len);
        for (var i = 1; i < w.pts.length; i++) {
          if (s <= w.cum[i]) { var u = (s - w.cum[i - 1]) / Math.max(0.001, w.cum[i] - w.cum[i - 1]); var a = w.pts[i - 1], b = w.pts[i]; return [a[0] + (b[0] - a[0]) * u, 6, a[1] + (b[1] - a[1]) * u]; }
        }
        var e = w.pts[w.pts.length - 1]; return [e[0], 6, e[1]];
      }

      /* ---- camera ---- */
      function size() {
        var dpr = Math.min(dprCap, window.devicePixelRatio || 1);
        var r = stage.getBoundingClientRect(); W = r.width; H = r.height;
        if (!W || !H) return;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var nm = W < 700 ? "m" : (W < 1100 ? "t" : "d");
        if (nm !== mode) { mode = nm; build(); packets = []; stage.setAttribute("data-mode", mode); }
        var topH = 0;
        if (top && mode === "d") { var tr = top.getBoundingClientRect(); topH = Math.max(0, tr.bottom - r.top); }
        var avail = mode === "d" ? H - topH - 70 : H - 44;
        if (mode === "d") { f = Math.min(W * 0.86, avail * 3.3); cx = W / 2; cy = topH + avail * 0.64; basePitch = 0.31; D = 1500; }
        else if (mode === "t") { f = Math.min(W * 1.15, avail * 2.05); cx = W / 2; cy = avail * 0.55; basePitch = 0.62; D = 1500; }
        else { f = W * 1.62; cx = W / 2; cy = avail * 0.5; basePitch = 1.08; D = 1500; }
        if (!running) pitch = tPitch = basePitch;
      }
      function proj(x, y, z) {
        var X = x - T[0], Y = y - T[1], Z = z - T[2];
        var c = Math.cos(yaw), s = Math.sin(yaw);
        var x1 = X * c + Z * s, z1 = -X * s + Z * c;
        var cp = Math.cos(pitch), sp = Math.sin(pitch);
        var y2 = Y * cp + z1 * sp, z2 = -Y * sp + z1 * cp;
        var zc = z2 + D * dolly;
        if (zc < 40) return null;
        var k = f / zc;
        return [cx + x1 * k, cy - y2 * k, zc, k];
      }
      function floorAt(sx, sy) {
        var dx = (sx - cx) / f, dy = -(sy - cy) / f;
        var cp = Math.cos(pitch), sp = Math.sin(pitch), c = Math.cos(yaw), s = Math.sin(yaw);
        function inv(v) { var Y = v[1] * cp - v[2] * sp, z1 = v[1] * sp + v[2] * cp; return [v[0] * c - z1 * s, Y, v[0] * s + z1 * c]; }
        var a = inv([dx, dy, 1]), b = inv([0, 0, -D * dolly]);
        b = [b[0] + T[0], b[1] + T[1], b[2] + T[2]];
        if (Math.abs(a[1]) < 1e-6) return null;
        var t = -b[1] / a[1]; if (t < 0) return null;
        return [t * a[0] + b[0], 0, t * a[2] + b[2]];
      }
      function fade(zc) { return clamp(1.35 - (zc - D * 0.55) / (D * 1.25), 0.3, 1); }

      /* ---- drawing helpers: everything is batched by style and flushed once per frame ---- */
      function rgba(rgb, a) { return "rgba(" + rgb + "," + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ")"; }
      function sbucket(rgb, alpha, width, dash) {
        var a = Math.round(clamp(alpha, 0, 1) * 25) / 25, key = rgb + "|" + a + "|" + width + "|" + (dash ? dash.join(",") : "");
        var b = SB[key]; if (!b) { b = SB[key] = { rgb: rgb, a: a, w: width, dash: dash, paths: [] }; SO.push(key); }
        return b;
      }
      function fbucket(rgb, alpha) {
        var a = Math.round(clamp(alpha, 0, 1) * 25) / 25, key = rgb + "|" + a;
        var b = FB[key]; if (!b) { b = FB[key] = { rgb: rgb, a: a, arcs: [], polys: [] }; FO.push(key); }
        return b;
      }
      function seg(ax, ay, az, bx, by, bz, rgb, alpha, width, q, dash) {
        var a = proj(ax, ay, az), b = proj(bx, by, bz); if (!a || !b) return;
        if (q !== undefined && q < 1) { if (q <= 0) return; b = [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, b[2]]; }
        sbucket(rgb, alpha * fade((a[2] + b[2]) / 2), width || 1, dash).paths.push([a[0], a[1], b[0], b[1]]);
      }
      function poly(pts, rgb, alpha, width, close, dash) {
        var arr = [], zc = 0, n = 0;
        for (var i = 0; i < pts.length; i++) { var p = proj(pts[i][0], pts[i][1], pts[i][2]); if (!p) return; arr.push(p[0], p[1]); zc += p[2]; n++; }
        if (close) arr.closed = true;
        sbucket(rgb, alpha * fade(zc / n), width || 1, dash).paths.push(arr);
      }
      function quad(pts, rgb, alpha) {
        var arr = [];
        for (var i = 0; i < pts.length; i++) { var p = proj(pts[i][0], pts[i][1], pts[i][2]); if (!p) return; arr.push(p[0], p[1]); }
        fbucket(rgb, alpha).polys.push(arr);
      }
      function circleXZ(x, y, z, r, rgb, alpha, width, n, dash) {
        var pts = []; n = n || 28;
        for (var i = 0; i < n; i++) { var a = i / n * TWO; pts.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]); }
        poly(pts, rgb, alpha, width, true, dash);
      }
      function dot(x, y, z, r, rgb, alpha, glow) {
        var p = proj(x, y, z); if (!p) return;
        var k = p[3] * (D / f) * 1.2, rr = r * clamp(k, 0.5, 1.6), a = alpha * fade(p[2]);
        if (glow && quality > 1) GL.push([p[0], p[1], rr * glow, a * 0.5]);
        fbucket(rgb, a).arcs.push(p[0], p[1], rr);
      }
      var glowSprite = null;
      function flush() {
        var i, j, b, pth;
        for (i = 0; i < SO.length; i++) {
          b = SB[SO[i]]; ctx.strokeStyle = rgba(b.rgb, b.a); ctx.lineWidth = b.w; if (b.dash) ctx.setLineDash(b.dash);
          ctx.beginPath();
          for (j = 0; j < b.paths.length; j++) {
            pth = b.paths[j]; ctx.moveTo(pth[0], pth[1]);
            for (var q = 2; q < pth.length; q += 2) ctx.lineTo(pth[q], pth[q + 1]);
            if (pth.closed) ctx.closePath();
          }
          ctx.stroke(); if (b.dash) ctx.setLineDash([]);
        }
        if (GL.length) {
          if (!glowSprite) { glowSprite = document.createElement("canvas"); glowSprite.width = glowSprite.height = 64; var g = glowSprite.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(199,251,109,1)"); gr.addColorStop(1, "rgba(199,251,109,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
          for (i = 0; i < GL.length; i++) { var gl = GL[i]; ctx.globalAlpha = clamp(gl[3], 0, 1); ctx.drawImage(glowSprite, gl[0] - gl[2], gl[1] - gl[2], gl[2] * 2, gl[2] * 2); }
          ctx.globalAlpha = 1;
        }
        for (i = 0; i < FO.length; i++) {
          b = FB[FO[i]]; ctx.fillStyle = rgba(b.rgb, b.a); ctx.beginPath();
          for (j = 0; j < b.polys.length; j++) { pth = b.polys[j]; ctx.moveTo(pth[0], pth[1]); for (var q2 = 2; q2 < pth.length; q2 += 2) ctx.lineTo(pth[q2], pth[q2 + 1]); ctx.closePath(); }
          for (j = 0; j < b.arcs.length; j += 3) { ctx.moveTo(b.arcs[j] + b.arcs[j + 2], b.arcs[j + 1]); ctx.arc(b.arcs[j], b.arcs[j + 1], b.arcs[j + 2], 0, TWO); }
          ctx.fill();
        }
        SB = {}; SO = []; FB = {}; FO = []; GL = [];
      }
      function box(x, y0, z, hw, hh, hd, rgb, alpha, width, p) {
        p = p === undefined ? 1 : p;
        var y1 = y0 + hh * 2, x0 = x - hw, x1 = x + hw, z0 = z - hd, z1 = z + hd;
        var pb = clamp(p / 0.4, 0, 1), pv = clamp((p - 0.4) / 0.3, 0, 1), pt = clamp((p - 0.7) / 0.3, 0, 1);
        var B = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], Tp = [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
        for (var i = 0; i < 4; i++) {
          var a = B[i], b = B[(i + 1) % 4]; seg(a[0], a[1], a[2], b[0], b[1], b[2], rgb, alpha, width, pb);
          if (pv > 0) seg(B[i][0], B[i][1], B[i][2], Tp[i][0], Tp[i][1], Tp[i][2], rgb, alpha, width, pv);
          if (pt > 0) { var c = Tp[i], d = Tp[(i + 1) % 4]; seg(c[0], c[1], c[2], d[0], d[1], d[2], rgb, alpha, width, pt); }
        }
      }

      /* ---- glyphs (stateless in t) ---- */
      function gTarget(m, t, a) {
        var c = m.c, y = 3;
        for (var r = 1; r <= 3; r++) circleXZ(c[0], y, c[2], r * 19, INK, 0.45 * a, 1);
        seg(c[0] - 62, y, c[2], c[0] + 62, y, c[2], INK, 0.22 * a); seg(c[0], y, c[2] - 62, c[0], y, c[2] + 62, INK, 0.22 * a);
        var an = t * 1.3;
        for (var k = 6; k >= 1; k--) { var a2 = an - k * 0.1; seg(c[0], y, c[2], c[0] + Math.cos(a2) * 57, y, c[2] + Math.sin(a2) * 57, LIME, (0.34 - k * 0.05) * a, 1); }
        seg(c[0], y, c[2], c[0] + Math.cos(an) * 57, y, c[2] + Math.sin(an) * 57, LIME3, 0.95 * a, 1.5);
        for (var q = 0; q < m.dots.length; q++) {
          var d = m.dots[q], da = ((an - d.a) % TWO + TWO) % TWO, lit = da < 1.8 ? 1 - da / 1.8 : 0;
          dot(c[0] + Math.cos(d.a) * d.r, y + 1, c[2] + Math.sin(d.a) * d.r, 1.5 + lit * 1.4, lit > 0.05 ? LIME3 : INK, (0.45 + lit * 0.55) * a);
        }
        seg(c[0], y, c[2], c[0], 100, c[2], INK, 0.3 * a); dot(c[0], 100, c[2], 2, LIME3, a, 3);
      }
      function gVerify(m, t, a) {
        var c = m.c, yt = 100, yb = 42, rt = 52, rb = 12;
        circleXZ(c[0], yt, c[2], rt, INK, 0.5 * a); circleXZ(c[0], yb, c[2], rb, INK, 0.5 * a);
        for (var k = 0; k < 8; k++) { var an = k * Math.PI / 4; seg(c[0] + Math.cos(an) * rt, yt, c[2] + Math.sin(an) * rt, c[0] + Math.cos(an) * rb, yb, c[2] + Math.sin(an) * rb, INK, 0.32 * a); }
        seg(c[0] + rb, yb, c[2], c[0] + rb, 4, c[2], INK, 0.3 * a); seg(c[0] - rb, yb, c[2], c[0] - rb, 4, c[2], INK, 0.3 * a);
        circleXZ(c[0], 3, c[2], 16, INK, 0.3 * a);
        for (var q = 0; q < 12; q++) {
          var u = frac(t * 0.42 + q / 12), bad = (q % 12) === 5, px, py, pz;
          if (u < 0.5) { var v = u * 2; py = 118 - v * (118 - yb); var rr = rb + (rt - rb) * ((py - yb) / (yt - yb)); if (py > yt) rr = rt; var ang = q * 2.1; var rad = rr * 0.55; px = c[0] + Math.cos(ang) * rad; pz = c[2] + Math.sin(ang) * rad; }
          else { var v2 = (u - 0.5) * 2; py = yb - v2 * (yb - 4); px = c[0] + Math.cos(q * 2.1) * 5; pz = c[2] + Math.sin(q * 2.1) * 5; }
          if (bad && u > 0.32) { var w = clamp((u - 0.32) / 0.3, 0, 1); px = c[0] + rt * 0.6 + w * 60; py = Math.max(4, (yt - (yt - yb) * 0.36) - w * 70); pz = c[2] + 10; dot(px, py, pz, 1.8, INK, (1 - w) * 0.6 * a); continue; }
          dot(px, py, pz, 1.7, u > 0.5 ? LIME3 : INK, (u > 0.5 ? 0.9 : 0.55) * a);
        }
      }
      function gInfra(m, t, a) {
        var c = m.c;
        for (var d = 0; d < 2; d++) for (var i = 0; i < 3; i++) {
          var x = c[0] + (d ? 36 : -36), y0 = 6 + i * 24, z = c[2];
          box(x, y0, z, 24, 8, 22, INK, 0.55 * a, 1);
          var fill = clamp((a - 0.2) / 0.8 + Math.sin(t * 0.6 + i + d) * 0.02, 0, 1) * (i === 2 && d === 1 ? 0.82 : 1);
          seg(x - 18, y0 + 8, z + 22.5, x - 18 + 36 * fill, y0 + 8, z + 22.5, LIME3, 0.95 * a, 2.2);
          var blink = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7 + d * 2.3);
          dot(x + 21, y0 + 8, z + 23, 1.3, LIME3, blink * a);
        }
        seg(c[0] - 36, 3, c[2] - 40, c[0] - 36, 3, c[2] + 40, INK, 0.25 * a); seg(c[0] + 36, 3, c[2] - 40, c[0] + 36, 3, c[2] + 40, INK, 0.25 * a);
        seg(c[0] - 60, 3, c[2] + 40, c[0] + 60, 3, c[2] + 40, INK, 0.25 * a);
        var sh = 82;
        seg(c[0] - 36, sh, c[2], c[0] + 36, sh, c[2], INK, 0.35 * a); seg(c[0], sh, c[2], c[0], sh + 22, c[2], INK, 0.35 * a);
        circleXZ(c[0], sh + 22, c[2], 5 + 2 * Math.sin(t * 2), LIME3, 0.6 * a, 1, 16); dot(c[0], sh + 22, c[2], 1.8, LIME3, a, 3);
      }
      function envelope(x, y, z, w, h, rgb, al) {
        poly([[x - w, y, z], [x + w, y, z], [x + w, y + h, z], [x - w, y + h, z]], rgb, al, 1, true);
        poly([[x - w, y + h, z], [x, y + h * 0.45, z], [x + w, y + h, z]], rgb, al, 1, false);
      }
      function gSequence(m, t, a) {
        var c = m.c, y = 54, z = c[2], ticks = [-48, -16, 16, 48], u = frac(t / 4.6);
        seg(c[0] - 64, y, z, c[0] + 64, y, z, INK, 0.55 * a, 1.2);
        seg(c[0] - 64, y, z, c[0] - 64 + 128 * u, y, z, LIME3, 0.9 * a, 2);
        for (var i = 0; i < 4; i++) {
          var x = c[0] + ticks[i], done = u > (ticks[i] + 64) / 128;
          seg(x, y - 6, z, x, y + 6, z, done ? LIME3 : INK, (done ? 0.95 : 0.5) * a, 1.2);
          if (i === 2) { poly([[x - 6, y + 12, z], [x + 6, y + 12, z], [x + 6, y + 24, z], [x - 6, y + 24, z]], done ? LIME3 : INK, (done ? 0.9 : 0.45) * a, 1, true); dot(x - 2.5, y + 20, z, 0.9, done ? LIME3 : INK, a); seg(x - 2.5, y + 14, z, x - 2.5, y + 18, z, done ? LIME3 : INK, 0.8 * a); seg(x + 1, y + 14, z, x + 1, y + 18.5, z, done ? LIME3 : INK, 0.8 * a); }
          else envelope(x, y + 12, z, 7, 10, done ? LIME3 : INK, (done ? 0.9 : 0.45) * a);
          var tu = (ticks[i] + 64) / 128, ru = u - tu;
          if (ru > 0 && ru < 0.16) { var rv = ru / 0.16; dot(x, y + 30 + rv * 46, z, 2.2 - rv, LIME3, (1 - rv) * a, 2.5); }
        }
        var px = c[0] - 64 + 128 * u;
        seg(px, y - 14, z, px, y + 8, z, LIME3, a, 1.5); poly([[px - 4, y - 20, z], [px + 4, y - 20, z], [px, y - 13, z]], LIME3, a, 1, true);
        seg(c[0] - 64, 22, z, c[0] + 64, 22, z, INK, 0.3 * a); seg(c[0] - 64, 22, z, c[0] - 64 + 128 * (0.35 + u * 0.55), 22, z, INK, 0.6 * a, 2);
        seg(c[0] - 64, 96, z, c[0] - 64, 22, z, INK, 0.16 * a); seg(c[0] + 64, 96, z, c[0] + 64, 22, z, INK, 0.16 * a);
      }
      function gReplies(m, t, a) {
        var c = m.c, z = c[2], lanes = [-44, 0, 44];
        for (var l = 0; l < 3; l++) { var lx = c[0] + lanes[l]; poly([[lx - 15, 2, z - 22], [lx + 15, 2, z - 22], [lx + 15, 2, z + 22], [lx - 15, 2, z + 22]], l === 0 ? LIME3 : INK, (l === 0 ? 0.7 : 0.35) * a, 1, true); }
        seg(c[0] - 66, 2, z + 30, c[0] + 66, 2, z + 30, INK, 0.25 * a);
        seg(c[0] - 40, 104, z - 8, c[0] + 40, 104, z - 8, INK, 0.35 * a); seg(c[0], 104, z - 8, c[0], 112, z - 8, INK, 0.35 * a);
        for (var q = 0; q < 9; q++) {
          var u = frac(t * 0.3 + q / 9), lane = q % 3 === 0 ? 0 : (q % 3 === 1 ? 2 : 1), lx2 = c[0] + lanes[lane];
          var y, x = lx2, zz = z;
          if (u < 0.45) { var v = ease(u / 0.45); y = 100 - v * 88; x = c[0] + (lx2 - c[0]) * v; zz = z - 8 + 8 * v; }
          else y = 12;
          var al = (u > 0.9 ? (1 - u) / 0.1 : 1) * a, rgb = lane === 0 ? LIME3 : INK;
          var st = u >= 0.45 ? Math.floor((q / 3)) * 5 : 0;
          poly([[x - 8, y + st, zz], [x + 8, y + st, zz], [x + 8, y + 22 + st, zz], [x - 8, y + 22 + st, zz]], rgb, (lane === 0 ? 0.95 : 0.5) * al, 1, true);
          seg(x - 5, y + 15 + st, zz, x + 5, y + 15 + st, zz, rgb, 0.5 * al); seg(x - 5, y + 10 + st, zz, x + 3, y + 10 + st, zz, rgb, 0.5 * al);
        }
      }
      function gCalendar(m, t, a) {
        var c = m.c, z = c[2] - 12, x0 = c[0] - 56, y0 = 30, cw = 16, ch = 13;
        poly([[x0, y0, z], [x0 + 112, y0, z], [x0 + 112, y0 + 52, z], [x0, y0 + 52, z]], INK, 0.6 * a, 1.2, true);
        poly([[x0, y0 + 52, z], [x0 + 112, y0 + 52, z], [x0 + 112, y0 + 62, z], [x0, y0 + 62, z]], INK, 0.6 * a, 1, true);
        seg(x0 + 6, y0 + 57, z, x0 + 30, y0 + 57, z, INK, 0.5 * a, 1.5); dot(x0 + 106, y0 + 57, z, 1.3, LIME3, a);
        for (var i = 1; i < 7; i++) seg(x0 + i * cw, y0, z, x0 + i * cw, y0 + 52, z, INK, 0.28 * a);
        for (var j = 1; j < 4; j++) seg(x0, y0 + j * ch, z, x0 + 112, y0 + j * ch, z, INK, 0.28 * a);
        var order = [9, 3, 16, 22, 6, 12, 25, 1, 18, 10, 20, 4, 15, 27, 8, 23], n = Math.min(16, Math.floor(frac(t / 9.5) * 20));
        for (var k = 0; k < n; k++) { var cell = order[k], col = cell % 7, row = Math.floor(cell / 7); var qx = x0 + col * cw + 2, qy = y0 + row * ch + 2; quad([[qx, qy, z], [qx + cw - 4, qy, z], [qx + cw - 4, qy + ch - 4, z], [qx, qy + ch - 4, z]], LIME3, (k === n - 1 ? 0.6 + 0.4 * frac(t * 2) : 0.85) * a); }
        seg(c[0] - 56, 3, c[2] + 20, c[0] + 56, 3, c[2] + 20, INK, 0.22 * a); seg(c[0] - 56, 3, c[2] + 20, c[0] - 56, 30, c[2] - 12, INK, 0.15 * a); seg(c[0] + 56, 3, c[2] + 20, c[0] + 56, 30, c[2] - 12, INK, 0.15 * a);
      }
      function gHandoff(m, t, a) {
        var c = m.c, z = c[2] - 10, x0 = c[0] - 54, hs = [30, 38, 36, 50, 58, 74, 92], pts = [];
        seg(x0, 26, z, x0 + 108, 26, z, INK, 0.45 * a); seg(x0, 26, z, x0, 104, z, INK, 0.45 * a);
        for (var i = 0; i < hs.length; i++) pts.push([x0 + i * 18, hs[i], z]);
        var n = Math.max(2, Math.ceil(hs.length * clamp(a, 0, 1)));
        poly(pts.slice(0, n), LIME3, 0.95 * a, 1.8, false);
        for (var k = 0; k < n; k++) seg(pts[k][0], 26, z, pts[k][0], pts[k][1], z, INK, 0.16 * a);
        var e = pts[n - 1]; dot(e[0], e[1], e[2], 2.6 + Math.sin(t * 3) * 0.5, LIME3, a, 3);
        seg(c[0] + HW - 10, 3, c[2], c[0] + HW + 24, 3, c[2], LIME3, 0.8 * a, 1.5); poly([[c[0] + HW + 24, 3, c[2] - 6], [c[0] + HW + 34, 3, c[2]], [c[0] + HW + 24, 3, c[2] + 6]], LIME3, 0.8 * a, 1.5, false);
      }
      var GLYPH = [gTarget, gVerify, gInfra, gSequence, gReplies, gCalendar, gHandoff];

      /* ---- scene ---- */
      function drawGrid(t) {
        var step = 80, gx0 = -1600, gx1 = 1600, gz0 = -560, gz1 = 1600, reveal = holdMotion() ? 1 : clamp(sceneT / 1.4, 0, 1);
        var ex = gx0 + (gx1 - gx0) * reveal;
        for (var z = gz0; z <= gz1; z += step) { var a = z > 400 ? 0.085 * (1 - (z - 400) / 1250) : 0.085; seg(gx0, 0, z, ex, 0, z, INK, a, 1); }
        var ez = gz0 + (gz1 - gz0) * reveal;
        for (var x = gx0; x <= gx1; x += step) { seg(x, 0, gz0, x, 0, Math.min(ez, 400), INK, 0.075, 1); if (ez > 400) seg(x, 0, 400, x, 0, Math.min(ez, 900), INK, 0.045, 1); if (ez > 900) seg(x, 0, 900, x, 0, ez, INK, 0.018, 1); }
        seg(gx0, 0, 0, gx1, 0, 0, INK, 0.16 * reveal, 1);
      }
      function drawTerminal(p, isOut, t, a) {
        circleXZ(p[0], 2, p[2], 26, isOut ? LIME3 : INK, 0.6 * a, 1.2); circleXZ(p[0], 2, p[2], 34, INK, 0.2 * a, 1, 40);
        seg(p[0] - 40, 2, p[2], p[0] - 30, 2, p[2], INK, 0.5 * a); seg(p[0] + 30, 2, p[2], p[0] + 40, 2, p[2], INK, 0.5 * a);
        seg(p[0], 2, p[2] - 40, p[0], 2, p[2] - 30, INK, 0.5 * a); seg(p[0], 2, p[2] + 30, p[0], 2, p[2] + 40, INK, 0.5 * a);
        if (isOut) {
          poly([[p[0] - 14, 4, p[2] - 12], [p[0] + 14, 4, p[2] - 12], [p[0] + 14, 4, p[2] + 12], [p[0] - 14, 4, p[2] + 12]], LIME3, 0.9 * a, 1.2, true);
          seg(p[0] - 14, 4, p[2] - 4, p[0] + 14, 4, p[2] - 4, LIME3, 0.7 * a); dot(p[0] + 4, 5, p[2] + 4, 1.8, LIME3, a, 3);
        } else {
          for (var i = 0; i < 3; i++) seg(p[0] - 12, 4, p[2] - 8 + i * 8, p[0] + 12, 4, p[2] - 8 + i * 8, INK, 0.7 * a, 1.3);
          dot(p[0] - 16, 4, p[2] - 8, 1.2, LIME3, a); dot(p[0] - 16, 4, p[2], 1.2, LIME3, a); dot(p[0] - 16, 4, p[2] + 8, 1.2, LIME3, a);
        }
      }
      function drawWire(w, t) {
        var pts = [];
        for (var i = 0; i < w.pts.length; i++) pts.push([w.pts[i][0], 6, w.pts[i][1]]);
        var lit = w.from < 0 ? running : (w.from >= 0 && mods[w.from].on);
        poly(pts, INK, lit ? 0.5 : 0.22, 1.1, false);
        for (var k = 0; k < w.pts.length; k++) dot(w.pts[k][0], 6, w.pts[k][1], 1.1, INK, lit ? 0.55 : 0.25);
        if (lit && !holdMotion()) { var s = frac(t * 0.35) * w.len; var p = wireAt(w, s), p2 = wireAt(w, Math.max(0, s - 26)); seg(p2[0], 6, p2[2], p[0], 6, p[2], LIME3, 0.35, 2); }
      }
      function drawModule(m, i, t) {
        var c = m.c, a = holdMotion() ? 1 : m.boot, isHot = hover === i || opened === i;
        var pad = 10;
        poly([[c[0] - HW - pad, 0.5, c[2] - HD - pad], [c[0] + HW + pad, 0.5, c[2] - HD - pad], [c[0] + HW + pad, 0.5, c[2] + HD + pad], [c[0] - HW - pad, 0.5, c[2] + HD + pad]], isHot ? LIME3 : INK, (isHot ? 0.9 : 0.3) * Math.max(0.35, a), 1, true, [4, 6]);
        var rgb = isHot ? LIME3 : INK, al = (m.on ? 0.78 : 0.4) + m.hot * 0.2;
        if (a > 0) {
          if (isHot) box(c[0], 0, c[2], HW + 1.5, HH + 0.8, HD + 1.5, LIME, 0.5, 5, a);
          box(c[0], 0, c[2], HW, HH, HD, rgb, isHot ? 1 : al, isHot ? 1.6 : 1.15, a);
          if (i === 6) seg(c[0] + HW, 0, c[2] + HD, c[0] + HW, 2 * HH, c[2] + HD, LIME3, 0.9 * a, 1.2, 1, [3, 5]);
          for (var k = 0; k < 4; k++) { var fx = k < 2 ? c[0] - HW : c[0] + HW, fz = k % 2 ? c[2] + HD : c[2] - HD; seg(fx, 2 * HH, fz, fx, 2 * HH + 8, fz, rgb, 0.5 * a); }
          GLYPH[i](m, holdMotion() ? 7.6 : t, a);
        }
        var tp = proj(c[0], 2 * HH + (mode === "m" ? 8 : 26), c[2]);
        if (m.lab && tp) {
          var lx = Math.round(tp[0]), ly = Math.round(tp[1]);
          var k = clamp(tp[3] * D / f, 0.8, 1.06).toFixed(3);
          if (m.lx !== lx || m.ly !== ly || m.lk !== k) { m.lx = lx; m.ly = ly; m.lk = k; m.lab.style.transform = "translate(" + lx + "px," + ly + "px) scale(" + k + ")"; }
        }
        var cs = [], minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
        for (var q = 0; q < 8; q++) { var p = proj(c[0] + (q & 1 ? HW : -HW), q & 2 ? 2 * HH : 0, c[2] + (q & 4 ? HD : -HD)); if (!p) continue; if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
        m.bb = [minx, miny, maxx, maxy];
      }
      function drawPackets(t) {
        for (var i = 0; i < packets.length; i++) {
          var p = packets[i], w = wires[p.w], pos = wireAt(w, p.s), k = p.kind;
          if (k === "lead") dot(pos[0], 7, pos[2], 2, INK, 0.6);
          else if (k === "reply") dot(pos[0], 7, pos[2], 2.5, LIME3, 0.95, 2.6);
          else if (k === "positive") { dot(pos[0], 7, pos[2], 2.8, LIME3, 1, 3); }
          else { var b = wireAt(w, p.s - 34); seg(b[0], 7, b[2], pos[0], 7, pos[2], LIME3, 0.55, 2.4); dot(pos[0], 8, pos[2], 3.2, SIG, 1, 3.4); }
        }
        for (var q = pulses.length - 1; q >= 0; q--) { var pu = pulses[q]; if (pu.t > 1.1) { pulses.splice(q, 1); continue; } circleXZ(pu.p[0], 3, pu.p[2], 26 + pu.t * 70, LIME3, (1 - pu.t / 1.1) * 0.8, 1.6, 36); }
      }
      function drawProbe() {
        if (mx < 0 || !fine) return;
        var fp = floorAt(mx, my); if (!fp) return;
        var x = fp[0], z = fp[2];
        circleXZ(x, 1, z, 14, LIME3, 0.8, 1.2, 20); circleXZ(x, 1, z, 40, INK, 0.16, 1, 30);
        seg(x - 24, 1, z, x - 16, 1, z, INK, 0.6); seg(x + 16, 1, z, x + 24, 1, z, INK, 0.6); seg(x, 1, z - 24, x, 1, z - 16, INK, 0.6); seg(x, 1, z + 16, x, 1, z + 24, INK, 0.6);
        return fp;
      }

      /* ---- log ---- */
      function log(text, cls) {
        logQueue.push({ text: text, cls: cls || "" });
        if (!typing) nextLog();
      }
      function nextLog() {
        if (!logList) { logQueue = []; typing = false; return; }
        var item = logQueue.shift(); if (!item) { typing = false; return; }
        typing = true;
        var li = document.createElement("li"); if (item.cls) li.className = item.cls;
        var ts = document.createElement("span"); ts.className = "sys-ts"; var s = Math.max(0, sceneT); ts.textContent = "[" + (s < 10 ? "0" : "") + s.toFixed(1) + "s]";
        var tx = document.createElement("span"); tx.className = "sys-tx"; li.appendChild(ts); li.appendChild(tx); logList.appendChild(li);
        while (logList.children.length > 8) logList.removeChild(logList.firstChild);
        if (holdMotion()) { tx.textContent = item.text; nextLog(); return; }
        var i = 0, iv = setInterval(function () { i += 2; tx.textContent = item.text.slice(0, i); if (i >= item.text.length) { clearInterval(iv); setTimeout(nextLog, 110); } }, 18);
      }
      function setState(s) { if (hudState) hudState.textContent = s; sys.setAttribute("data-state", s); }

      /* ---- state ---- */
      function bootModule(i) {
        var m = mods[i]; if (m.on) return;
        m.on = true; m.cT = 0; if (holdMotion()) { m.boot = 1; m.count = DEF[i].n; }
        m.lab.classList.add("on"); if (!DEF[i].n) m.lab.querySelector("[data-sm-stat]").textContent = DEF[i].text(0);
        log(DEF[i].log);
        if (i === 6 && !finished) { finished = true; setTimeout(function () { log("cycle complete. awaiting your list_", "sys-done"); setState("running"); }, holdMotion() ? 0 : 1400); }
      }
      function update(dt, t) {
        sceneT += dt;
        if (!running && sceneT > 0.3) { running = true; bootModule(0); }
        if (!holdMotion()) {
          var intro = clamp(sceneT / 1.9, 0, 1), ei = ease(intro), kk = Math.min(1, dt * 4.5);
          if (explore) {
            yaw += (tYaw - yaw) * kk; pitch += (tPitch - pitch) * kk; dolly += (tDolly - dolly) * kk;
            T[0] += (tT[0] - T[0]) * kk; T[1] += (tT[1] - T[1]) * kk; T[2] += (tT[2] - T[2]) * kk;
          } else {
            dolly += ((0.6 + 0.4 * ei) - dolly) * (intro < 1 ? 1 : kk);
            var idle = t - pointerT > 2.4 && !dragging;
            var driftY = idle && !isSmall() ? Math.sin(t * 0.22) * 0.05 : 0, driftP = idle && !isSmall() ? Math.sin(t * 0.17) * 0.015 : 0;
            var goalY = (intro < 1 ? -0.28 * (1 - ei) : 0) + tYaw + driftY, goalP = basePitch + (intro < 1 ? 0.3 * (1 - ei) : 0) + (tPitch - basePitch) + driftP;
            yaw += (goalY - yaw) * kk; pitch += (goalP - pitch) * kk;
            T[0] += (baseT[0] - T[0]) * kk; T[1] += (baseT[1] - T[1]) * kk; T[2] += (baseT[2] - T[2]) * kk;
          }
        }
        for (var i = 0; i < mods.length; i++) {
          var m = mods[i];
          if (m.on && m.boot < 1) m.boot = Math.min(1, m.boot + dt / 0.8);
          if (m.hot > 0) m.hot = Math.max(0, m.hot - dt * 2.2);
          if (m.on && m.cT >= 0 && m.cT < 1.6) { m.cT += dt; var u = ease(clamp(m.cT / 1.4, 0, 1)); var n = Math.round(DEF[i].n * u); if (n !== m.count) { m.count = n; m.lab.querySelector("[data-sm-stat]").textContent = DEF[i].text(n); } }
        }
        if (holdMotion() || !running || sceneT < 0.9) return;
        emitAcc += dt * (quality > 1 ? 12 : 7);
        while (emitAcc > 1) { emitAcc -= 1; packets.push({ w: 0, s: 0, v: 300 + Math.random() * 60, kind: "lead" }); }
        for (var k = packets.length - 1; k >= 0; k--) {
          var p = packets[k]; p.s += p.v * dt * (p.kind === "lead" ? 1 : 0.8);
          var w = wires[p.w];
          if (p.s >= w.len) {
            packets.splice(k, 1);
            if (w.to > 6) { pulses.push({ t: 0, p: outP }); termOut.classList.add("on"); continue; }
            var m2 = mods[w.to]; m2.hot = 1; if (!m2.on) bootModule(w.to);
            if (Math.random() < SURVIVE[w.to]) packets.push({ w: p.w + 1, s: 0, v: 280 + Math.random() * 60, kind: KIND[p.w + 1] });
          }
        }
        for (var q = 0; q < pulses.length; q++) pulses[q].t += dt;
        if (packets.length > 400) packets.splice(0, packets.length - 400);
      }
      function render(t) {
        ctx.clearRect(0, 0, W, H);
        SB = {}; SO = []; FB = {}; FO = []; GL = [];
        drawGrid(t);
        var a0 = holdMotion() ? 1 : clamp((sceneT - 0.1) / 0.8, 0, 1);
        drawTerminal(inP, false, t, a0); drawTerminal(outP, true, t, finished || holdMotion() ? 1 : 0.55);
        for (var i = 0; i < wires.length; i++) drawWire(wires[i], t);
        for (var m = 0; m < mods.length; m++) drawModule(mods[m], m, t);
        drawPackets(t);
        var fp = (quality > 0 && !explore) ? drawProbe() : null;
        flush();
        var ti = proj(inP[0], 0, inP[2]), to = proj(outP[0], 0, outP[2]);
        if (ti && termIn) termIn.style.transform = "translate(" + Math.round(ti[0]) + "px," + Math.round(ti[1]) + "px)";
        if (to && termOut) termOut.style.transform = "translate(" + Math.round(to[0]) + "px," + Math.round(to[1]) + "px)";
        if (t - hudT > 0.12) {
          hudT = t;
          if (hudCam) hudCam.textContent = "cam " + (yaw * 57.3).toFixed(1) + "° / " + (pitch * 57.3).toFixed(1) + "°";
          if (hudCur) hudCur.textContent = inside >= 0 ? "inside 0" + (inside + 1) + " " + mods[inside].lab.querySelector(".sm-name").textContent.toLowerCase() : (hover >= 0 ? "inspect 0" + (hover + 1) + " " + mods[hover].lab.querySelector(".sm-name").textContent.toLowerCase() : (fp ? "cursor x " + Math.round(fp[0]) + " z " + Math.round(fp[2]) : (explore ? "zoom " + (1 / dolly).toFixed(2) + "x" : "cursor idle")));
        }
      }
      function frame(now) {
        raf = 0;
        if (!visible || holdMotion() || scrolling) return;
        var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
        var t = (now - t0) / 1000;
        frameAcc += dt; frameN++;
        if (frameN >= 45) { var avg = frameAcc / frameN; frameAcc = 0; frameN = 0; if (avg > 0.034 && quality > 0 && t - qT > 3) { quality--; qT = t; dprCap = quality > 1 ? 2 : (quality === 1 ? 1.25 : 1); size(); } }
        update(dt, t);
        if (quality === 0) { skip = !skip; if (!skip) render(t); } else render(t);
        if (!holdMotion() && !scrolling) raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && visible && !holdMotion() && !scrolling) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      function once() { if (holdMotion() && W) { render(0); } }

      /* ---- interaction ---- */
      function setHover(i) {
        if (hover === i) return;
        if (hover >= 0) mods[hover].lab.classList.remove("is-hot");
        hover = i; if (i >= 0) mods[i].lab.classList.add("is-hot");
        stage.classList.toggle("is-inspect", i >= 0);
        once();
      }
      function hit(x, y) {
        var best = -1, bestA = 1e12;
        for (var i = 0; i < mods.length; i++) { var b = mods[i].bb; if (!b) continue; if (x >= b[0] - 6 && x <= b[2] + 6 && y >= b[1] - 6 && y <= b[3] + 6) { var ar = (b[2] - b[0]) * (b[3] - b[1]); if (ar < bestA) { bestA = ar; best = i; } } }
        return best;
      }
      function setOpen(i) {
        if (opened >= 0) { mods[opened].lab.classList.remove("open"); mods[opened].lab.querySelector(".sm-head").setAttribute("aria-expanded", "false"); }
        opened = i;
        if (i >= 0) { mods[i].lab.classList.add("open"); mods[i].lab.querySelector(".sm-head").setAttribute("aria-expanded", "true"); }
        once();
      }
      labels.forEach(function (lab, i) {
        var b = lab.querySelector(".sm-head");
        b.addEventListener("click", function (e) { e.stopPropagation(); setOpen(opened === i ? -1 : i); });
        lab.addEventListener("pointerenter", function () { if (fine) setHover(i); });
        lab.addEventListener("pointerleave", function () { if (fine && hover === i) setHover(-1); });
      });
      document.addEventListener("click", function (e) { if (opened >= 0 && !e.target.closest(".sm")) setOpen(-1); });
      function setExplore(on) {
        explore = on;
        stage.classList.toggle("is-explore", on); sys.classList.toggle("is-explore", on); hero.classList.toggle("is-explore", on);
        if (exploreBtn) exploreBtn.setAttribute("aria-pressed", String(on));
        if (on) { tYaw = yaw; tPitch = pitch; tDolly = dolly; tT = T.slice(); stage.setAttribute("tabindex", "0"); try { stage.focus({ preventScroll: true }); } catch (err) { stage.focus(); } }
        else { inside = -1; tDolly = 1; tYaw = 0; tPitch = basePitch; tT = baseT.slice(); setOpen(-1); sys.classList.remove("is-inside"); stage.removeAttribute("tabindex"); }
        if (hudHint) hudHint.textContent = on ? "Drag to orbit. Scroll or pinch to zoom. Click a module to step inside." : "Illustrative month, 1,000 accounts";
        start();
      }
      function flyTo(i) {
        inside = i; var c = mods[i].c;
        tT = [c[0], HH * 0.9, c[2]]; tDolly = 0.3; tPitch = 0.42; tYaw = yaw + (Math.abs(((yaw % TWO) + TWO) % TWO) < 0.2 ? 0.45 : 0);
        setOpen(i); sys.classList.add("is-inside");
      }
      function backOut() { inside = -1; tT = baseT.slice(); tDolly = 1; tPitch = basePitch; sys.classList.remove("is-inside"); setOpen(-1); }
      function resetView() { backOut(); tYaw = 0; }
      if (exploreBtn) exploreBtn.addEventListener("click", function () { setExplore(!explore); });
      if (zoomInBtn) zoomInBtn.addEventListener("click", function () { if (!explore) setExplore(true); tDolly = clamp(tDolly * 0.78, 0.26, 1.9); });
      if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () { if (!explore) setExplore(true); tDolly = clamp(tDolly * 1.28, 0.26, 1.9); });
      if (backBtn) backBtn.addEventListener("click", function () { backOut(); });
      if (resetBtn) resetBtn.addEventListener("click", function () { resetView(); });
      hero.addEventListener("pointermove", function (e) {
        var r = stage.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; pointerT = (performance.now() - t0) / 1000;
        if (dragging) {
          if (pointers[e.pointerId]) pointers[e.pointerId] = [e.clientX, e.clientY];
          var ids = Object.keys(pointers);
          if (ids.length >= 2) { var p1 = pointers[ids[0]], p2 = pointers[ids[1]], dd = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]); if (pinchD > 0) tDolly = clamp(tDolly * (pinchD / dd), 0.26, 1.9); pinchD = dd; return; }
          var ddx = e.clientX - dragX, ddy = e.clientY - dragY; dragMoved = Math.max(dragMoved, Math.abs(ddx) + Math.abs(ddy));
          tYaw = dragYaw + ddx * 0.005 * yawSign;
          if (explore) tPitch = clamp(dragPitch - ddy * 0.004, 0.06, 1.3);
          return;
        }
        if (!fine) return;
        if (!explore) {
          var hr = hero.getBoundingClientRect();
          tYaw = ((e.clientX - hr.left) / hr.width - 0.5) * 0.2 * yawSign;
          tPitch = basePitch - ((e.clientY - hr.top) / hr.height - 0.5) * 0.1;
        }
        if (!e.target.closest(".sm")) setHover(hit(mx, my));
      });
      hero.addEventListener("pointerleave", function () { mx = my = -1; if (!dragging && !explore) { tYaw = 0; tPitch = basePitch; } setHover(-1); });
      stage.addEventListener("click", function (e) {
        if (e.target.closest(explore ? "a, button" : ".sm, a, button") || dragMoved > 6) return;
        var r = stage.getBoundingClientRect(), i = hit(e.clientX - r.left, e.clientY - r.top);
        if (i >= 0) { e.stopPropagation(); if (explore) { if (inside === i) backOut(); else flyTo(i); } else setOpen(opened === i ? -1 : i); }
      });
      stage.addEventListener("pointerdown", function (e) {
        if (e.target.closest(explore ? "a, button" : ".sm, a, button")) return;
        if (!explore && fine) return;
        var r = stage.getBoundingClientRect();
        if (!explore && hit(e.clientX - r.left, e.clientY - r.top) >= 0) return;
        pointers[e.pointerId] = [e.clientX, e.clientY]; pinchD = 0;
        dragging = true; dragX = e.clientX; dragY = e.clientY; dragYaw = tYaw; dragPitch = tPitch; dragMoved = 0;
        if (explore) stage.classList.add("is-drag");
      });
      function endDrag(e) { if (e) delete pointers[e.pointerId]; if (!Object.keys(pointers).length) { dragging = false; pinchD = 0; stage.classList.remove("is-drag"); } }
      var touchD = 0;
      stage.addEventListener("touchstart", function (e) { if (explore && e.touches.length === 2) { touchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); dragging = false; pointers = {}; } }, { passive: true });
      stage.addEventListener("touchmove", function (e) {
        if (!explore || e.touches.length !== 2) return;
        e.preventDefault();
        var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (touchD > 0 && d > 0) tDolly = clamp(tDolly * (touchD / d), 0.26, 1.9);
        touchD = d;
      }, { passive: false });
      stage.addEventListener("touchend", function (e) { if (e.touches.length < 2) touchD = 0; }, { passive: true });
      window.addEventListener("pointerup", endDrag); window.addEventListener("pointercancel", endDrag);
      stage.addEventListener("wheel", function (e) { if (!explore) return; e.preventDefault(); tDolly = clamp(tDolly * (1 + clamp(e.deltaY, -60, 60) * 0.0035), 0.26, 1.9); }, { passive: false });
      stage.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { if (inside >= 0) backOut(); else if (opened >= 0) setOpen(-1); return; }
        if (!explore) return;
        if (e.key === "ArrowLeft") tYaw -= 0.15; else if (e.key === "ArrowRight") tYaw += 0.15; else if (e.key === "ArrowUp") tPitch = clamp(tPitch + 0.08, 0.06, 1.3); else if (e.key === "ArrowDown") tPitch = clamp(tPitch - 0.08, 0.06, 1.3);
        else if (e.key === "+" || e.key === "=") tDolly = clamp(tDolly * 0.8, 0.26, 1.9); else if (e.key === "-") tDolly = clamp(tDolly * 1.25, 0.26, 1.9); else return;
        e.preventDefault();
      });

      var io = new IntersectionObserver(function (en) {
        visible = en.some(function (x) { return x.isIntersecting; });
        if (visible) { if (!W) { size(); t0 = performance.now(); setState("booting"); } if (holdMotion()) { runReduced(); } else start(); }
      }, { threshold: 0.02 });
      io.observe(stage);
      canvasResumes.push(function () {
        if (!visible) return;
        if (holdMotion() || scrolling) { if (raf) { cancelAnimationFrame(raf); raf = 0; } return; }
        start();
      });
      window.addEventListener("resize", function () { if (W) { size(); once(); } });
      function runReduced() {
        if (!running) { running = true; sceneT = 2; for (var i = 0; i < 7; i++) { bootModule(i); mods[i].boot = 1; mods[i].count = DEF[i].n; mods[i].lab.querySelector("[data-sm-stat]").textContent = DEF[i].text(DEF[i].n); } termOut.classList.add("on"); }
        render(0);
      }
      log("system online: 7 modules, 1 output", "sys-sys");
    });
  }

  /* ---------------- The map: the whole process from 30,000 feet ---------------- */
  function setupMap(scope) {
    scope.querySelectorAll("[data-map]:not([data-on])").forEach(function (map) {
      map.setAttribute("data-on", "");
      var stage = map.querySelector("[data-map-stage]"), plane = map.querySelector("[data-map-plane]"), cv = map.querySelector("canvas[data-map-canvas]");
      if (!stage || !cv || !("IntersectionObserver" in window)) return;
      var ctx = cv.getContext("2d"); if (!ctx) return;
      map.querySelectorAll(".map-svg").forEach(function (el) { el.parentNode.removeChild(el); });
      stage.classList.add("has-canvas");
      var hero = map.closest(".hero") || map, top = hero.querySelector(".hero-sys-top");
      var chips = {}; map.querySelectorAll(".mc[data-mc]").forEach(function (c) { chips[c.getAttribute("data-mc")] = c; });
      var hubEl = map.querySelector("[data-map-hub]"), tip = map.querySelector("[data-map-tip]"), hud = map.querySelector("[data-map-hud]");
      var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      var INK = "17,18,4", LIME = "199,251,109", LIME3 = "166,226,58", SIG = "63,107,0", INK3 = "107,113,96";
      var TWO = Math.PI * 2;
      var W = 0, H = 0, mode = "", k = 1, hub = [0, 0], R = 96, t0 = 0, last = 0, raf = 0, visible = false, sceneT = 0, hudT = 0;
      var nodes = {}, order = [], edges = [], field = [], traces = [], pulses = [], sweeps = [], gridPat = null, gather = [];
      var main = ctx, baseCv = null, bctx = null, baseDirty = true, glowSprite = null, dpr = 1;
      var quality = (window.matchMedia("(max-width: 700px)").matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4) ? 1 : 2, dprCap = 1.75, frameAcc = 0, frameN = 0, qT = 0, skip = false;
      function markDirty() { baseDirty = true; }
      var mx = -1, my = -1, hover = null, pinned = null, pointerT = -1e9, outAcc = 0, replyQueue = [], lastSweep = 0, tiltX = 0, tiltY = 0;
      var tourEl = map.querySelector("[data-map-tour]"), tourTabs = tourEl ? Array.prototype.slice.call(tourEl.querySelectorAll("[data-tour]")) : [];
      var tourTitle = map.querySelector("[data-tour-title]"), tourText = map.querySelector("[data-tour-text]"), tourBar = map.querySelector("[data-tour-bar]"), tourPlay = map.querySelector("[data-tour-play]");
      var STEP = 2.8, tourStep = -1, tourAuto = true, tourT = 0, focus = null, clusterOn = {}, over = false, zoom = 1;
      var TOUR = [
        { key: "market", title: "Your market", text: "1,000 accounts that match your buyer: title, size, industry, region, signals. Every one researched before it enters the system." },
        { key: "research", title: "Research", text: "List, verify, enrich. Addresses are checked before a single send, and every person gets a line written for them. Bounces stay under 2%." },
        { key: "hub", title: "Be Leaded", text: "Strategy, copy, infrastructure, sending, replies and booking all run from the center. The weekly report comes back to you from here." },
        { key: "infra", title: "Infrastructure", text: "Separate sending domains with SPF, DKIM and DMARC, warmed for two to three weeks and checked against blocklists every morning." },
        { key: "channels", title: "Five channels", text: "Email, LinkedIn, paid ads, SMS and AI voice, timed together. 3,760 touches in a month, sent 8 AM to 5 PM in their time zone." },
        { key: "conv", title: "Conversations", text: "96 replies, each read and answered by a person the same business day. 32 positive. Not-nows go into next quarter's follow-up." },
        { key: "outcomes", title: "Meetings on your calendar", text: "16 qualified meetings, booked with context: who they are, what they said, what they want. You take the meeting and close." },
        { key: null, title: "The whole loop, live", text: "It runs every day, and the numbers come back to the center every week. Look around the map, or step inside the machine below." }
      ];
      function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
      function ease(u) { return 1 - Math.pow(1 - u, 3); }
      function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
      function rgba(rgb, a) { return "rgba(" + rgb + "," + clamp(a, 0, 1).toFixed(3) + ")"; }
      function rnd(a, b) { return a + Math.random() * (b - a); }

      /* ---- definitions ---- */
      var DEFS = [
        { key: "List", cl: "research", lab: "List", note: "Accounts that match your buyer: title, size, industry, region, signals.", at: 0.6 },
        { key: "Verify", cl: "research", lab: "Verify", note: "Every address checked. Catch-alls and unknowns never enter the system.", at: 0.8 },
        { key: "Enrich", cl: "research", lab: "Enrich", note: "Company facts and a personal line for each person, written by a researcher.", at: 1.0 },
        { key: "DNS", cl: "infra", lab: "SPF, DKIM, DMARC", note: "Authentication set up on every sending domain before warmup starts.", at: 1.9 },
        { key: "Domains", cl: "infra", lab: "Domains", note: "Separate sending domains we register for you. Your main domain never sends cold email.", at: 2.05 },
        { key: "Warmup", cl: "infra", lab: "Warmup", note: "Two to three weeks of warmup per inbox before the first real send.", at: 2.05 },
        { key: "Inboxes", cl: "infra", lab: "Inboxes", note: "Two or three inboxes per domain, 25 to 50 emails a day each, checked against blocklists every morning.", at: 2.2 },
        { key: "Email", cl: "channels", lab: "Email", note: "Three plain-text emails per person, sent 8 AM to 5 PM in their time zone.", at: 2.6 },
        { key: "LinkedIn", cl: "channels", lab: "LinkedIn", note: "Connection notes and messages from your team's own profiles, at a human pace.", at: 2.7 },
        { key: "Ads", cl: "channels", lab: "Paid ads", note: "Meta, Google and LinkedIn ads with follow-up built in, for the accounts on the list.", at: 2.8 },
        { key: "SMS", cl: "channels", lab: "SMS", note: "Consent-based texts for follow-up and reactivation.", at: 2.9 },
        { key: "Voice", cl: "channels", lab: "AI voice", note: "Agents that call new leads back within a minute and book the call.", at: 3.0 },
        { key: "Replies", cl: "conv", lab: "Replies", note: "Every reply read and answered by a person the same business day.", at: 4.4 },
        { key: "Later", cl: "conv", lab: "Not now", note: "Not-nows go into a follow-up for next quarter. Nothing is wasted.", at: 4.6 },
        { key: "Meetings", cl: "outcomes", lab: "Meetings", note: "Qualified meetings booked with context: who they are, what they said, what they want.", at: 5.4 },
        { key: "Calendar", cl: "outcomes", lab: "Your calendar", note: "Meetings land on your calendar with reminders. You take the meeting and close.", at: 5.6 }
      ];
      var CLUSTERS = {
        market: { n: 1000, text: function (n) { return fmt(n) + " accounts researched"; }, at: 0.1 },
        research: { n: 940, text: function (n) { return fmt(n) + " verified"; }, at: 0.6 },
        hub: { n: 0, text: function () { return "runs everything inside the ring"; }, at: 1.2 },
        infra: { n: 6, text: function (n) { return n + " inboxes, 2 domains, warm"; }, at: 1.9 },
        channels: { n: 3760, text: function (n) { return fmt(n) + " touches, five channels"; }, at: 2.6 },
        conv: { n: 96, text: function (n) { return fmt(n) + " replies, 32 positive"; }, at: 4.4 },
        outcomes: { n: 16, text: function (n) { return n + " meetings on your calendar"; }, at: 5.4 }
      };
      var EDGE_DEFS = [
        ["List", "Verify", "flow"], ["Verify", "Enrich", "flow"], ["Enrich", "hub", "flow"],
        ["hub", "DNS", "flow"], ["DNS", "Domains", "flow"], ["DNS", "Warmup", "flow"], ["Domains", "Inboxes", "flow"], ["Warmup", "Inboxes", "flow"], ["Inboxes", "Email", "flow"],
        ["hub", "Email", "spoke"], ["hub", "LinkedIn", "spoke"], ["hub", "Ads", "spoke"], ["hub", "SMS", "spoke"], ["hub", "Voice", "spoke"],
        ["Replies", "hub", "flow"], ["Replies", "Later", "flow"], ["Later", "hub", "loop"],
        ["hub", "Meetings", "flow"], ["Meetings", "Calendar", "flow"], ["Calendar", "hub", "loop"]
      ];
      /* offsets from the hub in design px, and label side */
      var LAYOUT = {
        d: {
          Email: [120, -212, "r"], LinkedIn: [206, -124, "r"], Ads: [240, 0, "r"], SMS: [206, 124, "r"], Voice: [120, 212, "r"],
          Replies: [-36, -234, "l"], Later: [-140, -214, "l"],
          List: [-268, 132, "t"], Verify: [-204, 186, "b"], Enrich: [-132, 136, "t"],
          DNS: [-12, 196, "r"], Domains: [-72, 248, "l"], Warmup: [52, 248, "r"], Inboxes: [-12, 300, "b"],
          Meetings: [282, 214, "r"], Calendar: [332, 282, "b"],
          hub: [0.695, 0.48], field: [-560, 236, 216, 76],
          chips: { market: [-560, 362], research: [-200, 62], hub: [0, 132], infra: [-12, 352], channels: [280, -250], conv: [-100, -300], outcomes: [276, 352] }
        },
        t: {
          Email: [120, -212, "r"], LinkedIn: [206, -124, "r"], Ads: [240, 0, "r"], SMS: [206, 124, "r"], Voice: [120, 212, "r"],
          Replies: [-36, -234, "l"], Later: [-140, -214, "l"],
          List: [-268, 132, "t"], Verify: [-204, 186, "b"], Enrich: [-132, 136, "t"],
          DNS: [-12, 196, "r"], Domains: [-72, 248, "l"], Warmup: [52, 248, "r"], Inboxes: [-12, 300, "b"],
          Meetings: [282, 214, "r"], Calendar: [332, 282, "b"],
          hub: [0.63, 0.45], field: [-560, 236, 222, 86],
          chips: { market: [-560, 362], research: [-200, 62], hub: [0, 132], infra: [-30, 352], channels: [280, -250], conv: [-100, -300], outcomes: [300, 352] }
        },
        m: {
          Email: [60, -104, "r"], LinkedIn: [106, -60, "r"], Ads: [122, 0, "r"], SMS: [104, 66, "r"], Voice: [56, 118, "b"],
          Replies: [-40, -108, "l"], Later: [-100, -80, "l"],
          List: [-128, 40, "l"], Verify: [-118, 92, "l"], Enrich: [-72, 76, "b"],
          DNS: [-8, 116, "r"], Domains: [-46, 152, "l"], Warmup: [30, 152, "r"], Inboxes: [-8, 190, "b"],
          Meetings: [134, 130, "b"], Calendar: [134, 178, "b"],
          hub: [0.46, 0.27], field: [24, 340, 150, 44],
          chips: { market: [24, 430], research: [-116, -14], hub: [0, 70], infra: [-26, 226], channels: [104, -168], conv: [-92, -168], outcomes: [104, 262] }
        }
      };

      /* ---- layout ---- */
      function size() {
        dpr = Math.min(dprCap, window.devicePixelRatio || 1);
        var r = stage.getBoundingClientRect(); W = r.width; H = r.height;
        if (!W || !H) return;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        mode = W < 700 ? "m" : (W < 1100 ? "t" : "d");
        stage.setAttribute("data-mode", mode);
        var L = LAYOUT[mode];
        // the tour panel lives in the copy column on desktop, under the map elsewhere
        if (tourEl) {
          var copy = hero.querySelector(".hero-copy"), cta = copy ? copy.querySelector(".cta-row") : null;
          if (mode === "d" && copy && tourEl.parentNode !== copy) { copy.insertBefore(tourEl, cta); hero.classList.add("has-tour"); }
          else if (mode !== "d" && tourEl.parentNode !== map) { map.appendChild(tourEl); hero.classList.remove("has-tour"); }
          r = stage.getBoundingClientRect(); W = r.width; H = r.height;
          if (!W || !H) return;
          cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        var topH = 0;
        if (top && mode === "d") { var tr = top.getBoundingClientRect(); topH = Math.max(0, tr.bottom - r.top); }
        if (mode === "d") { k = clamp(Math.min(W / 1440, H / 832), 0.7, 1.08); hub = [W * L.hub[0], Math.max(topH * 0.35 + 150 * k, H * L.hub[1])]; }
        else if (mode === "t") { k = clamp(W / 1500, 0.52, 0.7); hub = [W * L.hub[0], H * L.hub[1]]; }
        else { k = clamp(W / 390, 0.9, 1.15); hub = [W * L.hub[0], H * L.hub[1]]; }
        R = 96 * k * (mode === "m" ? 0.7 : 1);
        nodes = {}; order = [];
        nodes.hub = { key: "hub", x: hub[0], y: hub[1], r: R, cl: "hub", lab: "", note: "", at: 1.2, boot: clusterOn.hub ? 1 : 0, hot: 0, isHub: true };
        DEFS.forEach(function (d) {
          var o = L[d.key];
          nodes[d.key] = { key: d.key, x: hub[0] + o[0] * k, y: hub[1] + o[1] * k, r: (d.cl === "channels" ? 7 : 5.5) * k, side: o[2], cl: d.cl, lab: d.lab, note: d.note, at: d.at, boot: clusterOn[d.cl] ? 1 : 0, hot: 0, hidden: mode === "m" && d.cl === "research" };
          order.push(d.key);
        });
        var fc = [hub[0] + L.field[0] * k, hub[1] + L.field[1] * k], frx = L.field[2] * k, fry = L.field[3] * k;
        if (mode === "d") fc[1] = Math.min(H - 96 - fry, Math.max(fc[1], topH + 30 + fry + 28));
        field = []; var seed = 7;
        function srnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        for (var i = 0; i < (mode === "m" ? 90 : 150); i++) {
          var a = srnd() * TWO, rr = Math.sqrt(srnd());
          var x = fc[0] + Math.cos(a) * rr * frx, y = fc[1] + Math.sin(a) * rr * fry;
          field.push({ x: x, y: y, s: 0, t: 0, d: Math.hypot(x - hub[0], y - hub[1]), o: srnd() });
        }
        nodes.field = { key: "field", x: fc[0], y: fc[1], rx: frx, ry: fry, cl: "market", isField: true, boot: clusterOn.market ? 1 : 0, hot: 0, at: 0.1, lab: "", note: "" };
        gather = [];
        for (var g = 0; g < 6; g++) gather.push(field[Math.floor(srnd() * field.length)]);
        edges = EDGE_DEFS.map(function (e) { return makeEdge(nodes[e[0]], nodes[e[1]], e[2]); });
        if (mode === "m") {
          var fp0 = [fc[0] - frx * 0.55, fc[1] - fry * 0.6], fc2 = [hub[0] - 150 * k, hub[1] + 60 * k], fp3 = portOf(nodes.hub, { x: fc2[0], y: fc2[1] });
          edges.push({ a: nodes.field, b: nodes.hub, kind: "flow", p0: fp0, c1: [fp0[0] - 90 * k, fp0[1] - 90 * k], c2: fc2, p3: fp3, pk: [], next: rnd(0.5, 3) });
        }
        // chips
        Object.keys(chips).forEach(function (key) {
          var c = L.chips[key]; if (!c) return;
          var x = hub[0] + c[0] * k, y = hub[1] + c[1] * k;
          if (key === "market" && mode !== "m") { x = fc[0]; y = fc[1] + fry + 46 * k; }
          chips[key].style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
        });
        if (hubEl) { hubEl.style.transform = "translate(" + Math.round(hub[0]) + "px," + Math.round(hub[1]) + "px)"; hubEl.style.setProperty("--r", (R * 2) + "px"); }
        // background dot grid as a repeating tile, and the cached base layer
        var tile = document.createElement("canvas"), gap = 26; tile.width = tile.height = Math.round(gap * dpr);
        var g2 = tile.getContext("2d"); g2.fillStyle = rgba(INK, 0.09); g2.beginPath(); g2.arc(gap * dpr / 2, gap * dpr / 2, 0.9 * dpr, 0, TWO); g2.fill();
        gridPat = main.createPattern(tile, "repeat");
        if (!baseCv) { baseCv = document.createElement("canvas"); baseCv.className = "map-canvas map-base"; baseCv.setAttribute("aria-hidden", "true"); cv.parentNode.insertBefore(baseCv, cv); }
        baseCv.width = cv.width; baseCv.height = cv.height;
        bctx = baseCv.getContext("2d"); bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        markDirty();
        traces = []; pulses = [];
        placeTip(); applyFocus();
      }
      function portOf(n, toward) {
        if (!n.isHub) return [n.x, n.y];
        var dx = toward.x - n.x, dy = toward.y - n.y, d = Math.hypot(dx, dy) || 1;
        return [n.x + dx / d * R, n.y + dy / d * R];
      }
      function makeEdge(a, b, kind) {
        var p0 = portOf(a, b), p3 = portOf(b, a), c1, c2;
        var dx = p3[0] - p0[0], dy = p3[1] - p0[1];
        if (kind === "loop") {
          var bul = (a.key === "Calendar" ? 170 : -110) * k;
          c1 = [p0[0] + (a.key === "Calendar" ? 40 : -40) * k, p0[1] + bul * 0.7]; c2 = [p3[0] + (a.key === "Calendar" ? 260 : -220) * k, p3[1] + bul];
        } else if (Math.abs(dx) > Math.abs(dy)) { var mxx = (p0[0] + p3[0]) / 2; c1 = [mxx, p0[1]]; c2 = [mxx, p3[1]]; }
        else { var myy = (p0[1] + p3[1]) / 2; c1 = [p0[0], myy]; c2 = [p3[0], myy]; }
        return { a: a, b: b, kind: kind, p0: p0, c1: c1, c2: c2, p3: p3, pk: [], next: rnd(0.5, 3) };
      }
      function bez(e, t) {
        var u = 1 - t, uu = u * u, tt = t * t;
        return [uu * u * e.p0[0] + 3 * uu * t * e.c1[0] + 3 * u * tt * e.c2[0] + tt * t * e.p3[0], uu * u * e.p0[1] + 3 * uu * t * e.c1[1] + 3 * u * tt * e.c2[1] + tt * t * e.p3[1]];
      }
      function curve(e, t0_, t1_, rgb, alpha, width, dash) {
        if (t1_ <= t0_) return;
        var n = Math.max(4, Math.round((t1_ - t0_) * 36));
        ctx.beginPath();
        for (var i = 0; i <= n; i++) { var p = bez(e, t0_ + (t1_ - t0_) * i / n); if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }
        if (dash) ctx.setLineDash(dash);
        ctx.strokeStyle = rgba(rgb, alpha); ctx.lineWidth = width; ctx.stroke();
        if (dash) ctx.setLineDash([]);
      }
      function makeTrace(a, b, kind, horiz) {
        var e = { p0: [a.x, a.y], p3: [b.x, b.y] };
        if (kind === "out") { var ib = nodes.Inboxes; e.c1 = [ib.x + rnd(-36, 36) * k, ib.y + rnd(-24, 24) * k]; e.c2 = [b.x + (mode === "m" ? 70 : 170) * k, b.y + 30 * k]; }
        else if (kind === "reply") { var cx0 = hub[0] - (mode === "m" ? 118 : 162) * k; e.c1 = [cx0, a.y]; e.c2 = [cx0, b.y + 70 * k]; }
        else if (horiz) { var mxx = (a.x + b.x) / 2; e.c1 = [mxx, a.y]; e.c2 = [mxx, b.y]; }
        else { var myy = (a.y + b.y) / 2; e.c1 = [a.x, myy]; e.c2 = [b.x, myy]; }
        e.kind = kind; e.t = 0; e.v = 1 / rnd(1.3, 2.0); e.life = 0; e.to = b; e.from = a; return e;
      }

      /* ---- drawing ---- */
      function dot(x, y, r, rgb, a) { ctx.fillStyle = rgba(rgb, a); ctx.beginPath(); ctx.arc(x, y, r, 0, TWO); ctx.fill(); }
      function dots(list, r, rgb, a) { if (!list.length) return; ctx.fillStyle = rgba(rgb, a); ctx.beginPath(); for (var i = 0; i < list.length; i++) { var d = list[i]; ctx.moveTo(d.x + r, d.y); ctx.arc(d.x, d.y, r, 0, TWO); } ctx.fill(); }
      function ring(x, y, r, rgb, a, w, a0, a1, dash) { ctx.beginPath(); ctx.arc(x, y, r, a0 || 0, a1 === undefined ? TWO : a1); if (dash) ctx.setLineDash(dash); ctx.strokeStyle = rgba(rgb, a); ctx.lineWidth = w || 1; ctx.stroke(); if (dash) ctx.setLineDash([]); }
      function glow(x, y, r, a) {
        if (quality < 1 && ctx === main) return;
        if (!glowSprite) { glowSprite = document.createElement("canvas"); glowSprite.width = glowSprite.height = 64; var g = glowSprite.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(199,251,109,1)"); gr.addColorStop(1, "rgba(199,251,109,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
        if (a <= 0.005 || r <= 0) return;
        ctx.globalAlpha = clamp(a, 0, 1); ctx.drawImage(glowSprite, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
      }
      function label(n, hot, a) {
        if (!n.lab || mode === "m" && (n.cl === "research" || n.cl === "infra")) return;
        ctx.font = (hot ? "600 " : "500 ") + Math.round(11 * Math.max(0.95, k)) + "px JetBrains Mono, ui-monospace, Menlo, monospace";
        ctx.fillStyle = rgba(hot ? INK : INK3, a);
        var off = n.r + 7, x = n.x, y = n.y;
        if (n.side === "r") { ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(n.lab, x + off, y); }
        else if (n.side === "l") { ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(n.lab, x - off, y); }
        else if (n.side === "t") { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(n.lab, x, y - off); }
        else { ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(n.lab, x, y + off); }
      }
      function hubPhases() { var b = nodes.hub.boot; return [ease(clamp(b / 0.6, 0, 1)), ease(clamp((b - 0.2) / 0.6, 0, 1)), ease(clamp((b - 0.4) / 0.6, 0, 1))]; }
      /* static parts: drawn into the base layer only when something changes */
      function drawHubBase() {
        var n = nodes.hub, x = n.x, y = n.y; if (n.boot <= 0) return;
        var hot = hover === n || pinned === n, ph = hubPhases();
        ring(x, y, R, INK, 0.55, 1.1, -Math.PI / 2, -Math.PI / 2 + TWO * ph[0]);
        ring(x, y, R * 0.74, INK, 0.35, 1, -Math.PI / 2, -Math.PI / 2 + TWO * ph[1], [3 * k, 5 * k]);
        ring(x, y, R * 0.5, INK, 0.5, 1.1, -Math.PI / 2, -Math.PI / 2 + TWO * ph[2]);
        ring(x, y, R * 1.42, INK, 0.14 * ph[0], 1, 0, TWO, [2, 7]);
        if (hot) ring(x, y, R + 6 * k, LIME3, 0.9, 1.6);
      }
      function drawHubLive(t) {
        var n = nodes.hub, x = n.x, y = n.y; if (n.boot <= 0) return;
        var hot = hover === n || pinned === n, ph = hubPhases();
        // ticks, batched into two paths
        var rot = holdMotion() ? 0 : t * 0.12, lim = Math.floor(72 * ph[0]);
        for (var pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (var i = 0; i < lim; i++) { var big = i % 6 === 0; if ((pass === 0) !== big) continue; var a = i / 72 * TWO + rot, r0 = R - (big ? 9 : 5) * k; ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * (R - 1), y + Math.sin(a) * (R - 1)); }
          ctx.strokeStyle = rgba(INK, pass === 0 ? 0.55 : 0.28); ctx.lineWidth = 1; ctx.stroke();
        }
        var a0 = holdMotion() ? 0.6 : -t * 0.5, a1 = holdMotion() ? 3.5 : t * 0.35;
        ring(x, y, R * 0.74, LIME3, 0.95 * ph[1], 2.2, a0, a0 + 1.1);
        ring(x, y, R * 0.74, LIME3, 0.95 * ph[1], 2.2, a0 + Math.PI, a0 + Math.PI + 1.1);
        ring(x, y, R * 0.5, hot ? LIME3 : SIG, 0.8 * ph[2], 1.6, a1, a1 + 0.7);
        ring(x, y, R * 0.5, hot ? LIME3 : SIG, 0.8 * ph[2], 1.6, a1 + 2.1, a1 + 2.8);
        ring(x, y, R * 0.5, hot ? LIME3 : SIG, 0.8 * ph[2], 1.6, a1 + 4.2, a1 + 4.9);
        var oa = holdMotion() ? 2.2 : t * 0.45, ox = x + Math.cos(oa) * R * 1.42, oy = y + Math.sin(oa) * R * 1.42;
        glow(ox, oy, 8 * k, 0.4 * ph[0]); dot(ox, oy, 2.4 * k, LIME3, 0.9 * ph[0]);
        var pu = 0.5 + 0.5 * Math.sin(t * 2.4);
        glow(x, y, R * 0.42, (0.16 + pu * 0.12 + n.hot * 0.35) * ph[2]);
      }
      function drawNodeBase(n) {
        if (n.isHub || n.isField || n.hidden) return;
        var b = n.boot; if (b <= 0) return;
        var hot = hover === n || pinned === n;
        var e = ease(b) * (focus && focus !== n.cl && !hot ? 0.42 : 1), r = n.r * ease(b);
        if (b < 1) ring(n.x, n.y, n.r + (1 - b) * 26 * k, LIME3, (1 - b) * 0.8, 1.2);
        dot(n.x, n.y, r + 2.5, "251,252,248", 1);
        ring(n.x, n.y, r, hot ? LIME3 : INK, hot ? 1 : 0.7, hot ? 1.8 : 1.2);
        dot(n.x, n.y, Math.max(0, r - 3 * k), hot ? LIME3 : INK, hot ? 1 : 0.35);
        if (n.cl === "channels") ring(n.x, n.y, r + 5 * k, hot ? LIME3 : INK, hot ? 0.7 : 0.22, 1, 0, TWO, [2, 4]);
        label(n, hot, e);
      }
      function drawNodeLive(n) {
        if (n.isHub || n.isField || n.hidden || n.boot <= 0 || n.hot <= 0.05) return;
        var r = n.r * ease(n.boot);
        glow(n.x, n.y, r + 14 * k, n.hot * 0.5);
        dot(n.x, n.y, Math.max(0, r - 3 * k), LIME3, n.hot);
      }
      function drawFieldBase() {
        var f = nodes.field, b = f.boot; if (b <= 0) return;
        var hot = hover === f || pinned === f;
        ctx.setLineDash([3, 6]);
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.rx + 22 * k, f.ry + 22 * k, 0, 0, TWO); ctx.strokeStyle = rgba(hot ? LIME3 : INK, hot ? 0.8 : 0.22 * b); ctx.lineWidth = 1; ctx.stroke();
        ctx.setLineDash([]);
        var bx0 = f.x - f.rx - 30 * k, bx1 = f.x + f.rx + 30 * k, by0 = f.y - f.ry - 30 * k, by1 = f.y + f.ry + 30 * k, L = 12 * k;
        ctx.strokeStyle = rgba(INK, 0.45 * b); ctx.lineWidth = 1.2; ctx.beginPath();
        [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]].forEach(function (c) { ctx.moveTo(c[0], c[1] + L * c[3]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0] + L * c[2], c[1]); });
        ctx.stroke();
        var lst = nodes.List;
        if (lst.boot > 0 && !lst.hidden) gather.forEach(function (g) { var e = { p0: [g.x, g.y], p3: [lst.x, lst.y] }; var mxx = (g.x + lst.x) / 2; e.c1 = [mxx, g.y]; e.c2 = [mxx, lst.y]; curve(e, 0, ease(lst.boot), INK, 0.22, 1); });
      }
      function drawFieldLive() {
        var f = nodes.field, b = f.boot; if (b <= 0) return;
        var idle = [[], [], []], touched = [], replied = [], met = [], booting = b < 1;
        for (var i = 0; i < field.length; i++) {
          var d = field[i], vis = clamp(b * 1.3 - d.o, 0, 1); if (vis <= 0) continue;
          var sw = 0;
          for (var s = 0; s < sweeps.length; s++) { var dr = Math.abs(d.d - sweeps[s].r); if (dr < 26) sw = Math.max(sw, (1 - dr / 26) * (1 - sweeps[s].t)); }
          if (d.s === 0) {
            if (sw > 0.03 || booting) dot(d.x, d.y, (1.6 + sw * 1.6) * k, INK, (0.28 + sw * 0.6) * vis);
            else idle[vis > 0.85 ? 2 : (vis > 0.55 ? 1 : 0)].push(d);
          }
          else if (d.s === 1) touched.push(d); else if (d.s === 2) replied.push(d); else met.push(d);
          if (d.t > 0) ring(d.x, d.y, 4 + (1 - d.t) * 16 * k, LIME3, d.t * 0.8, 1);
        }
        dots(idle[0], 1.6 * k, INK, 0.14); dots(idle[1], 1.6 * k, INK, 0.2); dots(idle[2], 1.6 * k, INK, 0.28);
        dots(touched, 2.1 * k, INK, 0.75); dots(replied, 2.6 * k, LIME3, 1); dots(met, 2.8 * k, SIG, 1);
        for (var q = 0; q < met.length; q++) ring(met[q].x, met[q].y, 6 * k, LIME3, 0.9, 1.2);
      }
      function edgeDim(e) {
        var hot = hover && (hover === e.a || hover === e.b) || pinned && (pinned === e.a || pinned === e.b);
        var dim = (hover || pinned) && !hot ? 0.45 : 1;
        if (focus && !hot && e.a.cl !== focus && e.b.cl !== focus) dim *= 0.4;
        return [hot, dim];
      }
      function drawEdgeBase(e) {
        if (e.a.hidden || e.b.hidden) return;
        var b = Math.min(e.a.boot, e.b.boot); if (b <= 0) return;
        var hd = edgeDim(e), hot = hd[0], dim = hd[1], loop = e.kind === "loop";
        curve(e, 0, ease(b), hot ? LIME3 : INK, (loop ? 0.3 : (e.kind === "spoke" ? 0.42 : 0.5)) * dim * (hot ? 2 : 1), hot ? 1.8 : (loop ? 1 : 1.2), loop ? [4 * k, 6 * k] : null);
        if (b >= 1 && !loop) { var pe = bez(e, 1), pd = bez(e, 0.985), ang = Math.atan2(pe[1] - pd[1], pe[0] - pd[0]); ctx.beginPath(); ctx.moveTo(pe[0] - Math.cos(ang - 0.5) * 6 * k, pe[1] - Math.sin(ang - 0.5) * 6 * k); ctx.lineTo(pe[0], pe[1]); ctx.lineTo(pe[0] - Math.cos(ang + 0.5) * 6 * k, pe[1] - Math.sin(ang + 0.5) * 6 * k); ctx.strokeStyle = rgba(hot ? LIME3 : INK, 0.6 * dim); ctx.lineWidth = 1.2; ctx.stroke(); }
      }
      function drawEdgeLive(e) {
        if (!e.pk.length || e.a.hidden || e.b.hidden) return;
        var dim = edgeDim(e)[1];
        for (var i = 0; i < e.pk.length; i++) {
          var p = e.pk[i], pos = bez(e, p.t);
          curve(e, Math.max(0, p.t - 0.09), p.t, p.lime ? LIME3 : INK, (p.lime ? 0.9 : 0.5) * dim, p.lime ? 2.2 : 1.6);
          if (p.lime) glow(pos[0], pos[1], 9 * k, 0.5 * dim);
          dot(pos[0], pos[1], (p.lime ? 3 : 2.2) * k, p.lime ? SIG : INK, dim);
        }
      }
      function drawTrace(tr) {
        var a = tr.life > 0 ? 1 - tr.life / 1.4 : 1; if (a <= 0) return;
        if (focus && focus !== "market" && focus !== "channels" && focus !== "conv") a *= 0.4;
        var out = tr.kind === "out", rgb = out ? INK : LIME3;
        curve(tr, 0, tr.t, rgb, (out ? 0.34 : 0.85) * a, out ? 1 : 1.5);
        if (tr.t < 1) { var p = bez(tr, tr.t); if (!out) glow(p[0], p[1], 10 * k, 0.6); dot(p[0], p[1], (out ? 2 : 2.8) * k, out ? INK : SIG, out ? 0.8 : 1); }
      }
      function renderBase() {
        ctx = bctx;
        ctx.clearRect(0, 0, W, H);
        if (gridPat) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = gridPat; ctx.fillRect(0, 0, baseCv.width, baseCv.height); ctx.restore(); }
        drawFieldBase();
        if (focus) { var fcn = clusterCenter(focus); if (fcn) glow(fcn[0], fcn[1], fcn[2], 0.16); }
        for (var i = 0; i < edges.length; i++) drawEdgeBase(edges[i]);
        drawHubBase();
        for (var j = 0; j < order.length; j++) drawNodeBase(nodes[order[j]]);
        ctx = main; baseDirty = false;
      }
      function render(t) {
        if (!baseCv) return;
        if (baseDirty) renderBase();
        ctx = main;
        ctx.clearRect(0, 0, W, H);
        for (var s = 0; s < sweeps.length; s++) { var sw = sweeps[s]; ring(hub[0], hub[1], sw.r, LIME3, (1 - sw.t) * 0.35, 1.5); }
        drawFieldLive();
        for (var i = 0; i < edges.length; i++) drawEdgeLive(edges[i]);
        for (var q = 0; q < traces.length; q++) drawTrace(traces[q]);
        drawHubLive(t);
        for (var j = 0; j < order.length; j++) drawNodeLive(nodes[order[j]]);
        for (var p = pulses.length - 1; p >= 0; p--) { var pu = pulses[p]; ring(pu.x, pu.y, 8 + pu.t * 40 * k, LIME3, (1 - pu.t) * 0.8, 1.4); }
        if (mx >= 0 && fine && !hover) { ring(mx, my, 10, INK, 0.35, 1); ctx.beginPath(); ctx.moveTo(mx - 16, my); ctx.lineTo(mx - 12, my); ctx.moveTo(mx + 12, my); ctx.lineTo(mx + 16, my); ctx.moveTo(mx, my - 16); ctx.lineTo(mx, my - 12); ctx.moveTo(mx, my + 12); ctx.lineTo(mx, my + 16); ctx.strokeStyle = rgba(INK, 0.5); ctx.lineWidth = 1; ctx.stroke(); }
      }

      /* ---- state ---- */
      var running = false;
      function bootCluster(key) {
        if (!key || clusterOn[key]) return;
        clusterOn[key] = true;
        var c = chips[key]; if (c && !c.classList.contains("on")) { c.classList.add("on"); c._cT = 0; }
      }
      function clusterCenter(key) {
        if (key === "market") return [nodes.field.x, nodes.field.y, Math.max(nodes.field.rx, nodes.field.ry) * 1.1];
        if (key === "hub") return [hub[0], hub[1], R * 1.6];
        var sx = 0, sy = 0, n = 0;
        order.forEach(function (kk) { var nd = nodes[kk]; if (nd.cl === key && !nd.hidden) { sx += nd.x; sy += nd.y; n++; } });
        return n ? [sx / n, sy / n, 120 * k] : null;
      }
      function applyFocus() {
        markDirty();
        Object.keys(chips).forEach(function (key) { chips[key].classList.toggle("is-focus", focus === key); });
        if (!plane) return;
        var c = focus ? clusterCenter(focus) : null;
        if (c && W && H) { plane.style.setProperty("--ox", (c[0] / W * 100).toFixed(1) + "%"); plane.style.setProperty("--oy", (c[1] / H * 100).toFixed(1) + "%"); }
        zoom = (c && mode !== "m" && !over && !holdMotion()) ? 1.06 : 1;
        plane.style.setProperty("--z", zoom.toFixed(2));
      }
      function goStep(i, auto) {
        i = clamp(i, 0, TOUR.length - 1);
        tourStep = i; tourT = sceneT;
        for (var j = 0; j <= i; j++) bootCluster(TOUR[j].key);
        if (i === TOUR.length - 1) Object.keys(CLUSTERS).forEach(bootCluster);
        focus = TOUR[i].key;
        if (!auto) tourAuto = false;
        tourTabs.forEach(function (b, idx) { b.setAttribute("aria-selected", String(idx === i)); b.classList.toggle("done", idx < i); });
        if (tourTitle) tourTitle.textContent = TOUR[i].title;
        if (tourText) tourText.textContent = TOUR[i].text;
        if (tourEl) { tourEl.classList.toggle("is-live", i === TOUR.length - 1); tourEl.classList.toggle("is-paused", !tourAuto); }
        if (tourPlay) tourPlay.setAttribute("aria-pressed", String(tourAuto));
        applyFocus(); once();
      }
      function setAuto(on) {
        tourAuto = on;
        if (on && tourStep >= TOUR.length - 1) { tourStep = -1; sceneT = 0; goStep(0, true); }
        else if (on) tourT = sceneT;
        if (tourEl) tourEl.classList.toggle("is-paused", !tourAuto);
        if (tourPlay) tourPlay.setAttribute("aria-pressed", String(tourAuto));
      }
      function update(dt, t) {
        sceneT += dt; running = true;
        var idle = t - pointerT > 2;
        // tour
        if (tourStep < 0 && sceneT > 0.5) goStep(0, true);
        else if (tourAuto && tourStep >= 0 && tourStep < TOUR.length - 1 && sceneT - tourT >= STEP) goStep(tourStep + 1, true);
        if (tourBar) { var pr = tourAuto && tourStep >= 0 && tourStep < TOUR.length - 1 ? clamp((sceneT - tourT) / STEP, 0, 1) : (tourStep >= TOUR.length - 1 ? 1 : 0); tourBar.style.transform = "scaleX(" + pr.toFixed(3) + ")"; }
        Object.keys(chips).forEach(function (key) {
          var c = chips[key], d = CLUSTERS[key]; if (!c.classList.contains("on") || c._cT === undefined || c._cT > 1.6) return;
          c._cT += dt; var u = ease(clamp(c._cT / 1.4, 0, 1)); var st = c.querySelector("[data-mc-stat]"); if (st) st.textContent = d.text(Math.round(d.n * u));
        });
        Object.keys(nodes).forEach(function (key) { var n = nodes[key]; if (clusterOn[n.cl] && n.boot < 1) { n.boot = Math.min(1, n.boot + dt / (n.isHub ? 1.6 : 0.7)); baseDirty = true; } if (n.hot > 0) n.hot = Math.max(0, n.hot - dt * 1.8); });
        if (hubEl && nodes.hub.boot > 0.5) hubEl.classList.add("on");
        if (holdMotion()) {
          if (plane) { plane.style.setProperty("--tx", "0"); plane.style.setProperty("--ty", "0"); plane.style.setProperty("--z", "1"); }
          return;
        }
        // structural pulses
        for (var i = 0; i < edges.length; i++) {
          var e = edges[i]; if (e.a.boot < 1 || e.b.boot < 1 || e.a.hidden || e.b.hidden) continue;
          e.next -= dt; if (e.next <= 0 && e.kind !== "loop") { e.next = rnd(2.2, 4.5); e.pk.push({ t: 0, v: 1 / rnd(1.4, 2.2), lime: e.a.key === "Replies" || e.a.key === "hub" && e.b.key === "Meetings" || e.a.key === "Meetings" }); }
          if (e.kind === "loop" && e.next <= 0) { e.next = rnd(5, 8); e.pk.push({ t: 0, v: 1 / 3.2, lime: false }); }
          for (var q = e.pk.length - 1; q >= 0; q--) {
            var p = e.pk[q]; p.t += p.v * dt;
            if (p.t >= 1) {
              e.pk.splice(q, 1); e.b.hot = 1;
              if (e.b.key === "Calendar" && p.lime) pulses.push({ x: e.b.x, y: e.b.y, t: 0 });
              if (p.chain) { var nxt = e.b.key === "hub" ? edges[17] : (e.b.key === "Meetings" ? edges[18] : null); if (nxt) nxt.pk.push({ t: 0, v: 1 / 1.4, lime: true, chain: 1 }); if (e.b.key === "Calendar") { var md = field[Math.floor(Math.random() * field.length)]; md.s = 3; md.t = 1; } }
            }
          }
        }
        // outreach traces
        if (clusterOn.channels) {
          outAcc += dt * (quality > 1 ? (idle ? 3.2 : 4.5) : (quality === 1 ? 2.2 : 1.2));
          while (outAcc > 1) {
            outAcc -= 1;
            var chs = ["Email", "Email", "Email", "LinkedIn", "LinkedIn", "Ads", "SMS", "Voice"], ch = nodes[chs[Math.floor(Math.random() * chs.length)]];
            var target = field[Math.floor(Math.random() * field.length)];
            if (ch.boot >= 1) traces.push(makeTrace(ch, target, "out", true));
          }
        }
        for (var r = traces.length - 1; r >= 0; r--) {
          var tr = traces[r];
          if (tr.t < 1) { tr.t = Math.min(1, tr.t + tr.v * dt); if (tr.t >= 1) { if (tr.kind === "out") { var d = tr.to; if (d.s === 0) d.s = 1; d.t = 1; if (Math.random() < 0.32 && clusterOn.conv) replyQueue.push({ d: d, at: sceneT + rnd(0.4, 1.6) }); } else if (tr.kind === "reply") { nodes.Replies.hot = 1; tr.to.hot = 1; if (Math.random() < 0.34 && clusterOn.outcomes) { var e2 = edges[14]; e2.pk.push({ t: 0, v: 1 / 1.4, lime: true, chain: 1 }); } } } }
          else { tr.life += dt; if (tr.life > 1.4) traces.splice(r, 1); }
        }
        for (var z = replyQueue.length - 1; z >= 0; z--) { var rq = replyQueue[z]; if (sceneT >= rq.at) { replyQueue.splice(z, 1); if (rq.d.s < 2) rq.d.s = 2; rq.d.t = 1; if (nodes.Replies.boot > 0) traces.push(makeTrace(rq.d, nodes.Replies, "reply", false)); } }
        for (var fdx = 0; fdx < field.length; fdx++) { var fd = field[fdx]; if (fd.t > 0) fd.t = Math.max(0, fd.t - dt * 1.6); }
        for (var pz = pulses.length - 1; pz >= 0; pz--) { pulses[pz].t += dt * 0.9; if (pulses[pz].t >= 1) pulses.splice(pz, 1); }
        // radar sweep from the hub
        if (clusterOn.hub && t - lastSweep > 7) { lastSweep = t; sweeps.push({ r: R, t: 0 }); }
        for (var sx = sweeps.length - 1; sx >= 0; sx--) { var sw = sweeps[sx]; sw.t += dt / 2.6; sw.r = R + sw.t * Math.max(W, H) * 0.75; if (sw.t >= 1) sweeps.splice(sx, 1); }
        var cap = quality > 1 ? 60 : (quality === 1 ? 30 : 16);
        if (traces.length > cap) traces.splice(0, traces.length - cap);
        // tilt
        if (plane && !isSmall()) { var gx = idle ? 0 : tiltX, gy = idle ? 0 : tiltY; plane.style.setProperty("--tx", gx.toFixed(2)); plane.style.setProperty("--ty", gy.toFixed(2)); }
      }
      function frame(now) {
        raf = 0;
        if (!visible || holdMotion() || scrolling) return;
        var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
        var t = (now - t0) / 1000;
        frameAcc += dt; frameN++;
        if (frameN >= 45) { var avg = frameAcc / frameN; frameAcc = 0; frameN = 0; if (avg > 0.034 && quality > 0 && t - qT > 3) { quality--; qT = t; dprCap = quality > 1 ? 1.75 : (quality === 1 ? 1.25 : 1); size(); } }
        update(dt, t);
        var slow = quality === 0 || (t - pointerT > 8 && tourStep >= TOUR.length - 1);
        if (slow) { skip = !skip; if (!skip) render(t); } else render(t);
        if (t - hudT > 0.15 && hud) { hudT = t; hud.textContent = hover ? ("focus: " + (hover.isHub ? "be leaded" : hover.isField ? "your market" : hover.lab.toLowerCase())) : (mx >= 0 && fine ? "cursor x " + Math.round(mx) + " y " + Math.round(my) : "cursor idle"); }
        if (!holdMotion() && !scrolling) raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && visible && !holdMotion() && !scrolling) { last = performance.now(); raf = requestAnimationFrame(frame); } }
      function once() { if (holdMotion() && W) render(0); }

      /* ---- interaction ---- */
      function hit(x, y) {
        var best = null, bd = 1e9;
        Object.keys(nodes).forEach(function (key) {
          var n = nodes[key]; if (n.boot <= 0 || n.hidden) return;
          var d;
          if (n.isField) { var ex = (x - n.x) / (n.rx + 24 * k), ey = (y - n.y) / (n.ry + 24 * k); d = ex * ex + ey * ey <= 1 ? 1e6 : 1e9; }
          else { d = Math.hypot(x - n.x, y - n.y); if (d > (n.isHub ? R + 8 : 22 * k)) d = 1e9; }
          if (d < bd) { bd = d; best = n; }
        });
        return bd < 1e9 ? best : null;
      }
      function placeTip() {
        var n = pinned || hover; if (!tip) return;
        if (!n || n.isField || n.isHub) { tip.hidden = true; return; }
        tip.hidden = false; tip.querySelector("b").textContent = n.lab; tip.querySelector("span").textContent = n.note;
        var right = n.x < W * 0.6;
        tip.style.transform = "translate(" + Math.round(n.x + (right ? 16 : -16)) + "px," + Math.round(n.y) + "px)";
        tip.classList.toggle("flip", !right);
      }
      function setHover(n) { if (hover === n) return; hover = n; markDirty(); stage.classList.toggle("is-focus", !!n); placeTip(); once(); }
      hero.addEventListener("pointermove", function (e) {
        var r = stage.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; pointerT = (performance.now() - t0) / 1000;
        var hr = hero.getBoundingClientRect();
        tiltX = ((e.clientX - hr.left) / hr.width - 0.5) * 5; tiltY = ((e.clientY - hr.top) / hr.height - 0.5) * -4;
        if (!fine) return;
        if (!e.target.closest(".mc")) setHover(hit(mx, my)); else setHover(null);
      });
      hero.addEventListener("pointerleave", function () { mx = my = -1; setHover(null); over = false; applyFocus(); });
      stage.addEventListener("pointerenter", function () { if (fine) { over = true; applyFocus(); } });
      tourTabs.forEach(function (b, idx) { b.addEventListener("click", function () { goStep(idx, false); }); });
      if (tourPlay) tourPlay.addEventListener("click", function () { setAuto(!tourAuto); });
      stage.addEventListener("click", function (e) {
        if (e.target.closest(".mc, a, button")) return;
        var r = stage.getBoundingClientRect(), n = hit(e.clientX - r.left, e.clientY - r.top);
        if (n && !n.isField && !n.isHub) { e.stopPropagation(); pinned = pinned === n ? null : n; markDirty(); stage.classList.toggle("is-pinned", !!pinned); placeTip(); once(); }
        else if (pinned) { pinned = null; markDirty(); stage.classList.remove("is-pinned"); placeTip(); once(); }
      });
      document.addEventListener("click", function (e) { if (pinned && !e.target.closest("[data-map-stage]")) { pinned = null; markDirty(); stage.classList.remove("is-pinned"); placeTip(); once(); } });
      Object.keys(chips).forEach(function (key) {
        var c = chips[key], b = c.querySelector(".mc-head");
        if (b) b.addEventListener("click", function (e) { e.stopPropagation(); var open = !c.classList.contains("open"); Object.keys(chips).forEach(function (kk) { chips[kk].classList.remove("open"); chips[kk].querySelector(".mc-head").setAttribute("aria-expanded", "false"); }); c.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open)); });
        c.addEventListener("pointerenter", function () { if (fine) { var n = key === "market" ? nodes.field : key === "hub" ? nodes.hub : null; if (n) setHover(n); } });
        c.addEventListener("pointerleave", function () { if (fine) setHover(null); });
      });
      document.addEventListener("click", function (e) { if (!e.target.closest(".mc")) Object.keys(chips).forEach(function (kk) { chips[kk].classList.remove("open"); }); });
      stage.addEventListener("keydown", function (e) { if (e.key === "Escape") { pinned = null; markDirty(); stage.classList.remove("is-pinned"); placeTip(); once(); } });

      var io = new IntersectionObserver(function (en) {
        visible = en.some(function (x) { return x.isIntersecting; });
        if (visible) { if (!W) { size(); t0 = performance.now(); } if (holdMotion()) runReduced(); else start(); }
      }, { threshold: 0.02 });
      io.observe(stage);
      canvasResumes.push(function () {
        if (!visible) return;
        if (holdMotion() || scrolling) { if (raf) { cancelAnimationFrame(raf); raf = 0; } return; }
        start();
      });
      window.addEventListener("resize", function () { if (W) { size(); once(); } });
      function runReduced() {
        if (!running) {
          running = true; sceneT = 9; tourAuto = false;
          Object.keys(CLUSTERS).forEach(bootCluster);
          Object.keys(nodes).forEach(function (key) { nodes[key].boot = 1; });
          goStep(TOUR.length - 1, false);
          Object.keys(CLUSTERS).forEach(function (key) { var c = chips[key]; if (c) { c.classList.add("on"); var st = c.querySelector("[data-mc-stat]"); if (st) st.textContent = CLUSTERS[key].text(CLUSTERS[key].n); } });
          var chs = ["Email", "LinkedIn", "Ads", "Email", "SMS", "Email", "Voice", "LinkedIn"];
          for (var i = 0; i < 8; i++) { var tr = makeTrace(nodes[chs[i]], field[(i * 17) % field.length], "out", true); tr.t = 1; traces.push(tr); field[(i * 17) % field.length].s = 1; }
          for (var j = 0; j < 3; j++) { var d = field[(j * 41 + 5) % field.length]; d.s = 2; var tr2 = makeTrace(d, nodes.Replies, "reply", false); tr2.t = 1; traces.push(tr2); }
          field[9].s = 3;
        }
        markDirty(); render(0);
      }
    });
  }

  /* ---------------- Match request builder ---------------- */
  function setupMatch(scope) {
    scope.querySelectorAll("[data-match]:not([data-on])").forEach(function (m) {
      m.setAttribute("data-on", "");
      var out = m.querySelector("[data-match-out]"), mail = m.querySelector("[data-match-mail]"), copy = m.querySelector("[data-match-copy]");
      function picks(group) { return Array.prototype.slice.call(m.querySelectorAll('[data-group="' + group + '"][aria-pressed="true"]')).map(function (b) { return b.textContent.trim(); }); }
      function upd() {
        var need = picks("need"), budget = picks("budget"), when = picks("when");
        var txt = "Hi Be Leaded,\n\nI'm looking for help with: " + (need.length ? need.join(", ") : "(pick one or more above)") +
          "\nBudget: " + (budget[0] || "not sure yet") + "\nTimeline: " + (when[0] || "not sure yet") +
          "\n\nA line about the company and who we sell to:\n\nBest,\n";
        if (out) out.value = txt;
        if (mail) mail.href = "mailto:sales@beleaded.com?subject=" + encodeURIComponent("Match request: " + (need[0] || "help")) + "&body=" + encodeURIComponent(txt);
      }
      m.querySelectorAll("[data-group]").forEach(function (b) {
        b.addEventListener("click", function () {
          var g = b.getAttribute("data-group"), single = g !== "need";
          if (single) m.querySelectorAll('[data-group="' + g + '"]').forEach(function (x) { if (x !== b) x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
          upd();
        });
      });
      if (copy && out) copy.addEventListener("click", function () {
        var done = function (t) { copy.textContent = t; setTimeout(function () { copy.textContent = "Copy the request"; }, 1800); };
        try { navigator.clipboard.writeText(out.value).then(function () { done("Copied"); }, function () { out.select(); done("Selected"); }); } catch (e) { out.select(); done("Selected"); }
      });
      upd();
    });
  }

  function initPage(scope) {
    setupRotator(scope);
    setupClock(scope);
    setupReveals(scope);
    setupCounters(scope);
    setupScan(scope);
    setupFlow(scope);
    setupParallax(scope);
    setupPointer(scope);
    setupCopy(scope);
    setupFilters(scope);
    setupBoard(scope);
    setupPicker(scope);
    setupHero(scope);
    setupLights(scope);
    setupMarquee(scope);
    setupInfra(scope);
    setupCalc(scope);
    setupJourney(scope);
    setupSystem(scope);
    setupMap(scope);
    setupMatch(scope);
    onScroll();
  }

  setupCursor();
  setupLights(document);

  /* ---------------- Preview router (single-file preview only) ---------------- */
  var pages = Array.prototype.slice.call(document.querySelectorAll("[data-route]"));
  if (pages.length > 1) {
    var show = function (route, scroll) {
      var target = null;
      pages.forEach(function (p) { if (p.getAttribute("data-route") === route) target = p; });
      if (!target) return false;
      pages.forEach(function (p) { p.hidden = p !== target; });
      if (motion) { target.classList.remove("route-in"); void target.offsetWidth; target.classList.add("route-in"); }
      if (target.getAttribute("data-title")) document.title = target.getAttribute("data-title");
      document.querySelectorAll("[data-nav]").forEach(function (a) {
        if (a.getAttribute("data-nav") === route) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      if (scroll !== false) window.scrollTo(0, 0);
      initPage(target);
      return true;
    };
    var route = function () {
      var h = decodeURIComponent((location.hash || "").slice(1));
      if (!h) { show("home", false); return; }
      if (show(h)) return;
      var el = document.getElementById(h);
      if (el) {
        var pg = el.closest("[data-route]");
        if (pg && pg.hidden) show(pg.getAttribute("data-route"), false);
        el.scrollIntoView();
      } else { show("home"); }
    };
    window.addEventListener("hashchange", route);
    setupCopy(document);
    route();
  } else {
    initPage(document);
  }

  function syncMotionMode() {
    reduce = !!(reduceMq && reduceMq.matches);
    root.classList.toggle("reduce", reduce);
    if (!scrollDriven || reduce || isSmall()) root.classList.add("jsreveal");
    resumeCanvases();
  }
  if (reduceMq && reduceMq.addEventListener) reduceMq.addEventListener("change", syncMotionMode);
  if (smallMq && smallMq.addEventListener) smallMq.addEventListener("change", syncMotionMode);
})();
