// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ১. ফায়ারবেস কনফিগারেশন
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

// ২. ডিফল্ট ডেটা (ফায়ারবেসে ডেটা না থাকলে এগুলো দেখাবে)
let bikes = [
    { id: '1', brand: 'Yadea', name: 'Mia', price: 86500, range: 60, speed: 50, type: 'Scooter', image: '', desc: 'A stylish electric scooter perfect for city rides.' },
    { id: '2', brand: 'TAILG', name: 'Orca F50', price: 84990, range: 85, speed: 50, type: 'Scooter', image: '', desc: 'Long range and durable build.' },
    { id: '3', brand: 'Walton Takyon', name: 'Leo 12Ah', price: 49850, range: 40, speed: 45, type: 'Scooter', image: '', desc: 'Budget friendly local EV.' }
];

let showrooms = [
    { brand: 'TAILG', name: 'TAILG HQ / Edison Tejgaon', area: 'Tejgaon', division: 'Dhaka', phone: '01325-054904', address: '246, Rangs Babylonia, Tejgaon, Dhaka 1208', lat: 23.7626, lng: 90.3989, verified: true },
    { brand: 'Akij Motors', name: 'Akij Center - Tejgaon HQ', area: 'Tejgaon', division: 'Dhaka', phone: '01755-662545', address: 'AKIJ Center, 97 Shaheed Tajuddin Ahmed Sharoni, Tejgaon', lat: 23.7626, lng: 90.3989, verified: true },
    { brand: 'REVOO', name: 'Junainah EV', area: 'Madhabpur', division: 'Sylhet', phone: '01674-909665', address: '16/10 Vagdi (Dhaka Sylhet highway)', lat: 24.1000, lng: 91.5000, verified: true },
    { brand: 'Yadea', name: 'Yadea Mirpur - Bike Heaven', area: 'Mirpur', division: 'Dhaka', phone: '01711-410878', address: '357/4 South Pirerbag, Mirpur, Dhaka', lat: 23.7907, lng: 90.3659, verified: false }
];

// ৩. গ্লোবাল ভেরিয়েবল
let map, currentLang = 'en', currentEditingBikeId = null;
const bn = n => (Number(n) || 0).toLocaleString('bn-BD', { maximumFractionDigits: 0 });
const priceText = n => currentLang === 'en' ? '৳' + n : '৳' + bn(n);

// ৪. ভাষা পরিবর্তন (EN / BN)
window.toggleLanguage = function() {
    currentLang = currentLang === 'en' ? 'bn' : 'en';
    document.getElementById('langText').textContent = currentLang === 'en' ? 'বাংলা' : 'English';
    
    // সব ডেটা-en এবং ডেটা-bn অ্যাট্রিবিউট আপডেট করা
    document.querySelectorAll('[data-en]').forEach(el => {
        el.innerHTML = el.getAttribute(`data-${currentLang}`);
    });
    
    // ডাইনামিক ডেটা রি-রেন্ডার
    renderBikes();
    renderShowrooms();
};

