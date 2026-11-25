// app.js
import {loadRemote, initAdmin, submitListing} from './firebase.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let lang = 'bn'; try { lang = localStorage.getItem('lang') === 'en' ? 'en' : 'bn'; } catch {}
const L = (b, e) => lang === 'bn' ? b : e;
const nf = n => (+n || 0).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US', {maximumFractionDigits:0});
const tk = n => '৳' + nf(n);
const num = p => { const d = String(p||'').replace(/\D/g,''); return d ? (d.startsWith('880') ? d : '880' + d.replace(/^0/,'')) : ''; };
const tel = p => 'tel:+' + num(p), wa = p => num(p) ? 'https://wa.me/' + num(p) : '';
const dir = s => `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
const safeImg = u => /^https:\/\//.test(u||'') ? esc(u) : '';
function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2200); }

const I18N = {
  nav_bikes:['বাইক','Bikes'], nav_map:['ম্যাপ','Map'], nav_show:['শোরুম','Showrooms'], brands:['ব্র্যান্ড','Brands'],
  badge:['🌿 সব ব্র্যান্ড • সব শোরুম • এক জায়গায়','🌿 All Brands • All Showrooms • One Place'],
  h1:['বাংলাদেশের সব <span class="hl">ইভি বাইক</span><br>শোরুম ও ম্যাপসহ','All <span class="hl">Electric Bikes</span> in Bangladesh<br>with Showrooms & Maps'],
  lead:['দাম ও রেঞ্জ দেখুন — শোরুমের ঠিকানা, ফোন, WhatsApp ও ডিরেকশন পান এক জায়গায়।','Check prices and range — get showroom addresses, phones, WhatsApp and directions in one place.'],
  ph:['ব্র্যান্ড বা মডেল — যেমন Yadea, TAILG…','Brand or model — e.g. Yadea, TAILG…'],
  eb_bikes:['সব মডেল • সব দাম','All Models • All Prices'], t_bikes:['আপনার বাজেটে সেরা ইভি বাইক','The Best EV Bike for Your Budget'],
  lbl_brand:['ব্র্যান্ড','Brand'], lbl_price:['দাম','Price'], lbl_type:['ধরন','Type'], eb_map:['লাইভ ম্যাপ','Live Map'],
  banner:['🎯 আপনার অবস্থান থেকে কাছের শোরুম আগে দেখানো হচ্ছে','🎯 Showing showrooms nearest to you first'],
  eb_show:['ঠিকানা • ফোন • WhatsApp • Direction','Address • Phone • WhatsApp • Direction'],
  t_show:['কাছের শোরুমে টেস্ট রাইড নিন','Take a Test Ride at a Showroom Near You'], more:['আরো দেখুন','Show more']
};
function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i]').forEach(el => { const v = I18N[el.dataset.i][lang==='bn'?0:1]; el.hasAttribute('data-html') || /<|&/.test(v) ? el.innerHTML = v : el.textContent = v; });
  document.querySelectorAll('[data-ip]').forEach(el => el.placeholder = I18N[el.dataset.ip][lang==='bn'?0:1]);
  $('langBtn').textContent = L('English','বাংলা');
  renderAll();
}

const merge = (base, rem) => { const m = new Map(base.map(b => [b.id, b])); rem.forEach(r => m.set(r.id, {...m.get(r.id), ...r})); return [...m.values()].filter(b => !b.deleted); };
let bikes = BIKES.slice(), showrooms = SHOWROOMS.slice();
const st = {brand:'all', price:'all', type:'all', div:'all', q:'', limit:24, loc:null};
const PRICES = [['all','সব দাম','Any price'],['u1','১ লাখের নিচে','Under 1 lakh'],['m','১–১.৫ লাখ','1–1.5 lakh'],['o','১.৫ লাখ+','1.5 lakh+']];
const TYPES = [['all','সব ধরন','All types'],['Scooter','স্কুটার','Scooter'],['Sport','স্পোর্ট','Sport'],['Motorcycle','মোটরসাইকেল','Motorcycle']];
const typeName = t => { const x = TYPES.find(y => y[0]===t); return x ? L(x[1],x[2]) : t; };
const priceOk = p => st.price==='all' || (st.price==='u1'&&p<100000) || (st.price==='m'&&p>=100000&&p<=150000) || (st.price==='o'&&p>150000);

const chip = (act, v, label, on) => `<button class="chip ${on?'active':''}" data-act="${act}" data-v="${esc(v)}">${esc(label)}</button>`;
function renderChips(){
  const brands = ['all', ...new Set(bikes.map(b=>b.brand))].sort((a,b)=>a==='all'?-1:a.localeCompare(b));
  $('brandChips').innerHTML = brands.map(b=>chip('brand',b,b==='all'?L('সব ব্র্যান্ড','All brands'):b,st.brand===b)).join('');
  $('priceChips').innerHTML = PRICES.map(([v,b,e])=>chip('price',v,L(b,e),st.price===v)).join('');
  $('typeChips').innerHTML = TYPES.filter(([v])=>v==='all'||bikes.some(b=>b.type===v)).map(([v,b,e])=>chip('type',v,L(b,e),st.type===v)).join('');
  const divs = ['all', ...new Set(showrooms.map(s=>s.division).filter(Boolean))].sort((a,b)=>a==='all'?-1:a.localeCompare(b));
  $('divChips').innerHTML = divs.map(d=>chip('div',d,d==='all'?L('সব বিভাগ','All divisions'):d,st.div===d)).join('');
}
function renderBikes(){
  const q = st.q.toLowerCase();
  const list = bikes.filter(b => (st.brand==='all'||b.brand===st.brand) && (st.type==='all'||b.type===st.type) && priceOk(b.price) && (!q || `${b.brand} ${b.name}`.toLowerCase().includes(q))).sort((a,b)=>a.price-b.price);
  $('resultCount').textContent = nf(list.length) + L('টি মডেল',' models');
  $('bikeGrid').innerHTML = list.length ? list.map(b => `<article class="bike-card">
    <div class="thumb" data-act="open" data-v="${esc(b.id)}">${safeImg(b.image)?`<img src="${safeImg(b.image)}" alt="${esc(b.name)}" loading="lazy">`:'🏍️'}<span class="range-badge">${nf(b.range)} ${L('কিমি','km')}</span></div>
    <div class="body"><div class="brandline">${esc(b.brand)}</div><h3>${esc(b.name)}</h3>
      <div class="price"><small>${L('আনুমানিক দাম','Est. price')}</small>${tk(b.price)}</div>
      <div class="spec-row"><div><b>${nf(b.range)} ${L('কিমি','km')}</b><small>${L('রেঞ্জ','Range')}</small></div><div><b>${nf(b.speed)}</b><small>${L('টপ স্পিড','Top speed')}</small></div><div><b>${nf(b.motor)}W</b><small>${L('মোটর','Motor')}</small></div></div>
      <div class="btns"><button class="btn-primary" data-act="open" data-v="${esc(b.id)}">${L('বিস্তারিত','Details')}</button></div></div></article>`).join('')
    : `<div class="empty" style="grid-column:1/-1">${L('কোনো মডেল মেলেনি। ফিল্টার বদলে দেখুন।','No models found. Try changing filters.')}</div>`;
}
const srCard = s => `<article class="sr-card ${s._d!=null&&s._d<15?'near':''}">
  <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="brand-tag">${esc(s.brand)} • ${esc(s.division)}</span>${s.verified?`<span class="brand-tag ok">✓ ${L('যাচাইকৃত','Verified')}</span>`:''}</div>
  <h3>${esc(s.name)}</h3><div class="sr-area">${esc(s.area)} ${s._d!=null?`<span class="dist">≈ ${s._d.toFixed(1)} ${L('কিমি','km')}</span>`:''}</div>
  <div class="sr-line"><i>📍</i><span>${esc(s.address)}</span></div>
  ${s.phone?`<div class="sr-line"><i>📞</i><a href="${tel(s.phone)}">${esc(s.phone)}</a></div>`:''}
  <div class="sr-actions"><a class="dir" href="${dir(s)}" target="_blank" rel="noopener">🧭 Direction</a>${s.phone?`<a class="call" href="${tel(s.phone)}">📞 ${L('কল','Call')}</a>`:''}${wa(s.phone)?`<a class="wa" href="${wa(s.phone)}" target="_blank" rel="noopener">💬 WhatsApp</a>`:''}</div></article>`;
const dist = (a,b,c,d) => { const r=x=>x*Math.PI/180, h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2; return 12742*Math.asin(Math.sqrt(h)); };

const brandColor = b => { let h = 0; for(const c of b) h = (h*31 + c.charCodeAt(0)) % 360; return `hsl(${h} 65% 38%)`; };
const initials = b => b.replace(/[^A-Za-z0-9 ]/g,'').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';
function pinIcon(s){
  const logo = typeof BRAND_LOGOS !== 'undefined' && BRAND_LOGOS[s.brand], ini = esc(initials(s.brand));
  const inner = logo ? `<img src="${esc(logo)}" alt="" onerror="this.replaceWith(document.createTextNode('${ini}'))">` : ini;
  const z = logo ? 40 : 30;
  return L_.divIcon({className:'ev-pin', html:`<span class="dot ${logo?'lg':''}" style="background:${brandColor(s.brand)}">${inner}</span><span class="lbl">${esc(s.brand)}</span>`, iconSize:[z,z], iconAnchor:[z/2,z/2], popupAnchor:[0,-z/2]});
}

let map, layer;
function renderShowrooms(){
  let l = showrooms.filter(s => st.div==='all' || s.division===st.div);
  if(st.loc) l = l.map(s=>({...s,_d:dist(st.loc.lat,st.loc.lng,s.lat,s.lng)})).sort((a,b)=>a._d-b._d);
  $('showroomCount').textContent = nf(l.length) + L('টি শোরুম',' showrooms');
  $('showroomGrid').innerHTML = l.slice(0, st.limit).map(srCard).join('') || `<div class="empty">${L('কোনো শোরুম নেই','No showrooms')}</div>`;
  $('moreBtn').style.display = l.length > st.limit ? 'block' : 'none';
  layer.clearLayers();
  l.forEach(s => { if(isFinite(s.lat)&&isFinite(s.lng)) L_.marker([s.lat,s.lng],{icon:pinIcon(s)}).bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.address)}<br><a href="${dir(s)}" target="_blank" rel="noopener">Direction</a>${s.phone?`<a href="${tel(s.phone)}">Call</a>`:''}${wa(s.phone)?`<a href="${wa(s.phone)}" target="_blank" rel="noopener">WhatsApp</a>`:''}`).addTo(layer); });
}
function renderAll(){
  const lg = $('mapLegend'); if(lg) lg.innerHTML = [...new Set(showrooms.map(s=>s.brand))].sort().map(b=>`<span><i style="background:${brandColor(b)}"></i>${esc(b)}</span>`).join('');
  renderChips(); renderBikes(); renderShowrooms();
  $('statBikes').textContent = nf(bikes.length)+'+'; $('statBrands').textContent = nf(new Set(bikes.map(b=>b.brand)).size)+'+'; $('statShowrooms').textContent = nf(showrooms.length)+'+';
}

