// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

// লিস্টিং জমা দেওয়া
export async function submitListing(data) {
    return await addDoc(collection(db, "applications"), {
        ...data, status: 'pending', date: new Date().toISOString()
    });
}

// অ্যাডমিন প্যানেল
export function initAdmin({ getBikes, refresh }) {
    const $ = id => document.getElementById(id);
    let isLogin = false;

    // Login
    $('admLoginBtn').addEventListener('click', async () => {
        try {
            await signInWithEmailAndPassword(auth, $('admEmail').value, $('admPass').value);
        } catch(e) { $('admMsg').textContent = e.message; }
    });

    // Logout
    $('admLogoutBtn').addEventListener('click', () => signOut(auth));

    // Tabs
    $('tabBikes').addEventListener('click', () => renderAdminBikes(getBikes(), refresh));
    $('tabRequests').addEventListener('click', () => renderAdminRequests(refresh));

    // Auth State
    onAuthStateChanged(auth, user => {
        isLogin = !!user;
        $('adminLogin').style.display = isLogin ? 'none' : 'block';
        $('adminPanel').style.display = isLogin ? 'block' : 'none';
        if(isLogin) renderAdminBikes(getBikes(), refresh);
    });
}

async function renderAdminBikes(bikes, refresh) {
    const content = document.getElementById('adminContent');
    content.innerHTML = bikes.map(b => `
        <div class="fb-row">
            <span>${b.brand} ${b.name}</span>
            <button class="btn-primary" onclick="editBike('${b.id}')">Edit</button>
        </div>
    `).join('');
}

window.editBike = async function(id) {
    const b = window.BIKES.find(x => x.id === id);
    if(!b) return;
    const price = prompt("New Price:", b.price);
    if(price) {
        try {
            await updateDoc(doc(db, "bikes", id), { price: Number(price) });
            alert("Updated!"); location.reload();
        } catch(e) { alert("Error: " + e.message); }
    }
}

async function renderAdminRequests(refresh) {
    const content = document.getElementById('adminContent');
    content.innerHTML = "Loading...";
    try {
        const snap = await getDocs(collection(db, "applications"));
        let html = "";
        snap.forEach(d => {
            const data = d.data();
            html += `<div class="fb-row" style="flex-direction:column; align-items:flex-start;">
                <b>${data.name} (${data.brand})</b>
                <small>${data.address}, ${data.area} - ${data.phone}</small>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button class="btn-primary" onclick="approveReq('${d.id}')">Approve</button>
                    <button class="btn-outline" onclick="deleteReq('${d.id}')">Delete</button>
                </div>
            </div>`;
        });
        content.innerHTML = html || "No pending requests.";
    } catch(e) { content.innerHTML = "Error loading requests."; }
}

window.approveReq = async function(id) {
    try {
        const reqDoc = await getDocs(collection(db, "applications"));
        let data;
        reqDoc.forEach(d => { if(d.id === id) data = d.data(); });
        if(!data) return;

        // Add to showrooms
        await addDoc(collection(db, "showrooms"), {
            brand: data.brand, name: data.name, area: data.area, division: data.division,
            phone: data.phone, address: data.address, lat: 23.8, lng: 90.4, verified: false
        });

        // Delete request
        await deleteDoc(doc(db, "applications", id));
        alert("Approved and added to showrooms!");
        renderAdminRequests();
    } catch(e) { alert("Error: " + e.message); }
}

window.deleteReq = async function(id) {
    if(confirm("Reject this request?")) {
        await deleteDoc(doc(db, "applications", id));
        renderAdminRequests();
    }
}