window.goTo = function(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

// ৫. বাইক রেন্ডার
window.renderBikes = function() {
    const grid = document.getElementById('bikeGrid');
    if(!grid) return;
    
    document.getElementById('resultCount').textContent = currentLang === 'en' ? `${bikes.length} Models` : `${bn(bikes.length)}টি মডেল`;
    
    grid.innerHTML = bikes.map(b => `
        <article class="bike-card">
            <div class="thumb" onclick="openBikeModal('${b.id}')">
                ${b.image ? `<img src="${b.image}" alt="${b.name}">` : '🏍️'}
            </div>
            <div class="body">
                <div class="brandline">${b.brand}</div>
                <h3>${b.name}</h3>
                <div class="price"><small>${currentLang === 'en' ? 'Est. Price' : 'আনুমানিক দাম'}</small>${priceText(b.price)}</div>
                <div class="btns">
                    <button class="btn-primary" onclick="openBikeModal('${b.id}')">${currentLang === 'en' ? 'View Details' : 'বিস্তারিত'}</button>
                </div>
            </div>
        </article>
    `).join('');
    
    document.getElementById('statBikes').textContent = bikes.length + '+';
};

// ৬. বাইকের বিস্তারিত মডাল (ছবিতে ক্লিক করলে)
window.openBikeModal = function(id) {
    const bike = bikes.find(b => b.id === id);
    if(!bike) return;
    
    const modalBody = document.getElementById('bikeModalBody');
    modalBody.innerHTML = `
        <div style="height: 250px; background: #0b3c21; border-radius: 12px; margin-bottom: 20px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            ${bike.image ? `<img src="${bike.image}" style="width:100%; height:100%; object-fit:contain;">` : '<span style="font-size:80px;">🏍️</span>'}
        </div>
        <span style="color: var(--brand); font-weight:800; font-size:14px;">${bike.brand}</span>
        <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 10px;">${bike.name}</h2>
        <div style="font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 20px;">${priceText(bike.price)}</div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px;">
            <div style="background:var(--surface-2); padding:10px; border-radius:8px; text-align:center;">
                <small style="color:var(--muted); display:block;">Range</small>
                <b>${bike.range} km</b>
            </div>
            <div style="background:var(--surface-2); padding:10px; border-radius:8px; text-align:center;">
                <small style="color:var(--muted); display:block;">Top Speed</small>
                <b>${bike.speed} km/h</b>
            </div>
            <div style="background:var(--surface-2); padding:10px; border-radius:8px; text-align:center;">
                <small style="color:var(--muted); display:block;">Type</small>
                <b>${bike.type}</b>
            </div>
        </div>
        
        <h4 style="font-weight:800; margin-bottom:8px;">Description</h4>
        <p style="color:var(--muted); font-size:14px; margin-bottom:20px;">${bike.desc || 'No description available.'}</p>
        
        <button class="btn-primary" style="width:100%; padding:12px; border-radius:8px;" onclick="closeBikeModal(); goTo('showrooms');">Find Showrooms</button>
    `;
    document.getElementById('bikeModal').classList.add('show');
};

window.closeBikeModal = function() {
    document.getElementById('bikeModal').classList.remove('show');
};

// ৭. শোরুম রেন্ডার
window.renderShowrooms = function() {
    const grid = document.getElementById('showroomGrid');
    if(!grid) return;
    
    document.getElementById('showroomCount').textContent = currentLang === 'en' ? `${showrooms.length} Showrooms` : `${bn(showrooms.length)}টি শোরুম`;
    
    // Verified আগে দেখাবে
    let sorted = [...showrooms].sort((a, b) => (b.verified === true) - (a.verified === true));
    
    grid.innerHTML = sorted.map(s => `
        <article class="sr-card" style="${s.verified ? 'border-color: #19c45e;' : ''}">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <span class="brand-tag">${s.brand} • ${s.division}</span>
                ${s.verified ? '<span class="brand-tag" style="background:#19c45e;color:#071b10;">✓ Verified</span>' : '<span class="brand-tag" style="background:#ffc72c;color:#071b10;">Pending</span>'}
            </div>
            <h3>${s.name}</h3>
            <div class="sr-area">${s.area}</div>
            <div class="sr-line"><i>📍</i><span>${s.address}</span></div>
            <div class="sr-line"><i>📞</i><a href="tel:${s.phone}">${s.phone}</a></div>
            <div class="sr-actions">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}" target="_blank" class="dir">🧭 Direction</a>
                <a href="tel:${s.phone}" class="call">📞 Call</a>
            </div>
        </article>
    `).join('');
    
    document.getElementById('statShowrooms').textContent = showrooms.length + '+';
};

// ৮. ম্যাপ ইনিশিয়ালাইজ
function initMap() {
    map = L.map('map').setView([23.8103, 90.4125], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    const icon = L.divIcon({ className: '', html: '<div class="custom-marker"><i>⚡</i></div>', iconSize: [30, 30], iconAnchor: [15, 30] });
    
    showrooms.forEach(s => {
        if(s.lat && s.lng) {
            L.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(`<b>${s.name}</b><br>${s.address}`);
        }
    });
}

// ৯. ফায়ারবেস থেকে ডেটা লোড
async function loadData() {
    try {
        const querySnapshot = await getDocs(collection(db, "bikes"));
        if(!querySnapshot.empty) {
            bikes = [];
            querySnapshot.forEach((doc) => { bikes.push({ id: doc.id, ...doc.data() }); });
        }
    } catch(e) { console.log("Using local bikes data"); }
    
    renderBikes();
    renderShowrooms();
    initMap();
    document.getElementById('statBrands').textContent = new Set(bikes.map(b=>b.brand)).size + '+';
}

// ১০. অ্যাডমিন লজিক (৫ বার ক্লিক)
let clickCount = 0, clickTimer;
document.getElementById('mainLogo').addEventListener('click', (e) => {
    clickCount++;
    if (clickCount === 5) {
        e.preventDefault();
        clearTimeout(clickTimer);
        clickCount = 0;
        document.getElementById('adminModal').classList.add('show');
    } else {
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
    }
});

window.loginAdmin = async function() {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPassword').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        document.getElementById('adminError').textContent = "";
    } catch (e) {
        document.getElementById('adminError').textContent = "Invalid email or password!";
    }
};

window.logoutAdmin = function() { signOut(auth); };

onAuthStateChanged(auth, (user) => {
    const loginSec = document.getElementById('adminLoginSection');
    const dashSec = document.getElementById('adminDashboard');
    
    if (user) {
        loginSec.style.display = 'none';
        dashSec.style.display = 'block';
        renderAdminBikeList();
    } else {
        loginSec.style.display = 'block';
        dashSec.style.display = 'none';
    }
});

// ১১. অ্যাডমিন প্যানেল থেকে বাইক এডিট
function renderAdminBikeList() {
    const list = document.getElementById('adminBikeList');
    if(!list) return;
    
    list.innerHTML = bikes.map(b => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:10px; margin-bottom:5px; border-radius:8px;">
            <span>${b.brand} ${b.name}</span>
            <button class="btn-primary" style="padding:5px 10px; font-size:12px;" onclick="editBike('${b.id}')">Edit</button>
        </div>
    `).join('');
}

window.editBike = function(id) {
    const bike = bikes.find(b => b.id === id);
    if(!bike) return;
    
    currentEditingBikeId = id;
    document.getElementById('editBikeName').value = bike.name;
    document.getElementById('editBikePrice').value = bike.price;
    document.getElementById('editBikeImage').value = bike.image || '';
    document.getElementById('editBikeDesc').value = bike.desc || '';
    
    document.getElementById('adminBikeList').style.display = 'none';
    document.getElementById('adminEditForm').style.display = 'block';
};

window.saveBikeEdit = async function() {
    const name = document.getElementById('editBikeName').value;
    const price = Number(document.getElementById('editBikePrice').value);
    const image = document.getElementById('editBikeImage').value;
    const desc = document.getElementById('editBikeDesc').value;
    
    try {
        // ফায়ারবেসে আপডেট
        const bikeRef = doc(db, "bikes", currentEditingBikeId);
        await updateDoc(bikeRef, { name, price, image, desc });
        
        // লোকাল ডেটা আপডেট
        const bikeIdx = bikes.findIndex(b => b.id === currentEditingBikeId);
        if(bikeIdx > -1) {
            bikes[bikeIdx] = { ...bikes[bikeIdx], name, price, image, desc };
        }
        
        alert("Bike updated successfully!");
        cancelEdit();
        renderBikes();
    } catch(e) {
        // ফায়ারবেসে ডকুমেন্ট না থাকলে লোকালি আপডেট হবে (টেস্টিংয়ের জন্য)
        const bikeIdx = bikes.findIndex(b => b.id === currentEditingBikeId);
        if(bikeIdx > -1) {
            bikes[bikeIdx] = { ...bikes[bikeIdx], name, price, image, desc };
        }
        alert("Updated locally (Database error)");
        cancelEdit();
        renderBikes();
    }
};

window.cancelEdit = function() {
    document.getElementById('adminBikeList').style.display = 'block';
    document.getElementById('adminEditForm').style.display = 'none';
};

// স্টার্ট অ্যাপ
document.getElementById('year').textContent = new Date().getFullYear();
loadData();
