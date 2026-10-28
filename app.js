(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- nyelvváltó: magyar mindig látszik, a zászlók az EN / 中文 sorokat kapcsolják ---------- */
  const LS_KEY = 'szelma-lang';
  const langs = { en: false, zh: false };
  try { Object.assign(langs, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch { /* nincs tárhely, nem baj */ }

  function applyLangs() {
    document.body.classList.toggle('show-en', !!langs.en);
    document.body.classList.toggle('show-zh', !!langs.zh);
    document.querySelectorAll('.lang').forEach((b) => b.setAttribute('aria-pressed', String(!!langs[b.dataset.lang])));
    try { localStorage.setItem(LS_KEY, JSON.stringify({ en: !!langs.en, zh: !!langs.zh })); } catch { /* ok */ }
  }
  document.querySelectorAll('.lang').forEach((b) => b.addEventListener('click', () => {
    langs[b.dataset.lang] = !langs[b.dataset.lang];
    applyLangs();
  }));
  applyLangs();

  /* ---------- holnap dátuma ---------- */
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const huDay = new Intl.DateTimeFormat('hu-HU', { weekday: 'long' }).format(tomorrow);
  const huMd = new Intl.DateTimeFormat('hu-HU', { month: 'long', day: 'numeric' }).format(tomorrow);
  const D = {
    hu: `${cap(huDay)}, ${huMd}`,
    en: new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(tomorrow),
    zh: new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(tomorrow),
  };
  document.querySelectorAll('[data-date]').forEach((el) => {
    const k = el.dataset.date;
    el.textContent = el.classList.contains('en') || el.classList.contains('zh') ? ` · ${D[k]}` : D[k];
  });
  // a .mini-n belüli dátum nem kap elválasztót, azt a .mini CSS rakja
  document.querySelectorAll('.mini [data-date]').forEach((el) => { el.textContent = D[el.dataset.date]; });

  /* ---------- háromnyelvű szövegek ---------- */
  const T = {
    nope: [
      { hu: 'Hoppá, a kártya visszajött. Szelma nem adja fel 😏', en: 'Oops, the card came back. Szelma never gives up.', zh: '哎呀，卡片又飞回来了。Szelma 绝不放弃。' },
      { hu: 'A balra húzás technikai hiba volt. Biztos.', en: 'Swiping left was a technical error. Surely.', zh: '向左滑是技术故障。肯定是。' },
      { hu: 'Bumeráng-kártya. Nem lehet eldobni 🪃', en: 'Boomerang card. Cannot be thrown away.', zh: '回旋镖卡片，扔不掉。' },
      { hu: 'Jó, jó, de a bor már le van hűtve.', en: 'Fine, fine, but the wine is already chilled.', zh: '好吧好吧，可是酒已经冰好了。' },
    ],
    like: [
      { hu: 'Jó irány! 🥂', en: 'Good direction!', zh: '方向正确！' },
      { hu: 'Még egy, és már csak a bor hiányzik.', en: 'One more, and only the wine is missing.', zh: '再来一张，就只差酒了。' },
    ],
    foot: { hu: 'Figyelem: a koccintás nem helyettesíti a szemkontaktust.', en: 'Warning: clinking does not replace eye contact.', zh: '提醒：碰杯不能代替眼神交流。' },
    toastCopy: { hu: 'Üzenet kimásolva 💬', en: 'Message copied', zh: '消息已复制' },
    toastFail: { hu: 'Nem sikerült másolni, jelöld ki kézzel', en: 'Copy failed, select it by hand', zh: '复制失败，请手动选择' },
  };

  // egy elem tartalmát három sorra tölti: magyar + EN + 中文 (mindig textContent, nincs innerHTML)
  function fill(el, t) {
    el.replaceChildren();
    const hu = document.createElement('span');
    hu.className = 'hu';
    hu.textContent = t.hu;
    el.append(hu);
    for (const lang of ['en', 'zh']) {
      const s = document.createElement('span');
      s.className = `tr ${lang}`;
      s.textContent = t[lang];
      el.append(s);
    }
  }
  fill($('#mfoot'), T.foot);

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(t, ms = 2600) {
    const el = $('#toast');
    el.replaceChildren();
    const hu = document.createElement('div');
    hu.textContent = t.hu;
    el.append(hu);
    for (const lang of ['en', 'zh']) {
      const s = document.createElement('div');
      s.className = lang;
      s.style.opacity = '.8';
      s.style.fontSize = '.8rem';
      s.textContent = t[lang];
      el.append(s);
    }
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
  let rights = 0;

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
    rights++;
    setTimeout(() => {
      idx++;
      if (idx >= cards.length) { showMatch(); busy = false; return; }
      layout();
      toast(T.like[idx % T.like.length], 1500);
      busy = false;
    }, FLY - 30);
  }

  function nope() {
    if (busy) return;
    busy = true;
    const c = cards[idx];
    stamp(c, 'nope').style.opacity = '1';
    fly(c, -130, 10, -28);
    toast(T.nope[lefts % T.nope.length], 3000);
    lefts++;
    // bumeráng: a másik oldalról repül vissza
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
    idx = 0; lefts = 0; rights = 0; busy = false;
    cards.forEach(resetCard);
    layout();
  });

  $('#btnShare').addEventListener('click', async () => {
    const where = 'Time Out Market Budapest, Blaha Lujza tér 1.';
    const msg = [
      `Match! 🥂 Holnap (${D.hu}) 19:00, ${where}. Pohár bor koccintás, sok nevetés. Ott leszek, Szelma!`,
      `EN: It's a match! Tomorrow (${D.en}) 19:00, ${where}. A glass of wine, a clink, lots of laughs. See you there, Szelma!`,
      `中文：配对成功！明天（${D.zh}）19:00，${where}。一杯红酒，碰个杯，多多欢笑。到时见，Szelma！`,
    ].join('\n');
    if (navigator.share) {
      try { await navigator.share({ text: msg }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(msg); toast(T.toastCopy); } catch { toast(T.toastFail); }
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
