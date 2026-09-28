/* Not Another Monday — site interactions */

// Paste the live store links here once the listings are approved.
// While a link is empty, its button shows a "launching soon" message instead.
const STORE_LINKS = {
  ios: "",
  android: "",
};

(() => {
  const doc = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Page enter / leave ---------- */

  requestAnimationFrame(() => body.classList.add("is-ready"));
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) body.classList.remove("is-leaving");
    body.classList.add("is-ready");
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || reduceMotion) return;
    if (a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (a.hasAttribute("download") || a.protocol === "mailto:") return;
    e.preventDefault();
    body.classList.add("is-leaving");
    setTimeout(() => (location.href = a.href), 260);
  });

  /* ---------- Nav ---------- */

  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  const progress = document.querySelector(".progress");

  const onScroll = () => {
    const y = window.scrollY;
    nav?.classList.toggle("is-scrolled", y > 20);
    if (progress) {
      const max = doc.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav?.querySelectorAll(".nav-links a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
    })
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav?.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
      toggle?.focus();
    }
  });

  /* ---------- Toast ---------- */

  let toastEl;
  let toastTimer;
  const toast = (msg) => {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add("is-on"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 3200);
  };

  /* ---------- Store buttons ---------- */

  document.querySelectorAll("[data-store]").forEach((btn) => {
    const key = btn.dataset.store;
    const href = STORE_LINKS[key];
    if (href) {
      btn.setAttribute("href", href);
      btn.setAttribute("target", "_blank");
      btn.setAttribute("rel", "noopener");
    } else {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        toast(key === "ios" ? "Launching soon on the App Store 🌱" : "Launching soon on Google Play 🌱");
      });
    }
  });

  /* ---------- Split headlines ---------- */

  document.querySelectorAll("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    el.classList.add("split");
    const base = Number(el.dataset.delay || 0);
    words.forEach((word, i) => {
      const w = document.createElement("span");
      w.className = "w";
      const inner = document.createElement("span");
      inner.textContent = word;
      inner.style.setProperty("--d", `${base + i * 70}ms`);
      w.appendChild(inner);
      el.appendChild(w);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.setAttribute("aria-label", words.join(" "));
  });

  /* ---------- Reveal on scroll ---------- */

  const revealTargets = document.querySelectorAll("[data-reveal], .split, .reward, .timeline, [data-count]");
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        if (entry.target.hasAttribute("data-count")) countUp(entry.target);
        revealIO.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  revealTargets.forEach((el) => revealIO.observe(el));

  function countUp(el) {
    const end = Number(el.dataset.count);
    if (reduceMotion) return (el.textContent = end);
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Parallax scenery ---------- */

  const parallax = [...document.querySelectorAll("[data-parallax]")];
  if (parallax.length && !reduceMotion) {
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      parallax.forEach((el) => {
        const speed = Number(el.dataset.parallax);
        el.style.translate = `0 ${y * speed}px`;
      });
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  /* ---------- Seeds (floating particles) ---------- */

  document.querySelectorAll("[data-seeds]").forEach((host) => {
    if (reduceMotion) return;
    const n = Number(host.dataset.seeds) || 10;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      s.className = "seed";
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${55 + Math.random() * 45}%`;
      s.style.animationDelay = `${-Math.random() * 14}s`;
      s.style.animationDuration = `${11 + Math.random() * 8}s`;
      const size = 3 + Math.random() * 5;
      s.style.width = s.style.height = `${size}px`;
      host.appendChild(s);
    }
  });

  /* ---------- Hero phone tilt ---------- */

  const stage = document.querySelector(".hero-stage");
  const mainPhone = stage?.querySelector(".phone-main");
  if (stage && mainPhone && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      mainPhone.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg) translateZ(20px)`;
    });
    stage.addEventListener("pointerleave", () => (mainPhone.style.transform = ""));
  }

  /* ---------- Check-in ring demo ---------- */

  const ringCard = document.querySelector("[data-ring]");
  if (ringCard) {
    const ring = ringCard.querySelector(".ring");
    const bar = ringCard.querySelector(".bar");
    const label = ringCard.querySelector(".ring-label .t");
    const countEl = ringCard.querySelector(".ring-label .n");
    const habits = [...ringCard.querySelectorAll(".habit")];
    const C = 628.3;
    const total = habits.length;

    // Burst particles around the ring
    const burst = ringCard.querySelector(".ring-burst");
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("i");
      p.style.setProperty("--a", `${(360 / 18) * i}deg`);
      p.style.setProperty("--dist", `${120 + Math.random() * 50}px`);
      p.style.animationDelay = `${Math.random() * 0.15}s`;
      if (i % 3 === 0) p.style.background = "var(--amber)";
      if (i % 3 === 1) p.style.background = "var(--sage-2)";
      burst.appendChild(p);
    }

    const render = () => {
      const done = habits.filter((h) => h.getAttribute("aria-pressed") === "true").length;
      bar.style.strokeDashoffset = String(C - (C * done) / total);
      countEl.textContent = `${done} / ${total}`;
      const complete = done === total;
      label.textContent = complete ? "Day complete" : done ? "Keep going" : "Move Forward";
      if (complete && !ring.classList.contains("is-done")) {
        ring.classList.remove("is-done");
        void ring.offsetWidth;
        ring.classList.add("is-done");
      } else if (!complete) {
        ring.classList.remove("is-done");
      }
      habits.forEach((h) => {
        const s = h.querySelector(".streak");
        const on = h.getAttribute("aria-pressed") === "true";
        const base = Number(h.dataset.streak);
        s.textContent = `${on ? base + 1 : base} ${on || base !== 1 ? "days" : "day"}`;
      });
    };

    habits.forEach((h) =>
      h.addEventListener("click", () => {
        stopAuto();
        h.setAttribute("aria-pressed", h.getAttribute("aria-pressed") === "true" ? "false" : "true");
        render();
      })
    );

    let autoTimers = [];
    const stopAuto = () => {
      autoTimers.forEach(clearTimeout);
      autoTimers = [];
    };
    const ringIO = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        ringIO.disconnect();
        habits.forEach((h, i) => {
          autoTimers.push(
            setTimeout(() => {
              h.setAttribute("aria-pressed", "true");
              render();
            }, reduceMotion ? 0 : 700 + i * 650)
          );
        });
      },
      { threshold: 0.5 }
    );
    render();
    ringIO.observe(ringCard);
  }

  /* ---------- Feature story (sticky phone) ---------- */

  const story = document.querySelector("[data-story]");
  if (story) {
    const steps = [...story.querySelectorAll(".story-step")];
    const shots = [...story.querySelectorAll(".story-stage .screen img")];
    const dots = [...story.querySelectorAll(".story-dots i")];
    const halo = story.querySelector(".halo");
    const halos = [
      "rgba(155,178,147,.45)",
      "rgba(247,220,179,.55)",
      "rgba(155,178,147,.45)",
      "rgba(214,225,205,.8)",
      "rgba(247,220,179,.5)",
    ];
    const setActive = (i) => {
      steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
      shots.forEach((s, k) => s.classList.toggle("is-active", k === i));
      dots.forEach((s, k) => s.classList.toggle("is-active", k === i));
      if (halo) halo.style.background = `radial-gradient(circle, ${halos[i % halos.length]}, transparent 65%)`;
    };
    const storyIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(steps.indexOf(entry.target));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    steps.forEach((s) => storyIO.observe(s));
    setActive(0);
  }

  /* ---------- Gallery drag + arrows ---------- */

  const track = document.querySelector(".gallery-track");
  if (track) {
    let down = false;
    let startX = 0;
    let startLeft = 0;
    let moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) {
        moved = true;
        track.classList.add("is-dragging");
      }
      track.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      track.classList.remove("is-dragging");
    });
    track.addEventListener("click", (e) => moved && e.preventDefault(), true);

    const step = () => (track.querySelector(".shot")?.getBoundingClientRect().width || 260) + 32;
    document.querySelector("[data-gallery-prev]")?.addEventListener("click", () =>
      track.scrollBy({ left: -step(), behavior: "smooth" })
    );
    document.querySelector("[data-gallery-next]")?.addEventListener("click", () =>
      track.scrollBy({ left: step(), behavior: "smooth" })
    );
  }

  /* ---------- Legal table of contents scrollspy ---------- */

  const tocLinks = [...document.querySelectorAll(".toc a")];
  if (tocLinks.length) {
    const sections = tocLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    const tocIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          tocLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`));
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach((s) => tocIO.observe(s));
  }

  /* ---------- FAQ: accordion, categories, search ---------- */

  const faq = document.querySelector("[data-faq]");
  if (faq) {
    const items = [...faq.querySelectorAll(".qa")];
    const groups = [...faq.querySelectorAll(".faq-group")];
    const catButtons = [...document.querySelectorAll(".cats button")];
    const search = document.querySelector("#faq-search");
    const empty = faq.querySelector(".no-results");
    let activeCat = "all";

    items.forEach((qa, i) => {
      const btn = qa.querySelector("button");
      const ans = qa.querySelector(".ans");
      const id = `qa-${i}`;
      ans.id = id;
      btn.setAttribute("aria-controls", id);
      btn.setAttribute("aria-expanded", "false");
      ans.querySelector(".ans-in").dataset.html = ans.querySelector(".ans-in").innerHTML;
      btn.dataset.text = btn.querySelector("span").textContent;
      btn.addEventListener("click", () => {
        const open = !qa.classList.contains("is-open");
        qa.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
      });
    });

    // Counts per category
    catButtons.forEach((b) => {
      const cat = b.dataset.cat;
      const n = cat === "all" ? items.length : faq.querySelectorAll(`.faq-group[data-cat="${cat}"] .qa`).length;
      const em = b.querySelector("em");
      if (em) em.textContent = n;
    });

    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const highlight = (html, q) => {
      if (!q) return html;
      const re = new RegExp(`(${escapeRe(q)})`, "gi");
      return html.replace(/>([^<]+)</g, (m, text) => `>${text.replace(re, "<mark>$1</mark>")}<`);
    };

    const apply = () => {
      const q = (search?.value || "").trim().toLowerCase();
      let visible = 0;
      groups.forEach((g) => {
        const inCat = activeCat === "all" || g.dataset.cat === activeCat;
        let groupVisible = 0;
        g.querySelectorAll(".qa").forEach((qa) => {
          const btn = qa.querySelector("button");
          const inner = qa.querySelector(".ans-in");
          const text = (btn.dataset.text + " " + inner.textContent).toLowerCase();
          const match = inCat && (!q || text.includes(q));
          qa.hidden = !match;
          if (match) groupVisible++;
          const span = btn.querySelector("span");
          span.innerHTML = q ? highlight(`>${btn.dataset.text}<`, q).slice(1, -1) : btn.dataset.text;
          inner.innerHTML = q ? highlight(inner.dataset.html, q) : inner.dataset.html;
          if (q && match) {
            qa.classList.add("is-open");
            btn.setAttribute("aria-expanded", "true");
          }
        });
        g.hidden = groupVisible === 0;
        visible += groupVisible;
      });
      empty?.classList.toggle("is-on", visible === 0);
    };

    catButtons.forEach((b) =>
      b.addEventListener("click", () => {
        activeCat = b.dataset.cat;
        catButtons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        apply();
        const top = faq.getBoundingClientRect().top + window.scrollY - 110;
        if (window.scrollY > top) window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
      })
    );

    let debounce;
    search?.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(apply, 120);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== search && !/input|textarea/i.test(document.activeElement.tagName)) {
        e.preventDefault();
        search?.focus();
      }
    });

    // Open a question directly from a #hash link
    const openFromHash = () => {
      const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
      if (target && target.classList.contains("qa")) {
        target.classList.add("is-open");
        target.querySelector("button")?.setAttribute("aria-expanded", "true");
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
  }

  /* ---------- Copy email ---------- */

  document.querySelectorAll("[data-copy]").forEach((el) =>
    el.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(el.dataset.copy);
        toast("Email address copied");
      } catch {
        toast(el.dataset.copy);
      }
    })
  );

  /* ---------- Year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
