// Contact settings — replace before launch.
const CONTACT_EMAIL = 'michael@bookmarkpartners.com';
const BOOKING_URL = ''; // e.g. a Calendly link. Empty = falls back to email.
// Form submissions are emailed via FormSubmit (formsubmit.co). After activating, you can swap
// CONTACT_EMAIL in this URL for the random alias FormSubmit gives you, to hide your address.
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Hero video ----------
const video = document.querySelector('.hero-video');
if (video) {
  if (reduceMotion) video.pause();
  // Pause off-screen to save battery; resume when back in view.
  new IntersectionObserver(([e]) => {
    if (reduceMotion) return;
    e.isIntersecting ? video.play().catch(() => {}) : video.pause();
  }).observe(video);
}

// ---------- Interactive hero ----------
// Mouse: the footage drifts against the cursor and a soft spotlight follows it.
// Scroll: the footage moves slower than the page and eases in scale (parallax).
// Transforms go on the .hero-media wrapper, never on the <video> itself.
const heroEl = document.getElementById('hero');
const media = document.querySelector('.hero-media');
if (heroEl && media && !reduceMotion) {
  let tx = 0, ty = 0, cx = 0, cy = 0, sx = 0, sy = 0, mx = 0, my = 0, inView = true;
  if (window.matchMedia('(pointer: fine)').matches) {
    heroEl.addEventListener('pointermove', e => {
      const r = heroEl.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      tx = (mx / r.width - .5) * -28; ty = (my / r.height - .5) * -18;
      if (!heroEl.classList.contains('spot-on')) { sx = mx; sy = my; heroEl.classList.add('spot-on'); }
    });
    heroEl.addEventListener('pointerleave', () => { tx = 0; ty = 0; heroEl.classList.remove('spot-on'); });
  }
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; }).observe(heroEl);
  const tick = () => {
    if (inView) {
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      sx += (mx - sx) * .14; sy += (my - sy) * .14;
      const s = Math.min(window.scrollY, heroEl.offsetHeight);
      const scale = 1.06 + (s / heroEl.offsetHeight) * .08;
      media.style.transform = `translate3d(${cx.toFixed(2)}px, ${(cy + s * .3).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      heroEl.style.setProperty('--mx', `${sx.toFixed(1)}px`);
      heroEl.style.setProperty('--my', `${sy.toFixed(1)}px`);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- Reveal on scroll ----------
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal, .meet, .timeline, .lock').forEach(el => io.observe(el));

// ---------- Nav ----------
// Text flips dark over light sections, white over dark ones (marked data-dark).
const nav = document.querySelector('.nav');
const darkSections = [...document.querySelectorAll('[data-dark]')];
const setNav = () => {
  const y = nav.querySelector('.nav-pill').getBoundingClientRect().bottom - 35;
  const overDark = darkSections.some(s => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom >= y; });
  nav.classList.toggle('on-light', !overDark);
};
window.addEventListener('scroll', () => { nav.classList.toggle('compact', window.scrollY > 40); setNav(); }, { passive: true });
window.addEventListener('resize', setNav);
setNav();

// Highlight the menu item for the section in view.
const navLinks = [...document.querySelectorAll('.nav-links a')];
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach(l => { const s = document.querySelector(l.getAttribute('href')); if (s) spy.observe(s); });
spy.observe(document.getElementById('hero')); // clears the highlight at the top of the page

const toggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('mobile-menu');
const closeMenu = () => {
  menu.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open menu');
  nav.classList.remove('open');
};
toggle.addEventListener('click', () => {
  if (!menu.hidden) return closeMenu();
  menu.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Close menu');
  nav.classList.add('open');
});
menu.addEventListener('click', e => { if (e.target.tagName === 'A') closeMenu(); });

// ---------- Smooth scrolling (Lenis, same settings as bondmsp.com) ----------
let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4) });
  const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

// In-page links glide to their section and stop just under the menu bar.
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id === '#') return;
  const target = id === '#top' ? 0 : document.querySelector(id);
  if (target === null) return;
  e.preventDefault();
  const pill = nav.querySelector('.nav-pill');
  const offset = target === 0 ? 0 : -(pill.offsetHeight + parseFloat(getComputedStyle(pill).marginTop));
  if (lenis) lenis.scrollTo(target, { offset });
  else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY + offset });
  history.replaceState(null, '', id);
});

// ---------- Connect ----------
const form = document.querySelector('.form');
const intentField = form.querySelector('[name="intent"]');
const status = form.querySelector('.form-status');

// "Staying in the seat" / "Planning a handoff" cards pre-select the matching option.
document.querySelectorAll('[data-intent]').forEach(a => {
  a.addEventListener('click', () => { intentField.value = a.dataset.intent; });
});

const mailto = (subject, body = '') =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;

document.querySelector('[data-email]').href = mailto('Belmont Residential');
const book = document.querySelector('[data-book]');
if (BOOKING_URL) { book.href = BOOKING_URL; book.target = '_blank'; book.rel = 'noopener'; }
else book.href = mailto('Book a call — Belmont Residential');

form.addEventListener('submit', async e => {
  e.preventDefault();
  let ok = true;
  form.querySelectorAll('[required]').forEach(i => {
    const bad = !i.value.trim() || (i.type === 'email' && !i.checkValidity());
    i.setAttribute('aria-invalid', bad);
    if (bad) ok = false;
  });
  if (!ok) { status.textContent = 'Please add your name, firm and a valid email.'; return; }
  const d = new FormData(form);
  const v = k => (d.get(k) || '').toString().trim();
  const body = [
    `Name: ${v('name')}`, `Firm: ${v('firm')}`, `Email: ${v('email')}`,
    `Phone: ${v('phone') || '—'}`, `Interested in: ${v('intent')}`, `Message: ${v('message') || '—'}`,
  ].join('\n');

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = 'Sending…';
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `Belmont inquiry — ${v('firm')} (${v('intent')})`,
        _template: 'table',
        _captcha: 'false',
        _replyto: v('email'),
        _honey: v('_honey'),
        Name: v('name'),
        Firm: v('firm'),
        Email: v('email'),
        Phone: v('phone') || '—',
        'Interested in': v('intent'),
        Message: v('message') || '—',
      }),
    });
    const out = await res.json();
    if (String(out.success) !== 'true') throw new Error(out.message);
    form.reset();
    status.textContent = "Thanks — we'll be in touch.";
  } catch {
    // Fall back to a pre-filled email so the request isn't lost.
    status.innerHTML = `Something went wrong. <a href="${mailto(`Belmont inquiry — ${v('firm')}`, body)}">Send it by email instead</a>.`;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('[data-year]').textContent = new Date().getFullYear();
