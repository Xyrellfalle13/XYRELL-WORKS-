/* ---------- Settings: change these ---------- */
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'xyrell2026';

const $ = id => document.getElementById(id);
const body = document.body;

/* ---------- Storage (IndexedDB: keeps works after refresh in this browser) ---------- */
let db = null;
const openDB = () => new Promise((res, rej) => {
  const r = indexedDB.open('xp-portfolio', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('works', { keyPath: 'id' }); r.result.createObjectStore('meta'); };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const run = (store, mode, fn) => new Promise((res, rej) => {
  if (!db) return res(null);
  const t = db.transaction(store, mode), s = t.objectStore(store), q = fn(s);
  t.oncomplete = () => res(q ? q.result : null);
  t.onerror = () => rej(t.error);
});

/* ---------- Admin / viewer modes ---------- */
const isAdmin = () => { try { return sessionStorage.getItem('xp-admin') === '1'; } catch (e) { return body.classList.contains('admin'); } };
function setAdmin(on) {
  try { sessionStorage.setItem('xp-admin', on ? '1' : '0'); } catch (e) {}
  body.classList.toggle('admin', on);
  if (!on) body.classList.remove('preview');
  $('loginBtn').style.display = on ? 'none' : '';
  $('phHint').innerHTML = on ? '<br>Tap to change photo' : '';
  updateMode();
}
function updateMode() {
  const p = body.classList.contains('preview');
  $('modeLabel').textContent = p ? 'Viewer preview: this is what visitors see' : 'Admin view';
  $('previewBtn').textContent = p ? 'Back to admin view' : 'Preview as viewer';
}
$('previewBtn').onclick = () => { body.classList.toggle('preview'); updateMode(); };
$('logoutBtn').onclick = () => setAdmin(false);

const dlg = $('loginDlg');
$('loginBtn').onclick = () => { $('lMsg').textContent = ''; dlg.showModal(); $('lUser').focus(); };
$('lCancel').onclick = () => dlg.close();
$('loginForm').onsubmit = e => {
  e.preventDefault();
  if ($('lUser').value.trim() === ADMIN_USER && $('lPass').value === ADMIN_PASS) {
    dlg.close(); $('loginForm').reset(); setAdmin(true);
    $('upload').scrollIntoView();
  } else { $('lMsg').textContent = 'Wrong username or password. Try again.'; }
};

/* ---------- Profile photo ---------- */
const photoInput = $('photoInput');
function showPhoto(blob) {
  const i = $('photoImg'); i.src = URL.createObjectURL(blob); i.style.display = 'block'; $('photoPh').style.display = 'none';
}
$('photoBox').onclick = () => { if (isAdmin() && !body.classList.contains('preview')) photoInput.click(); };
photoInput.onchange = async () => {
  const f = photoInput.files[0]; if (!f) return;
  showPhoto(f);
  try { await run('meta', 'readwrite', s => s.put(f, 'photo')); } catch (e) {}
};

/* ---------- Works gallery ---------- */
const gallery = $('gallery'), empty = $('empty'), msg = $('msg');
const MAX = 50 * 1024 * 1024;
function refreshStats() {
  const n = gallery.querySelectorAll('.work').length;
  $('stats').textContent = n + (n === 1 ? ' work' : ' works') + ' in your gallery. Upload more images, videos, or PDFs below.';
  if (!n) gallery.append(empty); else empty.remove();
}
const STATIC_WORKS = [
  { src: 'images/img1.jpg', images: ['images/trafficadvisory/img1.jpg', 'images/trafficadvisory/img3.jpg','images/trafficadvisory/img4.jpg'], title: 'Traffic Advisory', cat: 'Traffic Management Bureau', desc: 'Facebook graphics for the Muntinlupa Traffic Management Bureau.' },
  { src: 'images/img2.jpg',  title: 'Independence day', cat: 'Traffic Management Bureau', desc: 'Holiday greetings.' },
  {src: 'images/payonline/coverpage.jpg', images: ['images/payonline/coverpage.jpg','images/payonline/step1.jpg','images//payonline/step2.jpg','images/payonline/step3.jpg','images/payonline/step4.jpg'], title: 'How to Pay Online', cat: 'Traffic Management Bureau', desc: 'Step-by-step guide posts for online payment.' },
  { src: 'images/holiday/laborday.jpg',  title: 'Holiday greetings', cat: 'Traffic Management Bureau', desc: 'Labor Day' },
  { src: 'images/work-8.jpg', images: ['images/prohibited/img.jpg', 'images/prohibited/img1.jpg','images/prohibited/img2.jpg'], title: 'Stricktly Prohibited', cat: 'Traffic Management Bureau', desc: 'No parking, No helmet, No counterflow posts.' },
  { src: 'images/holiday/arawngk.jpg',  title: 'Holiday greetings', cat: 'Traffic Management Bureau', desc: 'Araw ng Kagitingan.' },
  { src: 'images/holiday/employee.jpg',  title: 'Holiday greetings', cat: 'Traffic Management Bureau', desc: 'Employee Appreciation Day.' },
  { src: 'images/work-8.jpg', images: ['images/holyweek/img1.jpg', 'images/holyweek/img2.jpg','images/holyweek/img3.jpg'], title: 'Holy Week series', cat: 'Traffic Management Bureau', desc: 'Maundy Thursday, Good Friday, and Easter Sunday posts.' },
  { src: 'images/work-9.jpg', images: ['images/trafficupdate/img1.jpg', 'images/trafficupdate/img2.jpg'], title: 'Traffic Update', cat: 'Traffic Management Bureau', desc: 'Northbound and southbound traffic status tables.' },
  { src: 'images/work-9.jpg', images: ['images/pyc/img.jpg', 'images/pyc/img1.jpg','images/pyc/img2.jpg'], title: 'Facebook Posting', cat: 'Poblacion Youth Council', desc: 'Oath taking, Team buildingand Lakbay alalay' },
  { src: 'images/work-14.jpg', images: ['images/adis/img.jpg', 'images/adis/img2.jpg'], title: "Adi's Snack Corners", cat: 'Business Branding', desc: 'Logo and menu board layout.' },
  { src: 'images/work-14.jpg', images: ['images/others/img1.jpg'], title: "University Student Council", cat: 'Student council', desc: 'Logo' }

];
/* ---------- Categories: add or rename them HERE (one place) ---------- */
const CATEGORIES = [
  'Traffic Management Bureau',
  'Poblacion Youth Council',
  'Business Branding',
  'Student Council',
  'Other'            // keep "Other" last
];
let activeCat = 'All';
function applyFilter() {
  gallery.querySelectorAll('.work').forEach(c => { c.hidden = !(activeCat === 'All' || c.dataset.cat === activeCat); });
}
function buildChips() {
  const cats = ['All', ...CATEGORIES];
  $('wCat').innerHTML = ''; CATEGORIES.forEach(c => $('wCat').append(new Option(c, c)));
  const box = $('chips'); box.innerHTML = '';
  cats.forEach(c => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c;
    b.setAttribute('aria-pressed', String(c === activeCat));
    b.onclick = () => { activeCat = c; box.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); applyFilter(); };
    box.append(b);
  });
}
/* Lightbox (with prev/next when a work has several images) */
const lb = { urls: [], i: 0, alt: '' };
function lbShow() {
  $('lbImg').src = lb.urls[lb.i]; $('lbImg').alt = lb.alt + (lb.urls.length > 1 ? ' (' + (lb.i + 1) + ' of ' + lb.urls.length + ')' : '');
  $('lbPrev').hidden = $('lbNext').hidden = lb.urls.length < 2;
}
function lbStep(d) { lb.i = (lb.i + d + lb.urls.length) % lb.urls.length; lbShow(); }
function openLightbox(urls, i, alt) { lb.urls = urls; lb.i = i; lb.alt = alt; lbShow(); $('lightbox').showModal(); }
$('lbClose').onclick = () => $('lightbox').close();
$('lbPrev').onclick = () => lbStep(-1);
$('lbNext').onclick = () => lbStep(1);
$('lightbox').onclick = e => { if (e.target.id === 'lightbox') $('lightbox').close(); };
$('lightbox').onkeydown = e => { if (e.key === 'ArrowLeft') lbStep(-1); if (e.key === 'ArrowRight') lbStep(1); };

