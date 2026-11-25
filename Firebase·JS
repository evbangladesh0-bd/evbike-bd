// firebase.js — ডেটাবেস, অ্যাডমিন লগইন, বাইক এডিট ও ছবি আপলোড
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {getFirestore,collection,getDocs,doc,setDoc} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {getStorage,ref,uploadBytes,getDownloadURL} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
            apiKey: "AIzaSyB1KRjfU1QYuVN6GCNAUybmNPpE8Qd_23E",
            authDomain: "ev-bike-53505.firebaseapp.com",
            projectId: "ev-bike-53505",
            storageBucket: "ev-bike-53505.firebasestorage.app",
            messagingSenderId: "654742888648",
            appId: "1:654742888648:web:e7401469c0b5385c43c5fd"
        };
const app = initializeApp(firebaseConfig), db = getFirestore(app), auth = getAuth(app), storage = getStorage(app);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ডেটা লোড (ব্যর্থ হলে খালি — তখন data.js চলবে) */
export async function loadRemote(){
  try {
    const [b, s] = await Promise.all([getDocs(collection(db,'bikes')), getDocs(collection(db,'showrooms'))]);
    return {bikes: b.docs.map(d => ({id:d.id, ...d.data()})), showrooms: s.docs.map(d => { const x = d.data(); return {...x, lat:+x.lat, lng:+x.lng}; })};
  } catch { return {bikes:[], showrooms:[]}; }
}

/* অ্যাডমিন: লগইন + ড্যাশবোর্ড */
export function initAdmin({getBikes, refresh}){
  const dash = $('adminDash'), modal = $('adminModal');
  let editing = null;
  const say = m => { const e = $('fbMsg'); if(e) e.textContent = m; };

  const list = () => { editing = null;
    dash.innerHTML = `<h2 class="fb-title">Admin Dashboard</h2><p id="fbMsg" class="fb-msg"></p>
      <button class="btn-primary fb-btn" data-fb="new">+ New bike</button>
      ${getBikes().map(b => `<div class="fb-row"><span>${esc(b.brand)} ${esc(b.name)} — ৳${esc(b.price)}</span><button class="btn-primary" data-fb="edit" data-id="${esc(b.id)}">Edit</button></div>`).join('')}
      <button class="btn-outline fb-btn" data-fb="logout">Logout</button>`; };

  const form = b => { editing = b;
    const f = (k, label, type='text') => `<label class="fb-lbl">${label}</label><input class="admin-input" id="fb_${k}" type="${type}" value="${esc(b[k] ?? '')}">`;
    dash.innerHTML = `<h2 class="fb-title">${b.id ? 'Edit bike' : 'New bike'}</h2><p id="fbMsg" class="fb-msg"></p>
      ${f('brand','Brand')}${f('name','Model')}${f('price','Price (৳)','number')}${f('range','Range (km)','number')}${f('speed','Top speed (km/h)','number')}${f('motor','Motor (W)','number')}
      <label class="fb-lbl">Type</label><select class="admin-input" id="fb_type">${['Scooter','Sport','Motorcycle'].map(t=>`<option ${b.type===t?'selected':''}>${t}</option>`).join('')}</select>
      <label class="fb-lbl">Description</label><textarea class="admin-input" id="fb_desc" rows="4">${esc(b.desc || '')}</textarea>
      <label class="fb-lbl">Image</label>${b.image ? `<img src="${esc(b.image)}" alt="" class="fb-prev">` : ''}
      <input type="file" id="fb_file" accept="image/jpeg,image/png,image/webp" class="admin-input">
      ${f('image','…অথবা ছবির লিংক (https://)')}
      <button class="btn-primary fb-btn" data-fb="save">Save</button>
      ${b.id ? '<button class="btn-outline fb-btn" style="color:var(--danger)" data-fb="del">Delete</button>' : ''}
      <button class="btn-outline fb-btn" data-fb="cancel">Cancel</button>`; };

  async function save(){
    const g = k => $('fb_'+k).value.trim();
    const data = {brand:g('brand'), name:g('name'), price:+g('price'), range:+g('range'), speed:+g('speed'), motor:+g('motor'), type:$('fb_type').value, desc:g('desc'), image:g('image')};
    if(!data.brand || !data.name || !(data.price > 0)) return say('Brand, model ও price দিন');
    if(data.image && !/^https:\/\//.test(data.image)) return say('ছবির লিংক https:// দিয়ে শুরু হতে হবে');
    try {
      const file = $('fb_file').files[0];
      if(file){
        if(!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 2*1024*1024) return say('ছবি JPG/PNG/WebP এবং ২ MB-এর নিচে হতে হবে');
        say('ছবি আপলোড হচ্ছে…');
        const r = ref(storage, `bikes/${Date.now()}-${file.name.replace(/[^\w.-]/g,'_')}`);
        await uploadBytes(r, file); data.image = await getDownloadURL(r);
      }
      say('সেভ হচ্ছে…');
      await setDoc(doc(db,'bikes', editing.id || 'b'+Date.now()), data, {merge:true});
      await refresh(); list(); say('Saved ✓');
    } catch(e) { say('Error: ' + (e.code || e.message)); }
  }

  modal.addEventListener('click', async e => {
    const t = e.target.closest('[data-fb]'); if(!t) return;
    const a = t.dataset.fb, bike = getBikes().find(b => b.id === t.dataset.id);
    if(a === 'login'){ $('adminErr').textContent = '…'; try { await signInWithEmailAndPassword(auth, $('adminEmail').value, $('adminPass').value); $('adminErr').textContent = ''; } catch { $('adminErr').textContent = 'ভুল ইমেইল বা পাসওয়ার্ড!'; } }
    if(a === 'logout') signOut(auth);
    if(a === 'new') form({type:'Scooter'});
    if(a === 'edit' && bike) form(bike);
    if(a === 'cancel') list();
    if(a === 'save') save();
    if(a === 'del' && editing?.id && confirm('এই বাইক মুছে ফেলবেন?')){ try { await setDoc(doc(db,'bikes',editing.id), {deleted:true}, {merge:true}); await refresh(); list(); say('Deleted'); } catch(er){ say('Error: ' + (er.code||er.message)); } }
  });
  onAuthStateChanged(auth, u => { $('adminLogin').style.display = u ? 'none' : 'block'; dash.style.display = u ? 'block' : 'none'; if(u) list(); });
}
