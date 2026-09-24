(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- header: fundo ao rolar + menu mobile ---------------- */
  var header = document.getElementById("siteHeader");
  var toggle = document.getElementById("navToggle");
  var mobile = document.getElementById("navMobile");

  function onScrollHeader() {
    header.classList.toggle("is-solid", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  function setMenu(open) {
    mobile.classList.toggle("open", open);
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }
  toggle.addEventListener("click", function () {
    setMenu(!mobile.classList.contains("open"));
  });
  mobile.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  /* ---------------- link ativo no menu ---------------- */
  var navLinks = document.querySelectorAll("[data-nav]");
  if ("IntersectionObserver" in window && navLinks.length) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (l) {
          l.classList.toggle("is-current", l.dataset.nav === en.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (l) {
      var sec = document.getElementById(l.dataset.nav);
      if (sec) navIO.observe(sec);
    });
  }

  /* ---------------- mock: results.ag dentro do site ---------------- */
  (function () {
    var mock = document.getElementById("mock");
    var stage = document.getElementById("mockStage");
    if (!mock || !stage) return;

    var slides = Array.prototype.slice.call(stage.querySelectorAll(".mk-slide"));
    var tabs = mock.querySelectorAll(".mock-tab");
    var countEl = document.getElementById("mockCount");
    var bar = document.getElementById("mockProgress");
    var N = slides.length;
    var idx = 0;
    var pending = null;
    var DURATION = 4600;
    var elapsed = 0;
    var inView = true;
    var drag = null;
    var justDragged = false;

    function mod(n) { return (n % N + N) % N; }

    function updateUI() {
      var site = slides[idx].dataset.site;
      tabs.forEach(function (t) { t.setAttribute("aria-selected", t.dataset.site === site ? "true" : "false"); });
      countEl.textContent = (idx + 1) + "/" + N;
    }

    function finish() {
      if (pending) { clearTimeout(pending.t); pending.fn(); pending = null; }
    }

    function settle(outgoing, incoming) {
      var fn = function () {
        [outgoing, incoming].forEach(function (s) {
          if (!s) return;
          s.classList.remove("is-moving");
          s.style.transform = "";
          s.style.visibility = "";
        });
      };
      pending = { fn: fn, t: setTimeout(function () { fn(); pending = null; }, 600) };
    }

    function go(to, dir) {
      finish();
      to = mod(to);
      if (to === idx) return;
      if (!dir) {
        var fwd = mod(to - idx);
        dir = fwd <= N / 2 ? 1 : -1;
      }
      var out = slides[idx];
      var inc = slides[to];

      inc.classList.remove("is-moving");
      inc.style.visibility = "visible";
      inc.style.transform = "translateX(" + (dir * 100) + "%)";
      void inc.offsetWidth;

      out.classList.add("is-moving");
      inc.classList.add("is-moving");
      out.style.transform = "translateX(" + (-dir * 100) + "%)";
      inc.style.transform = "translateX(0)";
      out.classList.remove("is-active");
      inc.classList.add("is-active");

      idx = to;
      elapsed = 0;
      updateUI();
      settle(out, inc);
    }

    tabs.forEach(function (t) {
      t.addEventListener("click", function () { go(+t.dataset.go); });
    });
    document.getElementById("mockPrev").addEventListener("click", function () { go(idx - 1, -1); });
    document.getElementById("mockNext").addEventListener("click", function () { go(idx + 1, 1); });

    mock.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { go(idx + 1, 1); }
      if (e.key === "ArrowLeft") { go(idx - 1, -1); }
    });

    /* arrastar com dedo ou mouse, acompanhando o movimento */
    var nb = null, nbDir = 0;

    stage.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      finish();
      drag = { x: e.clientX, y: e.clientY, dx: 0, on: false, id: e.pointerId, w: stage.clientWidth };
    });

    stage.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (!drag.on) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          drag.on = true;
          stage.setPointerCapture(e.pointerId);
          stage.classList.add("is-dragging");
        } else {
          return;
        }
      }
      drag.dx = dx;
      var dir = dx < 0 ? 1 : -1;
      if (dir !== nbDir) {
        if (nb) { nb.style.visibility = ""; nb.style.transform = ""; }
        nb = slides[mod(idx + dir)];
        nbDir = dir;
        nb.classList.remove("is-moving");
        nb.style.visibility = "visible";
      }
      slides[idx].style.transform = "translateX(" + dx + "px)";
      nb.style.transform = "translateX(calc(" + (dir * 100) + "% + " + dx + "px))";
    });

    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag;
      drag = null;
      stage.classList.remove("is-dragging");
      if (!d.on) return;

      justDragged = true;
      setTimeout(function () { justDragged = false; }, 50);

      var cur = slides[idx];
      var commit = Math.abs(d.dx) > d.w * 0.16;
      cur.classList.add("is-moving");
      nb.classList.add("is-moving");

      if (commit) {
        cur.style.transform = "translateX(" + (-nbDir * 100) + "%)";
        nb.style.transform = "translateX(0)";
        cur.classList.remove("is-active");
        nb.classList.add("is-active");
        idx = mod(idx + nbDir);
        updateUI();
        settle(cur, nb);
      } else {
        cur.style.transform = "translateX(0)";
        nb.style.transform = "translateX(" + (nbDir * 100) + "%)";
        var back = nb;
        pending = {
          fn: function () {
            cur.classList.remove("is-moving"); cur.style.transform = "";
            back.classList.remove("is-moving"); back.style.transform = ""; back.style.visibility = "";
          },
          t: setTimeout(function () { pending && pending.fn(); pending = null; }, 600)
        };
      }
      elapsed = 0;
      nb = null; nbDir = 0;
    }
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("click", function (e) {
      if (justDragged) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    /* autoplay contínuo: só segura enquanto o dedo está arrastando */

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { inView = en[0].isIntersecting; }, { threshold: 0.3 }).observe(mock);
    }

    updateUI();
    if (reduceMotion) { bar.style.display = "none"; return; }

    var last = performance.now();
    function tick(now) {
      var dt = Math.min(now - last, 100);
      last = now;
      var running = !(drag && drag.on) && inView && !document.hidden;
      if (running) {
        elapsed += dt;
        if (elapsed >= DURATION) go(idx + 1, 1);
      }
      bar.style.transform = "scaleX(" + Math.min(elapsed / DURATION, 1) + ")";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ---------------- listas que viram carrossel no celular ---------------- */
  document.querySelectorAll(".swipe-dots[data-for]").forEach(function (dots) {
    var list = document.getElementById(dots.dataset.for);
    if (!list) return;
    var items = Array.prototype.slice.call(list.children);

    items.forEach(function (item, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Ir para o item " + (i + 1) + " de " + items.length);
      b.addEventListener("click", function () {
        var padL = parseFloat(getComputedStyle(list).paddingLeft) || 0;
        list.scrollTo({ left: item.offsetLeft - padL, behavior: reduceMotion ? "auto" : "smooth" });
      });
      dots.appendChild(b);
    });
    var btns = dots.querySelectorAll("button");

    function current() {
      var max = list.scrollWidth - list.clientWidth;
      if (max <= 2) return 0;
      if (list.scrollLeft >= max - 2) return items.length - 1;
      var step = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : 1;
      return Math.max(0, Math.min(items.length - 1, Math.round(list.scrollLeft / step)));
    }
    var raf = 0;
    function mark() {
      raf = 0;
      var c = current();
      btns.forEach(function (b, i) { b.setAttribute("aria-current", i === c ? "true" : "false"); });
    }
    list.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(mark); }, { passive: true });
    window.addEventListener("resize", mark);
    mark();
  });

  /* ---------------- barra fixa de WhatsApp no celular ---------------- */
  (function () {
    var dock = document.getElementById("dock");
    var hero = document.getElementById("top");
    var contato = document.getElementById("contato");
    if (!dock || !hero) return;
    var contatoVisible = false;
    if ("IntersectionObserver" in window && contato) {
      new IntersectionObserver(function (en) {
        contatoVisible = en[0].isIntersecting;
        update();
      }, { threshold: 0.15 }).observe(contato);
    }
    function update() {
      var past = window.scrollY > hero.offsetHeight * 0.7;
      dock.classList.toggle("is-visible", past && !contatoVisible);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  })();

  /* ---------------- ano no rodapé ---------------- */
  var y = document.getElementById("footerYear");
  if (y) y.textContent = "© " + new Date().getFullYear() + " Results.AG";
})();
