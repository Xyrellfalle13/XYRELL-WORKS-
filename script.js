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
  { src: 'img1.jpg',  title: 'Traffic Advisory', cat: 'Traffic Management Bureau', desc: 'Facebook graphics for the Muntinlupa Traffic Management Bureau.' },
  { src: 'img2.jpg',  title: 'Independence day', cat: 'Traffic Management Bureau', desc: 'Holiday greetings.' },
  { src: 'images/work-6.jpg',  title: 'How to Pay Online', cat: 'Traffic Management Bureau', desc: 'Step-by-step guide posts for online payment.' },
  { src: 'images/work-7.jpg',  title: 'Holiday greetings', cat: 'Traffic Management Bureau', desc: 'Labor Day, Independence Day, Araw ng Kagitingan, Employee Appreciation Day.' },
  { src: 'images/work-8.jpg',  title: 'Holy Week series', cat: 'Traffic Management Bureau', desc: 'Maundy Thursday, Good Friday, and Easter Sunday posts.' },
  { src: 'images/work-9.jpg',  title: 'Traffic Update', cat: 'Traffic Management Bureau', desc: 'Northbound and southbound traffic status tables.' },
  { src: 'images/work-10.jpg', title: 'Oath Taking and Team Building', cat: 'Poblacion Youth Council', desc: 'Event posters for the Poblacion Youth Council.' },
  { src: 'images/work-11.jpg', title: 'Semana Santa: Lakbay-Alalay 2025', cat: 'Poblacion Youth Council', desc: 'Holy Week campaign post.' },
  { src: 'images/work-14.jpg', title: "Adi's Snack Corners", cat: 'Business Branding', desc: 'Logo and menu board layout.' }
];
let activeCat = 'All';
function applyFilter() {
  gallery.querySelectorAll('.work').forEach(c => { c.hidden = !(activeCat === 'All' || c.dataset.cat === activeCat); });
}
function buildChips() {
  const cats = ['All', ...new Set(STATIC_WORKS.map(w => w.cat)), 'Other'];
  const box = $('chips'); box.innerHTML = '';
  cats.forEach(c => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = c;
    b.setAttribute('aria-pressed', String(c === activeCat));
    b.onclick = () => { activeCat = c; box.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === b))); applyFilter(); };
    box.append(b);
  });
}
function openLightbox(src, alt) { $('lbImg').src = src; $('lbImg').alt = alt; $('lightbox').showModal(); }
$('lbClose').onclick = () => $('lightbox').close();
$('lightbox').onclick = e => { if (e.target.id === 'lightbox') $('lightbox').close(); };

function addCard(w) {
  const url = w.src || URL.createObjectURL(w.blob);
  const card = document.createElement('article'); card.className = 'work'; card.dataset.cat = w.cat;
  const th = document.createElement('div'); th.className = 'thumb';
  if (w.src || w.type.startsWith('image/')) {
    const im = document.createElement('img'); im.src = url; im.alt = w.title; im.loading = 'lazy';
    th.onclick = () => openLightbox(url, w.title); th.append(im);
  } else if (w.type.startsWith('video/')) { const v = document.createElement('video'); v.src = url; v.controls = true; th.append(v); }
  else { const a = document.createElement('a'); a.className = 'file'; a.href = url; a.target = '_blank'; a.textContent = w.name.split('.').pop().toUpperCase(); th.append(a); }
  const info = document.createElement('div'); info.className = 'info';
  const h = document.createElement('h3'); h.textContent = w.title;
  const p = document.createElement('p'); p.textContent = w.cat + (w.desc ? ' – ' + w.desc : '');
  info.append(h, p);
  if (w.blob) {
    const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'rm'; rm.textContent = 'Remove';
    rm.onclick = async () => {
      if (!confirm('Remove "' + w.title + '" from your gallery?')) return;
      try { await run('works', 'readwrite', s => s.delete(w.id)); } catch (e) {}
      card.remove(); URL.revokeObjectURL(url); refreshStats();
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
  for (const [i, f] of files.entries()) {
    if (f.size > MAX) { skipped++; continue; }
    const w = { id: Date.now() + '-' + i, title: (title ? title + (files.length > 1 ? ' ' + (i + 1) : '') : f.name), cat, desc, type: f.type, name: f.name, blob: f };
    try { await run('works', 'readwrite', s => s.put(w)); } catch (err) {}
    addCard(w); added++;
  }
  refreshStats();
  msg.className = 'msg' + (added ? '' : ' err');
  msg.textContent = added ? added + ' added to the gallery.' + (skipped ? ' ' + skipped + ' skipped (over 50 MB).' : '') : 'Nothing added. Files must be under 50 MB.';
  if (added) { e.target.reset(); $('works').scrollIntoView(); }
};

/* ---------- Resume download ---------- */
$('dlResume').onclick = () => {
  const li = a => a.map(x => `<li>${x}</li>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Xyrell Poot - Resume</title>
<style>body{font-family:Calibri,Arial,sans-serif;color:#222;line-height:1.4}h1{font-size:30pt;margin:0;color:#3b1f7a}h2{font-size:13pt;color:#b0246a;border-bottom:1px solid #ccc;margin-top:18pt}p{margin:3pt 0}</style></head><body>
<h1>Xyrell Poot</h1><p><b>IT | Graphic Designer</b></p><p>Phone: 09600207218 &nbsp;|&nbsp; Email: xyrellpoot@gmail.com</p>
<h2>Objectives</h2><p>To utilize my creativity, design skills, and knowledge of modern graphic design tools to create professional and engaging visual materials that effectively communicate the organization's message and strengthen its brand identity.</p>
<h2>About me</h2><p>Graphic designer with a degree in Information Technology from Pamantasan ng Lungsod ng Muntinlupa. I combine colors, typography, images, shapes, layout, and creativity to communicate messages clearly.</p>
<h2>Education</h2><p>Bachelor of Science in Information Technology</p>
<h2>Certificate</h2><p>Professional Certificate in Graphic Design (Project Deep – Veritas University College)</p>
<h2>Achievements</h2><ul>${li(['Top 9 most outstanding student leader', 'Academic Distinction Awardee', 'Leadership Awardee 2026', "Dean's Lister", 'Top 3 most accomplished', 'Academic Excellence Awardee with Honors'])}</ul>
<h2>Skills</h2><ul>${li(['Adobe Photoshop', 'Adobe Illustrator', 'Canva', 'Microsoft PowerPoint'])}</ul>
<h2>Languages</h2><p>English, Filipino</p></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Xyrell_Poot_Resume.doc';
  document.body.append(a); a.click(); a.remove();
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
