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

// ---------- Reveal on scroll ----------
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal, .meet, .timeline').forEach(el => io.observe(el));

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

// ---------- Smooth, eased scrolling for in-page links ----------
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let scrollAnim;
function glideTo(y) {
  cancelAnimationFrame(scrollAnim);
  const start = window.scrollY, dist = y - start;
  const dur = Math.min(1400, Math.max(600, Math.abs(dist) * 0.35));
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    window.scrollTo(0, start + dist * easeInOut(p));
    if (p < 1) scrollAnim = requestAnimationFrame(step);
  };
  scrollAnim = requestAnimationFrame(step);
}
// Stop the glide if the visitor scrolls themselves.
['wheel', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, () => cancelAnimationFrame(scrollAnim), { passive: true }));

document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || reduceMotion) return;
  const id = a.getAttribute('href');
  if (id === '#') return;
  const target = id === '#top' ? document.body : document.querySelector(id);
  if (!target) return;
  e.preventDefault();
  // Land just under the menu bar as it sits once scrolled (the blue banner collapses on scroll).
  const pill = nav.querySelector('.nav-pill');
  const offset = id === '#top' ? 0 : pill.offsetHeight + parseFloat(getComputedStyle(pill).marginTop);
  glideTo(Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset));
  history.pushState(null, '', id);
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