function openBike(id){
  const b = bikes.find(x=>x.id===id); if(!b) return;
  let l = showrooms.filter(s => s.brand.includes(b.brand) || b.brand.includes(s.brand));
  if(st.loc) l = l.map(s=>({...s,_d:dist(st.loc.lat,st.loc.lng,s.lat,s.lng)})).sort((a,c)=>a._d-c._d);
  const desc = b.desc || L(`${b.brand} ${b.name} — ${nf(b.range)} কিমি রেঞ্জ ও ${nf(b.speed)} কিমি/ঘণ্টা টপ স্পিড। শোরুমে টেস্ট রাইড নিয়ে দাম, স্টক ও ওয়ারেন্টি লিখিতভাবে নিশ্চিত করুন।`, `${b.brand} ${b.name} — ${nf(b.range)} km range and ${nf(b.speed)} km/h top speed. Take a test ride and confirm price, stock and warranty in writing.`);
  const msg = encodeURIComponent(`Hi, I want to know about ${b.brand} ${b.name}`);
  $('bikeModalBody').innerHTML = `<button class="modal-close" data-act="close">✕</button>
    ${safeImg(b.image)?`<img src="${safeImg(b.image)}" alt="${esc(b.name)}" style="border-radius:12px;margin-bottom:14px">`:''}
    <span style="color:var(--brand);font-weight:800">${esc(b.brand)} • ${esc(typeName(b.type))}</span>
    <h2 style="font-size:26px;font-weight:800">${esc(b.name)}</h2><div style="font-size:26px;font-weight:800;margin-top:6px">${tk(b.price)}</div>
    <div class="m-stats"><div><small>${L('রেঞ্জ','Range')}</small>${nf(b.range)} ${L('কিমি','km')}</div><div><small>${L('টপ স্পিড','Top speed')}</small>${nf(b.speed)}</div><div><small>${L('মোটর','Motor')}</small>${nf(b.motor)}W</div><div><small>${L('ধরন','Type')}</small>${esc(typeName(b.type))}</div></div>
    <p style="color:var(--muted);white-space:pre-line">${esc(desc)}</p>
    <div class="modal-actions"><a class="p" href="https://wa.me/8801715331303?text=${msg}" target="_blank" rel="noopener">💬 WhatsApp</a><a href="tel:+8801715331303">📞 ${L('কল করুন','Call')}</a></div>
    <h4>${esc(b.brand)} ${L('-এর শোরুম',' showrooms')} (${nf(l.length)})</h4>
    <div class="showroom-grid">${l.slice(0,6).map(srCard).join('') || `<div class="empty">${L('এই ব্র্যান্ডের শোরুম এখনো তালিকায় নেই','No showrooms listed for this brand yet')}</div>`}</div>`;
  $('bikeModal').classList.add('show'); document.body.style.overflow='hidden';
}
const closeAll = () => { document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('show')); document.body.style.overflow=''; };