/* Carousel: one per work. Native scroll-snap, so touch swipe works. */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function mk(tag, cls, txt) { const n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; }
function buildCarousel(th, urls, fallback, title) {
  th.classList.add('carousel');
  const track = mk('div', 'track'); track.tabIndex = 0;
  track.setAttribute('role', 'group'); track.setAttribute('aria-roledescription', 'carousel'); track.setAttribute('aria-label', title + ' images');
  const prev = mk('button', 'cbtn prev', '‹'), next = mk('button', 'cbtn next', '›');
  prev.type = next.type = 'button'; prev.setAttribute('aria-label', 'Previous image'); next.setAttribute('aria-label', 'Next image');
  const dots = mk('div', 'dots'), count = mk('div', 'count');
  count.setAttribute('aria-live', 'polite');
  th.append(track, prev, next, dots, count);
  let usedFallback = false;
  const cur = () => Math.round(track.scrollLeft / (track.clientWidth || 1));
  const go = i => track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
  function sync() {
    const slides = [...track.children], n = slides.length, i = Math.min(cur(), Math.max(n - 1, 0));
    slides.forEach((s, k) => { s.querySelector('img').alt = title + (n > 1 ? ' – image ' + (k + 1) + ' of ' + n : ''); });
    if (dots.children.length !== n) {
      dots.innerHTML = '';
      for (let k = 0; k < n; k++) { const d = mk('button', 'dot'); d.type = 'button'; d.setAttribute('aria-label', 'Go to image ' + (k + 1)); d.onclick = () => go(k); dots.append(d); }
    }
    [...dots.children].forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    count.textContent = (i + 1) + ' / ' + n;
    th.classList.toggle('single', n < 2);
    prev.disabled = i === 0; next.disabled = i >= n - 1;
  }
  function addSlide(u) {
    const s = mk('div', 'slide'), im = mk('img');
    im.src = u; im.loading = 'lazy'; im.alt = title;
    s.style.setProperty('--bg', 'url(' + JSON.stringify(u) + ')');
    im.onerror = () => {
      s.remove();
      if (!track.children.length && fallback && !usedFallback) { usedFallback = true; addSlide(fallback); }
      sync();
    };
    s.onclick = () => { const all = [...track.querySelectorAll('img')]; openLightbox(all.map(x => x.src), all.indexOf(im), title); };
    s.append(im); track.append(s); sync();
  }
  prev.onclick = () => go(cur() - 1); next.onclick = () => go(cur() + 1);
  track.onscroll = sync;
  track.onkeydown = e => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur() - 1); } if (e.key === 'ArrowRight') { e.preventDefault(); go(cur() + 1); } };
  urls.forEach(addSlide);
  if (!urls.length && fallback) { usedFallback = true; addSlide(fallback); }
}

