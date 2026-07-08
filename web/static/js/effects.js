// ─── WOW Effects (shared across pages) ───────────────────────────
// Все эффекты уважают prefers-reduced-motion и отключают
// hover-механики на сенсорных устройствах.

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ── 1. Scroll progress bar ─────────────────────────────────── */
  (function scrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    let ticking = false;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.transform = `scaleX(${p / 100})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  /* ── 2. Ripple on buttons ───────────────────────────────────── */
  (function ripples() {
    if (reducedMotion) return;
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.btn, .category-tab, .qty-btn, .admin-tab');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const d = Math.max(rect.width, rect.height) * 2;
      const r = document.createElement('span');
      r.className = 'fx-ripple';
      r.style.width = r.style.height = d + 'px';
      r.style.left = (e.clientX - rect.left - d / 2) + 'px';
      r.style.top = (e.clientY - rect.top - d / 2) + 'px';
      const cs = getComputedStyle(btn);
      if (cs.position === 'static') btn.style.position = 'relative';
      if (cs.overflow !== 'hidden') btn.style.overflow = 'hidden';
      btn.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    }, { passive: true });
  })();

  /* ── 3. 3D tilt + glare на карточках ────────────────────────── */
  (function tilt() {
    if (reducedMotion || !finePointer) return;
    const selector = '.feature-card, .tier-card, .component-card, .dc-stat, .config-card';
    const MAX = 8; // deg

    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest(selector);
      if (!card) return;
      if (!card.__tiltInit) {
        card.__tiltInit = true;
        card.classList.add('fx-tilt');
        const glare = document.createElement('span');
        glare.className = 'fx-glare';
        card.appendChild(glare);
        card.addEventListener('pointerleave', () => {
          card.style.transform = '';
          glare.style.opacity = '0';
        });
      }
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * MAX;
      const ry = (px - 0.5) * MAX;
      card.style.transform =
        `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px) scale(1.015)`;
      const glare = card.querySelector('.fx-glare');
      if (glare) {
        glare.style.opacity = '1';
        glare.style.background =
          `radial-gradient(320px circle at ${px * 100}% ${py * 100}%, rgba(148,197,255,0.18), transparent 65%)`;
      }
    }, { passive: true });
  })();

  /* ── 4. Магнитные кнопки ────────────────────────────────────── */
  (function magnetic() {
    if (reducedMotion || !finePointer) return;
    const STRENGTH = 0.28;
    document.addEventListener('pointermove', (e) => {
      const btn = e.target.closest('.btn-lg, .scroll-fab');
      if (!btn) return;
      if (!btn.__magInit) {
        btn.__magInit = true;
        btn.classList.add('fx-magnetic');
        btn.addEventListener('pointerleave', () => { btn.style.translate = '0px 0px'; });
      }
      const rect = btn.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      btn.style.translate = `${(dx * STRENGTH).toFixed(1)}px ${(dy * STRENGTH).toFixed(1)}px`;
    }, { passive: true });
  })();

  /* ── 5. Каскадное появление заголовка hero по буквам ────────── */
  (function splitHeroTitle() {
    if (reducedMotion) return;
    const title = document.querySelector('.hero-title');
    if (!title) return;
    const splitNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        // Разбиваем на слова, чтобы буквы одного слова не переносились по одной
        for (const part of node.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
          const word = document.createElement('span');
          word.className = 'fx-word';
          for (const ch of part) {
            const s = document.createElement('span');
            s.className = 'fx-char';
            s.textContent = ch;
            word.appendChild(s);
          }
          frag.appendChild(word);
        }
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
        [...node.childNodes].forEach(splitNode);
      }
    };
    [...title.childNodes].forEach(splitNode);
    title.querySelectorAll('.fx-char').forEach((s, i) => {
      s.style.animationDelay = (0.15 + i * 0.035) + 's';
    });
    title.classList.add('fx-title-ready');
  })();

  /* ── 6. Параллакс hero-элементов по движению мыши ───────────── */
  (function heroParallax() {
    if (reducedMotion || !finePointer) return;
    const hero = document.querySelector('.hero');
    const visual = document.querySelector('.hero-datacenter');
    if (!hero || !visual) return;
    let raf = null;
    hero.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        visual.style.setProperty('--parallax-x', (px * -14).toFixed(1) + 'px');
        visual.style.setProperty('--parallax-y', (py * -10).toFixed(1) + 'px');
        raf = null;
      });
    }, { passive: true });
  })();

  /* ── 7. Курсорный прожектор (spotlight) ─────────────────────── */
  (function spotlight() {
    if (reducedMotion || !finePointer) return;
    const glow = document.createElement('div');
    glow.className = 'fx-spotlight';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    let raf = null;
    window.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        glow.style.opacity = '1';
        raf = null;
      });
    }, { passive: true });
    document.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
  })();

  /* ── 8. Scroll-reveal для всех страниц (если не подключён) ──── */
  (function autoReveal() {
    const els = document.querySelectorAll('.reveal-up:not(.revealed)');
    if (!els.length) return;
    if (reducedMotion) { els.forEach(el => el.classList.add('revealed')); return; }
    // Если страница уже вешает свой observer — дубли безопасны (unobserve).
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('revealed');
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
  })();

  /* ── 9. Плавающая кнопка "наверх" (если её нет) ─────────────── */
  (function scrollFab() {
    if (document.querySelector('.scroll-fab')) return;
    const fab = document.createElement('button');
    fab.className = 'scroll-fab';
    fab.setAttribute('aria-label', 'Наверх');
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
    document.body.appendChild(fab);
    let ticking = false;
    const update = () => {
      fab.classList.toggle('visible', window.scrollY > 400);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  })();
})();