function nearMe(){
  if(st.loc){ st.loc=null; $('nearBanner').classList.remove('show'); return renderShowrooms(); }
  if(!navigator.geolocation) return toast(L('এই ব্রাউজারে লোকেশন সাপোর্ট নেই','Location is not supported'));
  toast(L('অবস্থান খোঁজা হচ্ছে…','Finding your location…'));
  navigator.geolocation.getCurrentPosition(p => {
    st.loc = {lat:p.coords.latitude, lng:p.coords.longitude}; st.limit = 24;
    $('nearBanner').classList.add('show'); map.setView([st.loc.lat,st.loc.lng], 11); renderShowrooms();
    $('showrooms').scrollIntoView({behavior:'smooth'});
  }, () => toast(L('লোকেশনের অনুমতি পাওয়া যায়নি','Location permission denied')), {timeout:10000});
}

// Event Listeners
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if(!t) return;
  const a = t.dataset.act, v = t.dataset.v;
  if(a==='close'){ if(t.classList.contains('modal-overlay') && e.target!==t) return; return closeAll(); }
  if(a==='brand'||a==='price'||a==='type'){ st[a]=v; renderChips(); return renderBikes(); }
  if(a==='div'){ st.div=v; st.limit=24; renderChips(); return renderShowrooms(); }
  if(a==='more'){ st.limit+=24; return renderShowrooms(); }
  if(a==='open') return openBike(v);
  if(a==='near') return nearMe();
  if(a==='goto') return $(t.dataset.id).scrollIntoView({behavior:'smooth'});
  if(a==='lang'){ lang = lang==='bn'?'en':'bn'; try{ localStorage.setItem('lang',lang); }catch{} applyLang(); }
  if(a==='open-listing'){ $('listingModal').classList.add('show'); document.body.style.overflow='hidden'; }
});
document.addEventListener('keydown', e => { if(e.key==='Escape') closeAll(); });
$('searchInput').addEventListener('input', e => { st.q=e.target.value.trim(); renderBikes(); });
$('searchForm').addEventListener('submit', e => { e.preventDefault(); $('bikes').scrollIntoView({behavior:'smooth'}); });