function addCard(w) {
  const blobs = w.blobs || (w.blob ? [w.blob] : []);
  const urls = w.images ? w.images.slice() : blobs.map(b => URL.createObjectURL(b));
  const isImage = !!(w.images || w.src || (w.type || '').startsWith('image/'));
  const card = document.createElement('article'); card.className = 'work'; card.dataset.cat = w.cat;
  const th = document.createElement('div'); th.className = 'thumb';
  if (isImage) { buildCarousel(th, urls, w.src, w.title); }
  else if (w.type.startsWith('video/')) { const v = document.createElement('video'); v.src = urls[0]; v.controls = true; th.append(v); }
  else { const a = document.createElement('a'); a.className = 'file'; a.href = urls[0]; a.target = '_blank'; a.textContent = w.name.split('.').pop().toUpperCase(); th.append(a); }
  const info = document.createElement('div'); info.className = 'info';
  const h = document.createElement('h3'); h.textContent = w.title;
  const p = document.createElement('p'); p.textContent = w.cat + (w.desc ? ' – ' + w.desc : '');
  info.append(h, p);
  if (blobs.length) {
    const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'rm'; rm.textContent = 'Remove';
    rm.onclick = async () => {
      if (!confirm('Remove "' + w.title + '" from your gallery?')) return;
      try { await run('works', 'readwrite', s => s.delete(w.id)); } catch (e) {}
      card.remove(); urls.forEach(u => URL.revokeObjectURL(u)); refreshStats();
    };
    info.append(rm);
  }
  card.append(th, info); gallery.append(card); applyFilter();
}

$('uploadForm').onsubmit = async e => {
  e.preventDefault();
  if (!isAdmin()) return;
  const files = [...$('files').files], title = $('wTitle').value.trim(), cat = $('wCat').value, desc = $('wDesc').value.trim();
  let added = 0, skipped = 0;
  const ok = files.filter(f => f.size <= MAX); skipped = files.length - ok.length;
  const images = ok.filter(f => f.type.startsWith('image/'));
  if ($('wGroup').checked && images.length > 1) {
    const w = { id: Date.now() + '-g', title: title || images[0].name, cat, desc, type: 'image/', name: images[0].name, blobs: images };
    try { await run('works', 'readwrite', s => s.put(w)); } catch (err) {}
    addCard(w); added = images.length;
    for (const [i, f] of ok.filter(f => !f.type.startsWith('image/')).entries()) {
      const v = { id: Date.now() + '-v' + i, title: f.name, cat, desc, type: f.type, name: f.name, blob: f };
      try { await run('works', 'readwrite', s => s.put(v)); } catch (err) {}
      addCard(v); added++;
    }
  } else {
    for (const [i, f] of ok.entries()) {
      const w = { id: Date.now() + '-' + i, title: (title ? title + (files.length > 1 ? ' ' + (i + 1) : '') : f.name), cat, desc, type: f.type, name: f.name, blob: f };
      try { await run('works', 'readwrite', s => s.put(w)); } catch (err) {}
      addCard(w); added++;
    }
  }
  refreshStats();
  msg.className = 'msg' + (added ? '' : ' err');
  msg.textContent = added ? added + ' added to the gallery.' + (skipped ? ' ' + skipped + ' skipped (over 50 MB).' : '') : 'Nothing added. Files must be under 50 MB.';
  if (added) { e.target.reset(); $('works').scrollIntoView(); }
};

/* ---------- Start ---------- */
buildChips();
STATIC_WORKS.forEach(addCard);
(async () => {
  try {
    db = await openDB();
    const photo = await run('meta', 'readonly', s => s.get('photo'));
    if (photo) showPhoto(photo);
    const list = await run('works', 'readonly', s => s.getAll());
    (list || []).sort((a, b) => a.id.localeCompare(b.id)).forEach(addCard);
  } catch (e) { db = null; }
  setAdmin(isAdmin());
  refreshStats();
})();
