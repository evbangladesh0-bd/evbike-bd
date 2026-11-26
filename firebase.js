// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, updateDoc, deleteDoc, addDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB1KRjfU1QYuVN6GCNAUybmNPpE8Qd_23E",
    authDomain: "ev-bike-53505.firebaseapp.com",
    projectId: "ev-bike-53505",
    storageBucket: "ev-bike-53505.firebasestorage.app",
    messagingSenderId: "654742888648",
    appId: "1:654742888648:web:e7401469c0b5385c43c5fd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ডেটা লোড
export async function loadRemote(){
    let bikes = [], showrooms = [];
    try {
        const bSnap = await getDocs(collection(db, "bikes"));
        bSnap.forEach(d => bikes.push({id: d.id, ...d.data()}));
        const sSnap = await getDocs(collection(db, "showrooms"));
        sSnap.forEach(d => showrooms.push({id: d.id, ...d.data()}));
    } catch(e) { console.log("Firebase Load Error", e); }
    return { bikes, showrooms };
}

// Listing submit (whitelisted fields only)
export async function submitListing(d) {
    const s = (k, n) => String(d[k] ?? '').trim().slice(0, n);
    return await addDoc(collection(db, "applications"), {
        name: s('name', 100), brand: s('brand', 60), phone: s('phone', 20),
        address: s('address', 200), area: s('area', 80), division: s('division', 30),
        status: 'pending', date: new Date().toISOString()
    });
}

// Admin panel
let ctx = { getBikes: () => [], refresh: async () => {} };
const $ = id => document.getElementById(id);
const content = () => $('adminContent');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function initAdmin({ getBikes, refresh }) {
    ctx = { getBikes, refresh };
    $('admLoginBtn').addEventListener('click', async () => {
        try { await signInWithEmailAndPassword(auth, $('admEmail').value, $('admPass').value); }
        catch (e) { $('admMsg').textContent = e.message; }
    });
    $('admLogoutBtn').addEventListener('click', () => signOut(auth));
    $('tabBikes').addEventListener('click', renderAdminBikes);
    $('tabRequests').addEventListener('click', renderAdminRequests);
    onAuthStateChanged(auth, user => {
        const on = !!user;
        $('adminLogin').style.display = on ? 'none' : 'block';
        $('adminPanel').style.display = on ? 'block' : 'none';
        if (on) renderAdminBikes();
    });
}

function renderAdminBikes() {
    const bikes = ctx.getBikes().slice().sort((a, b) => (a.brand + a.name).localeCompare(b.brand + b.name));
    content().innerHTML = `<button class="btn-primary fb-btn" onclick="editBike('')">+ নতুন বাইক</button>` +
        bikes.map(b => `<div class="fb-row"><span>${esc(b.brand)} ${esc(b.name)} <small>৳${esc(b.price)}</small></span>
            <button class="btn-primary" onclick="editBike('${esc(b.id)}')">Edit</button></div>`).join('');
}
window.renderAdminBikes = renderAdminBikes;