// 5-click Admin Access
let clicks=0, timer; 
$('mainLogo').addEventListener('click', e => { clicks++; clearTimeout(timer); if(clicks>=5){ e.preventDefault(); clicks=0; $('adminModal').classList.add('show'); } else timer=setTimeout(()=>clicks=0,2000); });

// Listing Form Submit
$('listingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const msg = $('lsMsg');
    btn.disabled = true; msg.textContent = 'Submitting...'; msg.style.color = 'var(--muted)';
    try {
        await submitListing({
            name: $('lsName').value, brand: $('lsBrand').value, phone: $('lsPhone').value,
            address: $('lsAddress').value, area: $('lsArea').value, division: $('lsDivision').value
        });
        msg.textContent = 'Successfully submitted! Pending admin approval.'; msg.style.color = 'var(--brand)';
        e.target.reset();
        setTimeout(() => closeAll(), 3000);
    } catch (err) {
        msg.textContent = 'Error: ' + err.message; msg.style.color = 'var(--danger)';
        btn.disabled = false;
    }
});

// Init
const L_ = window.L;
$('year').textContent = new Date().getFullYear();
map = L_.map('map',{center:[23.8,90.4],zoom:7,minZoom:6,maxBounds:[[19.5,86.5],[28,94.5]],maxBoundsViscosity:.9}); L_.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map); layer = (L_.markerClusterGroup ? L_.markerClusterGroup({maxClusterRadius:50,showCoverageOnHover:false}) : L_.layerGroup()).addTo(map);
const labels = () => $('map').classList.toggle('show-labels', map.getZoom() >= 9); map.on('zoomend', labels); labels();
const refresh = async () => { const r = await loadRemote(); bikes = merge(BIKES, r.bikes); if(r.showrooms.length) showrooms = r.showrooms; renderAll(); };
initAdmin({getBikes: () => bikes, refresh});
applyLang(); refresh();
