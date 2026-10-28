(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- az időpont: csütörtök, október 29. 19:00 ---------- */
  const EVENT = new Date(2026, 9, 29);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((EVENT - today) / 86400000);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const huDay = new Intl.DateTimeFormat('hu-HU', { weekday: 'long' }).format(EVENT);
  const huMd = new Intl.DateTimeFormat('hu-HU', { month: 'long', day: 'numeric' }).format(EVENT);
  const DATE_HU = `${cap(huDay)}, ${huMd}`;
  // "ma" / "holnap" / "csütörtök" attól függően, mikor nyitják meg
  const DAY = diff === 0 ? 'Ma' : diff === 1 ? 'Holnap' : 'Csütörtök';
  const ON = diff === 0 ? 'ma' : diff === 1 ? 'holnap' : 'csütörtökön';
  document.querySelectorAll('[data-date]').forEach((el) => { el.textContent = DATE_HU; });
  document.querySelectorAll('[data-day]').forEach((el) => { el.textContent = DAY; });
  document.querySelectorAll('[data-on]').forEach((el) => { el.textContent = ON; });

  /* ---------- szövegek ---------- */
  const NOPE = [
    'Naaa, ne csináld! Látni akarlak 🥺',
    'Naaa, tényleg? Látni akarlak... 🥹',
    'Csak egy pohár bor, ígérem. Látni akarlak!',
    'Jó, jó, de a bor már le van hűtve. Látni akarlak 🍷',
  ];
  const LIKE = ['Jó irány! 🥂', 'Még egy, és már csak a bor hiányzik.'];

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(text, ms = 2600) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  /* ---------- pakli ---------- */
  const deck = $('#deck');
  const cards = [...deck.querySelectorAll('.card')];
  const counter = $('#counter');
  const FLY = reduced ? 120 : 450;
  let idx = 0;
  let busy = false;
  let lefts = 0;

  function layout() {
    cards.forEach((c, i) => {
      const p = i - idx;
      c.dataset.pos = p < 0 ? 'gone' : String(Math.min(p, 2));
    });
    counter.textContent = `${Math.min(idx + 1, cards.length)} / ${cards.length}`;
  }

  const stamp = (c, kind) => c.querySelector(`.stamp.${kind}`);
  function resetCard(c) {
    c.classList.remove('dragging');
    c.style.transition = '';
    c.style.transform = '';
    c.style.opacity = '';
    stamp(c, 'like').style.opacity = '';
    stamp(c, 'nope').style.opacity = '';
  }

  function move(c, dx, dy) {
    c.style.transform = `translate(${dx}px, ${dy * 0.4}px) rotate(${dx / 18}deg)`;
    stamp(c, 'like').style.opacity = String(Math.max(0, Math.min(1, dx / 90)));
    stamp(c, 'nope').style.opacity = String(Math.max(0, Math.min(1, -dx / 90)));
  }

  function fly(c, x, y, rot) {
    c.classList.remove('dragging');
    c.style.transition = `transform ${FLY}ms cubic-bezier(.3,.7,.2,1), opacity ${FLY}ms`;
    c.style.transform = `translate(${x}vw, ${y}px) rotate(${rot}deg)`;
    c.style.opacity = '0';
  }

  function like() {
    if (busy) return;
    busy = true;
    const c = cards[idx];
    stamp(c, 'like').style.opacity = '1';
    fly(c, 130, -30, 28);
    setTimeout(() => {
      idx++;
      if (idx >= cards.length) { showMatch(); busy = false; return; }
      layout();
      toast(LIKE[idx % LIKE.length], 1500);
      busy = false;
    }, FLY - 30);
  }

  // balra húzás: "Naaa, ne csináld, látni akarlak" – a kártya a másik oldalról visszajön
  function nope() {
    if (busy) return;
    busy = true;
    const c = cards[idx];
    stamp(c, 'nope').style.opacity = '1';
    fly(c, -130, 10, -28);
    toast(NOPE[lefts % NOPE.length], 3200);
    lefts++;
    setTimeout(() => {
      c.style.transition = 'none';
      c.style.transform = 'translate(130vw, 20px) rotate(30deg)';
      stamp(c, 'nope').style.opacity = '0';
      void c.offsetWidth;
      c.style.transition = reduced ? 'transform .1s' : 'transform .7s cubic-bezier(.2,1.25,.3,1), opacity .3s';
      c.style.opacity = '1';
      c.style.transform = '';
      setTimeout(() => { resetCard(c); busy = false; }, reduced ? 120 : 720);
    }, FLY + 350);
  }

  function superLike() {
    if (busy) return;
    busy = true;
    const c = cards[idx];
    fly(c, 0, -window.innerHeight, 0);
    setTimeout(() => { idx = cards.length; showMatch(); busy = false; }, FLY - 50);
  }

  /* húzás (pointer events: egér + érintés) */
  let drag = null;
  deck.addEventListener('pointerdown', (e) => {
    const c = cards[idx];
    if (busy || !c || !c.contains(e.target)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, c };
    c.setPointerCapture(e.pointerId);
    c.classList.add('dragging');
  });
  deck.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x;
    move(drag.c, drag.dx, e.clientY - drag.y);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { c, dx } = drag;
    drag = null;
    if (dx > 100) like();
    else if (dx < -100) nope();
    else {
      c.classList.remove('dragging');
      c.style.transform = '';
      stamp(c, 'like').style.opacity = '';
      stamp(c, 'nope').style.opacity = '';
    }
  };
  deck.addEventListener('pointerup', endDrag);
  deck.addEventListener('pointercancel', endDrag);

  $('#btnLike').addEventListener('click', like);
  $('#btnNope').addEventListener('click', nope);
  $('#btnSuper').addEventListener('click', superLike);
  document.addEventListener('keydown', (e) => {
    if ($('#match').hidden === false) return;
    if (e.key === 'ArrowRight') like();
    else if (e.key === 'ArrowLeft') nope();
    else if (e.key === 'ArrowUp') superLike();
  });

  /* ---------- match ---------- */
  const match = $('#match');
  function showMatch() {
    counter.textContent = `${cards.length} / ${cards.length}`;
    match.hidden = false;
    match.scrollTop = 0;
    match.classList.remove('show');
    void match.offsetWidth;
    match.classList.add('show');
    $('#matchTitle').focus({ preventScroll: true });
    if (!reduced) setTimeout(confetti, 450);
  }

  $('#btnAgain').addEventListener('click', () => {
    match.hidden = true;
    match.classList.remove('show');
    idx = 0; lefts = 0; busy = false;
    cards.forEach(resetCard);
    layout();
  });

  $('#btnShare').addEventListener('click', async () => {
    const msg = `Match! 🥂 ${DATE_HU} 19:00, Time Out Market Budapest, Blaha Lujza tér 1. Csak egy pohár bor, a többi a második randi 😏 Ott leszek, Salma!`;
    if (navigator.share) {
      try { await navigator.share({ text: msg }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(msg); toast('Üzenet kimásolva 💬'); } catch { toast('Nem sikerült másolni, jelöld ki kézzel'); }
  });

  /* ---------- konfetti: szívek és poharak ---------- */
  function confetti() {
    const cv = $('#confetti');
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (cv.width = innerWidth * dpr);
    const H = (cv.height = innerHeight * dpr);
    const icons = ['❤️', '🥂', '💘', '✨', '🍷', '🔥'];
    const parts = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: H + Math.random() * H * .4,
      vx: (Math.random() - .5) * 3 * dpr, vy: (-Math.random() * 9 - 7) * dpr,
      s: (18 + Math.random() * 22) * dpr, r: (Math.random() - .5) * .8, vr: (Math.random() - .5) * .08,
      e: icons[(Math.random() * icons.length) | 0],
    }));
    const t0 = performance.now();
    (function frame(now) {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += .22 * dpr; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / 4200);
        ctx.font = `${p.s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.e, 0, 0);
        ctx.restore();
      }
      if (t < 4200) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  layout();
})();