// ** নতুন আপডেট: ছবি আপলোড অপশন সহ **
window.editBike = function (id) {
    const b = ctx.getBikes().find(x => x.id === id) || { type: 'Scooter' };
    const f = (k, label, type = 'text') => `<label class="fb-lbl">${label}</label><input class="admin-input" id="eb_${k}" type="${type}" value="${esc(b[k])}">`;
    
    const imgSection = `
        <label class="fb-lbl">Image Upload</label>
        <div style="margin-bottom:10px; display:flex; gap:10px; align-items:center;">
            <input type="file" id="eb_image_file" accept="image/*" style="font-size:13px; width:100%;">
            <img id="eb_img_preview" src="${esc(b.image)}" style="height:40px; border-radius:5px; display:${b.image ? 'block' : 'none'};" onerror="this.style.display='none'">
        </div>
        <input class="admin-input" id="eb_image" type="hidden" value="${esc(b.image)}">
    `;

    content().innerHTML = `${f('brand', 'Brand')}${f('name', 'Name')}${f('price', 'Price (৳)', 'number')}${f('range', 'Range (km)', 'number')}${f('speed', 'Top speed (km/h)', 'number')}${f('motor', 'Motor (W)', 'number')}
        <label class="fb-lbl">Type</label><select class="admin-input" id="eb_type">${['Scooter', 'Sport', 'Motorcycle'].map(t => `<option ${b.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        ${imgSection}
        <label class="fb-lbl">Description</label><textarea class="admin-input" id="eb_desc" rows="3">${esc(b.desc)}</textarea>
        <button class="btn-primary fb-btn" onclick="saveBike('${esc(id)}')">Save</button>
        <button class="btn-outline fb-btn" onclick="renderAdminBikes()">Cancel</button>
        ${id ? `<button class="btn-outline fb-btn" style="color:var(--danger)" onclick="hideBike('${esc(id)}')">এই বাইক লুকান</button>` : ''}
        <p class="fb-msg" id="ebMsg"></p>`;

    $('eb_image_file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                $('eb_image').value = ev.target.result;
                const prev = $('eb_img_preview');
                prev.src = ev.target.result;
                prev.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
};

window.saveBike = async function (id) {
    const v = k => $('eb_' + k).value.trim();
    const data = { brand: v('brand'), name: v('name'), type: v('type'), image: v('image'), desc: v('desc'),
        price: Number(v('price')), range: Number(v('range')), speed: Number(v('speed')), motor: Number(v('motor')) };
    
    if (!data.brand || !data.name || !(data.price > 0)) return $('ebMsg').textContent = 'Brand, name ও price দিন';
    
    try {
        $('ebMsg').textContent = 'Saving...';
        if (id) await setDoc(doc(db, "bikes", id), data, { merge: true });
        else await addDoc(collection(db, "bikes"), data);
        await ctx.refresh(); renderAdminBikes();
    } catch (e) { $('ebMsg').textContent = 'Error: ' + e.message; }
};

window.hideBike = async function (id) {
    if (!confirm('এই বাইক সাইট থেকে লুকাবেন?')) return;
    try { await setDoc(doc(db, "bikes", id), { deleted: true }, { merge: true }); await ctx.refresh(); renderAdminBikes(); }
    catch (e) { alert('Error: ' + e.message); }
};

async function renderAdminRequests() {
    content().innerHTML = 'Loading...';
    try {
        const snap = await getDocs(collection(db, "applications"));
        let html = '';
        snap.forEach(d => {
            const x = d.data(), p = String(x.phone || '').replace(/\D/g, '');
            const w = p ? 'https://wa.me/' + (p.startsWith('880') ? p : '880' + p.replace(/^0/, '')) : '';
            html += `<div class="fb-row" style="flex-direction:column;align-items:flex-start;">
                <b>${esc(x.name)} (${esc(x.brand)})</b>
                <small>${esc(x.address)}, ${esc(x.area)}, ${esc(x.division)} - ${esc(x.phone)}</small>
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    ${w ? `<a class="btn-outline" style="padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700" href="${w}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                    <button class="btn-primary" onclick="approveReq('${esc(d.id)}')">Approve</button>
                    <button class="btn-outline" onclick="deleteReq('${esc(d.id)}')">Delete</button>
                </div></div>`;
        });
        content().innerHTML = html || 'No pending requests.';
    } catch (e) { content().innerHTML = 'Error loading requests.'; }
}

window.approveReq = async function (id) {
    try {
        const snap = await getDoc(doc(db, "applications", id));
        if (!snap.exists()) return;
        const x = snap.data();
        const ll = (prompt('Google Maps থেকে লোকেশন (lat, lng) পেস্ট করুন, যেমন 23.8103, 90.4125', '') || '').split(',').map(parseFloat);
        if (ll.length < 2 || !isFinite(ll[0]) || !isFinite(ll[1])) return alert('লোকেশন সঠিক নয়, Approve হয়নি');
        await addDoc(collection(db, "showrooms"), {
            brand: x.brand, name: x.name, area: x.area, division: x.division, phone: x.phone, address: x.address,
            lat: ll[0], lng: ll[1], verified: confirm('শোরুমটি কি যাচাই করা হয়েছে? (OK = Verified)')
        });
        await deleteDoc(doc(db, "applications", id));
        await ctx.refresh(); renderAdminRequests();
    } catch (e) { alert('Error: ' + e.message); }
};

window.deleteReq = async function (id) {
    if (!confirm('এই আবেদন বাতিল করবেন?')) return;
    try { await deleteDoc(doc(db, "applications", id)); renderAdminRequests(); }
    catch (e) { alert('Error: ' + e.message); }
};
