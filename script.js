/**
 * GSSI KAS PRO - ELITE ENGINE
 * Optimized for Zero Bugs, High Speed & Perfect UX
 */

// ─── SPLASH SCREEN ────────────────────────────────────────────────
(function() {
    const splash = document.getElementById('splashScreen');
    const bar    = document.getElementById('splashProgress');
    if (!splash || !bar) return;

    if (sessionStorage.getItem('gssi_splash_shown')) {
        splash.style.display = 'none';
        return;
    }

    sessionStorage.setItem('gssi_splash_shown', 'true');
    requestAnimationFrame(() => { bar.style.width = '100%'; });

    // Hide after 3s
    setTimeout(() => {
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
        setTimeout(() => { splash.style.display = 'none'; }, 650);
    }, 3000);
})();
// ─────────────────────────────────────────────────────────────────

// --- DATA & MIGRATION ---
function clean(s) { 
    if (s === null || s === undefined) return "";
    if (typeof s === 'object') return clean(s.name || "");
    return String(s).toLowerCase().trim(); 
}

const isLunas = (s) => (s || "").toString().toLowerCase().trim() === 'lunas';

let transactions = (JSON.parse(localStorage.getItem("gssi_transactions")) || []).map(t => {
    // Migration: amount -> amt & add ID
    if (t.amount !== undefined && t.amt === undefined) t.amt = t.amount;
    if (t.amt === undefined) t.amt = 0;
    if (!t.id) t.id = Date.now() + Math.random().toString(36).substr(2, 9);
    return t;
});

let rawMembers = JSON.parse(localStorage.getItem("gssi_members")) || ["Hisyam", "Chesta", "Raka"];
let members = rawMembers.map(m => {
    if (typeof m === 'string') return { name: m, phone: "" };
    if (!m) return { name: "Tanpa Nama", phone: "" };
    return { name: m.name || "Tanpa Nama", phone: m.phone || "" };
});
localStorage.setItem("gssi_members", JSON.stringify(members));

let role = sessionStorage.getItem("gssi_role") || null;
const ADMIN_PASS = "bph_gssi";

// Pagination
let currentPage = 1;
const itemsLimit = 4;

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// --- INITIALIZATION ---
function init() {
    if (!role) {
        document.getElementById("loginOverlay").style.display = "flex";
        document.getElementById("mainContent").style.display = "none";
        return;
    }

    document.getElementById("loginOverlay").style.display = "none";
    document.getElementById("mainContent").style.display = "block";
    
    document.body.dataset.role = role;
    document.getElementById("roleLabel").innerText = role === 'admin' ? 'BPH / BENDAHARA' : 'ANGGOTA GSSI';

    loadConfig();
    refresh();
}

function showKasLogin() {
    document.getElementById("moduleSelect").style.display = "none";
    document.getElementById("kasLoginPanel").style.display = "block";
}

function backToModules() {
    document.getElementById("kasLoginPanel").style.display = "none";
    document.getElementById("moduleSelect").style.display = "block";
}

function refresh() {
    updateDash();
    renderUnpaid();
    renderHistory();
    updateChart();
    renderMemberPills();
}

// --- AUTH SYSTEM ---
function login(r) {
    if (r === 'admin') {
        const p = document.getElementById("adminPass").value;
        if (p === ADMIN_PASS) {
            role = 'admin';
        } else {
            document.getElementById("loginError").style.display = "block";
            return;
        }
    } else {
        role = 'member';
    }
    sessionStorage.setItem("gssi_role", role);
    init();
}

function logout() { 
    sessionStorage.removeItem("gssi_role"); 
    role = null; 
    document.getElementById("adminPass").value = "";
    document.getElementById("loginError").style.display = "none";
    backToModules();
    init(); 
    window.scrollTo(0,0);
}

function togglePassword() {
    const i = document.getElementById("adminPass");
    const ic = document.getElementById("eyeIcon");
    if (i.type === "password") {
        i.type = "text"; ic.setAttribute("data-icon", "solar:eye-broken");
    } else {
        i.type = "password"; ic.setAttribute("data-icon", "solar:eye-bold");
    }
}

// --- DASHBOARD ---
function updateDash() {
    let total = 0; 
    transactions.forEach(t => { total += (t.amt || 0); });
    document.getElementById("totalKas").innerText = "Rp " + total.toLocaleString("id-ID");
    
    const curP = getCurrentPeriod();
    document.getElementById("insightLabel").innerText = `Lunas (${curP})`;
    
    const paidBy = transactions
        .filter(t => clean(t.period) === clean(curP) && t.status === 'Lunas')
        .map(t => clean(t.name));
        
    const uniquePaid = new Set(paidBy);
    document.getElementById("paidCount").innerText = uniquePaid.size + " Orang";
}

function getCurrentPeriod() {
    const f = localStorage.getItem("gssi_freq") || "Mingguan";
    const d = new Date();
    if (f === "Bulanan") return MONTHS[d.getMonth()];
    const w = Math.ceil(d.getDate() / 7);
    return `M${w > 4 ? 4 : w} ${MONTHS[d.getMonth()]}`;
}

function renderUnpaid() {
    const curP = getCurrentPeriod();
    const paidNames = transactions
        .filter(t => clean(t.period) === clean(curP) && t.status === 'Lunas')
        .map(t => clean(t.name));
        
    const unpaid = members.filter(m => !paidNames.includes(clean(m.name)));

    const container = document.getElementById("unpaid-list");
    if (!container) return;
    container.innerHTML = "";

    if (unpaid.length === 0) {
        container.innerHTML = `<div class="empty-state">Semua anggota sudah lunas! ✨</div>`;
    } else {
        unpaid.forEach(mObj => {
            const name = mObj.name || "Tanpa Nama";
            const phone = mObj.phone ? String(mObj.phone).replace(/\D/g, "") : "";
            const cleanPhone = phone.startsWith("0") ? "62" + phone.substring(1) : phone;
            
            const card = document.createElement("div");
            card.className = "debt-item fade-in";
            const isPartial = transactions.some(t => clean(t.name) === clean(name) && clean(t.period) === clean(curP) && t.status === 'Cicil');
            
            const waMsg = `*INFO KAS GSSI*%0AHallo *${name}*, pembayaran kas untuk periode *${curP}* belum dilunasi. Yuk setor hari ini!%0A_Status: ${isPartial?'Masih Mencicil':'Belum Membayar'}_%0A%0ATerima kasih!`;
            const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;

            card.innerHTML = `
                <div class="debt-info">
                    <span class="debt-name">${name}</span><br>
                    <span style="font-size:0.6rem; font-weight:800; color:${isPartial?'#f59e0b':'#ef4444'}">
                        ${isPartial ? '⚠️ STATUS : CICIL' : '❌ BELUM BAYAR'}
                    </span>
                </div>
                <a href="${waUrl}" target="_blank" class="btn-wa-pill">
                    <span class="iconify" data-icon="logos:whatsapp-icon"></span> ${cleanPhone ? 'KIRIM WA' : 'TAGIH'}
                </a>
            `;
            container.appendChild(card);
        });
    }
}

// --- HISTORY & SEARCH ---
function renderHistory() {
    const container = document.getElementById("history-container");
    if (!container) return;

    const keyword = clean(document.getElementById("globalSearch").value);
    const filtered = transactions.filter(t => clean(t.name).includes(keyword) || clean(t.period).includes(keyword));
    filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = "";
    const start = (currentPage - 1) * itemsLimit;
    const items = filtered.slice(start, start + itemsLimit);

    if (items.length === 0) {
        container.innerHTML = `<div class="empty-state">Belum ada riwayat transaksi.</div>`;
    } else {
        items.forEach((t) => {
            if(!t || !t.id) return;
            const mObj = members.find(m => clean(m.name) === clean(t.name)) || { phone: "" };
            const phone = mObj.phone ? String(mObj.phone).replace(/\D/g, "") : "";
            const cleanPhone = phone.startsWith("0") ? "62" + phone.substring(1) : phone;

            const card = document.createElement("div");
            card.className = "history-item fade-in";
            const sLunas = isLunas(t.status);
            const sClass = sLunas ? 'lunas' : 'cicil';
            
            let canEdit = role === 'admin' && !sLunas;
            let adminBtn = canEdit ? `<button class="btn-mini" onclick="editT('${t.id}')">Edit</button>` : "";
            const waMsg = `*TERIMA KASIH!*%0AKas sudah diterima :%0ANama: ${t.name}%0APeriode: ${t.period}%0ANominal: Rp ${t.amt.toLocaleString("id-ID")}%0AStatus: ${t.status}`;
            const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;

            card.innerHTML = `
                <div class="h-top">
                    <span class="h-name">${t.name}</span>
                    <span class="h-amount">Rp ${t.amt.toLocaleString("id-ID")}</span>
                </div>
                <div class="h-meta">
                    <span>${t.date}</span> • <span>${t.period}</span> • <span class="badge-status ${sClass}">${t.status}</span>
                </div>
                <div class="h-actions">
                    <a href="${waUrl}" target="_blank" class="btn-mini" style="background:#e8f5e9; color:#2e7d32">WA</a>
                    ${adminBtn}
                    ${role === 'admin' ? `<button class="btn-mini" style="color:var(--danger)" onclick="deleteT('${t.id}')">Hapus</button>` : ""}
                </div>
            `;
            container.appendChild(card);
        });

        const tp = Math.ceil(filtered.length / itemsLimit);
        if (tp > 1) {
            const pg = document.createElement("div"); pg.className = "pagination";
            pg.innerHTML = `
                <button class="p-btn" ${currentPage===1?'disabled':''} onclick="setPage(${currentPage-1})">←</button>
                <span style="font-size:0.7rem; font-weight:800;">${currentPage}/${tp}</span>
                <button class="p-btn" ${currentPage===tp?'disabled':''} onclick="setPage(${currentPage+1})">→</button>
            `;
            container.appendChild(pg);
        }
    }
}

function setPage(p) { currentPage = p; renderHistory(); }
function filterHistory() { currentPage = 1; renderHistory(); }

// --- TRANSACTIONS ---
function showPayModal() { 
    if (document.getElementById("editIndex").value === "") {
        resetPayForm();
    }
    document.getElementById("payModal").style.display = "flex"; 
    document.getElementById("kasDate").valueAsDate = new Date();
    populatePeriods();
}
function closePayModal() { document.getElementById("payModal").style.display = "none"; resetPayForm(); }

function populatePeriods() {
    const s = document.getElementById("kasPeriod");
    if(!s) return;
    s.innerHTML = "";
    
    const freq = localStorage.getItem("gssi_freq") || "Mingguan";
    const d = new Date();
    const currentMonth = MONTHS[d.getMonth()];
    
    if (freq === "Mingguan") {
        for (let i = 1; i <= 4; i++) {
            const val = `M${i} ${currentMonth}`;
            const o = document.createElement("option"); o.value = val; o.innerText = val;
            s.appendChild(o);
        }
    } else {
        MONTHS.forEach(m => {
            const o = document.createElement("option"); o.value = m; o.innerText = m;
            s.appendChild(o);
        });
    }

    // Set default to current auto-period
    const cp = getCurrentPeriod();
    s.value = cp;
}

function handleStatusChange() {
    const status = document.getElementById("kasStatus").value;
    const amtInput = document.getElementById("kasAmount");
    const editId = document.getElementById("editIndex").value;

    if (status === "Lunas") {
        amtInput.value = localStorage.getItem("gssi_config_amount") || "5.000";
        amtInput.readOnly = true;
        amtInput.style.opacity = "0.7";
    } else {
        if (editId === "") amtInput.value = "";
        amtInput.readOnly = false;
        amtInput.style.opacity = "1";
    }
}

function formatCurrency(i) {
    let v = i.value.replace(/\D/g, "");
    if (v === "") { i.value = ""; return; }
    i.value = parseInt(v).toLocaleString("id-ID");
}

function saveTransaction() {
    const name = document.getElementById("kasName").value.trim();
    const period = document.getElementById("kasPeriod").value;
    const date = document.getElementById("kasDate").value;
    const raw = document.getElementById("kasAmount").value.replace(/\./g, "");
    const status = document.getElementById("kasStatus").value;
    const editId = document.getElementById("editIndex").value;

    if (editId !== "") {
        const transIdx = transactions.findIndex(t => t.id === editId);
        if (transIdx !== -1 && isLunas(transactions[transIdx].status)) {
            Swal.fire('Error', 'Data yang sudah Lunas tidak boleh diedit lagi.', 'error');
            return;
        }
    }

    if (!name || !date || isNaN(amt)) { 
        Swal.fire({
            icon: 'error',
            title: 'Oops',
            text: 'Harap lengkapi semua data!',
            confirmButtonColor: '#4f46e5'
        }); 
        return; 
    }

    if (editId === "") { 
        const newEntry = { 
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name, period, date, amt, status 
        };
        transactions.push(newEntry); 
    } else { 
        const transIdx = transactions.findIndex(t => t.id === editId);
        if (transIdx !== -1) {
            transactions[transIdx] = { ...transactions[transIdx], name, period, date, amt, status };
        }
    }
    
    // Auto sync to members list
    if (!members.some(m => clean(m.name) === clean(name))) { 
        members.push({ name, phone: "" }); 
        localStorage.setItem("gssi_members", JSON.stringify(members)); 
    }

    localStorage.setItem("gssi_transactions", JSON.stringify(transactions));
    closePayModal();
    refresh();
    Swal.fire({ icon:'success', title:'Tersimpan!', timer:1000, showConfirmButton:false });
}

function deleteT(id) {
    if (confirm("Hapus data ini?")) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem("gssi_transactions", JSON.stringify(transactions));
        refresh();
    }
}

function editT(id) {
    const t = transactions.find(item => item.id === id);
    if (!t) return;
    
    if (isLunas(t.status)) {
        Swal.fire('Info', 'Status Lunas tidak dapat diedit.', 'info');
        return;
    }
    document.getElementById("editIndex").value = t.id;
    document.getElementById("kasName").value = t.name;
    document.getElementById("kasAmount").value = (t.amt || 0).toLocaleString("id-ID");
    document.getElementById("kasDate").value = t.date;
    document.getElementById("kasStatus").value = t.status;
    showPayModal();
    setTimeout(() => { document.getElementById("kasPeriod").value = t.period; }, 50);
}

// --- MEMBERS ---
function showMemberModal() { document.getElementById("memberModal").style.display = "flex"; renderMemberPills(); }
function closeMemberModal() { document.getElementById("memberModal").style.display = "none"; }

function showSettingModal() { 
    document.getElementById("settingModal").style.display = "flex"; 
    document.getElementById("configFreq").value = localStorage.getItem("gssi_freq") || "Mingguan";
    document.getElementById("configAmount").value = localStorage.getItem("gssi_config_amount") || "";
}

function closeSettingModal() { document.getElementById("settingModal").style.display = "none"; }

function saveSettings() {
    const freq = document.getElementById("configFreq").value;
    const amt = document.getElementById("configAmount").value;
    localStorage.setItem("gssi_freq", freq);
    localStorage.setItem("gssi_config_amount", amt);
    closeSettingModal();
    refresh();
    Swal.fire({ icon:'success', title:'Pengaturan Disimpan!', timer:1000, showConfirmButton:false });
}

function addMember() {
    const name = document.getElementById("newMemberName").value.trim();
    const phone = document.getElementById("newMemberPhone").value.trim();
    if (!name || members.some(m => clean(m.name) === clean(name))) return;
    
    members.push({ name, phone });
    localStorage.setItem("gssi_members", JSON.stringify(members));
    document.getElementById("newMemberName").value = "";
    document.getElementById("newMemberPhone").value = "";
    renderMemberPills();
    refresh();
}

function delMember(n) {
    if (confirm(`Hapus ${n} dari daftar penagihan?`)) {
        members = members.filter(m => clean(m.name) !== clean(n));
        localStorage.setItem("gssi_members", JSON.stringify(members));
        refresh();
    }
}

function renderMemberPills() {
    const container = document.getElementById("memberPills");
    if(!container) return;
    container.innerHTML = "";
    members.forEach(m => {
        const p = document.createElement("div");
        p.className = "member-pill";
        p.innerHTML = `<span>${m.name}</span> <span onclick="delMember('${m.name}')" class="del-member">×</span>`;
        container.appendChild(p);
    });
    const dl = document.getElementById("memberList");
    if(dl) dl.innerHTML = members.map(m => `<option value="${m.name}">`).join("");
}

// --- HELPERS ---
function resetPayForm() { 
    document.getElementById("editIndex").value = ""; 
    document.getElementById("kasName").value = ""; 
    document.getElementById("kasStatus").value = "Lunas";
    const defaultAmt = localStorage.getItem("gssi_config_amount") || "5.000";
    const amtInput = document.getElementById("kasAmount");
    amtInput.value = defaultAmt; 
    amtInput.readOnly = true;
    amtInput.style.opacity = "0.7";
}

function loadConfig() { 
    const f = document.getElementById("configFreq");
    if(f) f.value = localStorage.getItem("gssi_freq") || "Mingguan"; 
}

function backup() {
    const blob = new Blob([JSON.stringify({t:transactions, m:members})], {type:'application/json'});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `Backup_Kas.json`; a.click();
}

function restore(i) {
    const f = i.files[0];
    if(f){
        const r = new FileReader();
        r.onload = (e) => {
            const d = JSON.parse(e.target.result);
            if(d.t) transactions = d.t; if(d.m) members = d.m;
            localStorage.setItem("gssi_transactions", JSON.stringify(transactions));
            localStorage.setItem("gssi_members", JSON.stringify(members));
            refresh();
            Swal.fire('Berhasil', 'Data dipulihkan!', 'success');
        };
        r.readAsText(f);
    }
}

function exportPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const now = new Date();
        const simpleDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function() {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = this.width || 100;
                canvas.height = this.height || 100;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#FFFFFF"; // Ensure white background for PDF
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(this, 0, 0, canvas.width, canvas.height);
                const dataURL = canvas.toDataURL("image/jpeg", 0.9);
                doc.addImage(dataURL, 'JPEG', 20, 10, 22, 22);
            } catch (err) { console.error("Logo Edit Error:", err); }
            finishPDF(doc, simpleDate, transactions);
        };
        img.onerror = function() { finishPDF(doc, simpleDate, transactions); };
        img.src = "logo.png"; // Fetch naturally from server

    } catch (e) {
        console.error("PDF Bootstrap failed:", e);
        Swal.fire('Error', 'Gagal membuat PDF.', 'error');
    }
}

function finishPDF(doc, simpleDate, transactions) {
    try {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("GSSI (Gerakan Siswa Siswi Indonesia)", 48, 18);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105);
        doc.text("Laporan Pembukuan Kas Bendahara", 48, 25);

        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.5);
        doc.line(20, 36, 190, 36);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("Periode: Laporan Keseluruhan", 20, 44);
        doc.text(`Dicetak: ${simpleDate}`, 190, 44, { align: 'right' });

        const items = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
        const rows = items.map(t => [
            t.date,
            `${t.name} (${t.period})`,
            "Pemasukan",
            "Kas Anggota",
            `Rp ${(t.amt || 0).toLocaleString("id-ID")}`
        ]);

        doc.autoTable({
            head: [['Tanggal', 'Keterangan', 'Jenis', 'Kategori', 'Jumlah']],
            body: rows,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: { 4: { halign: 'right' } }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        const total = transactions.reduce((acc, c) => acc + (c.amt || 0), 0);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(20, finalY, 170, 15, 2, 2, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text(`TOTAL SALDO AKHIR : Rp ${total.toLocaleString("id-ID")}`, 185, finalY + 10, { align: 'right' });

        const sigY = finalY + 40;
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "normal");
        
        doc.text("Mengetahui,", 25, sigY);
        doc.setFont("helvetica", "bold");
        doc.text("Ketua GSSI", 25, sigY + 7);
        doc.setFont("helvetica", "normal");
        doc.text("( ____________________ )", 25, sigY + 40);

        doc.text(`Jakarta, ${simpleDate}`, 135, sigY);
        doc.setFont("helvetica", "bold");
        doc.text("Bendahara GSSI", 135, sigY + 7);
        doc.setFont("helvetica", "normal");
        doc.text("( ____________________ )", 135, sigY + 40);

        doc.save(`Laporan_Kas_GSSI_Pro.pdf`);
    } catch(e) {
        console.error("PDF Finalize failed:", e);
        Swal.fire('Error', 'Gagal merender data ke PDF', 'error');
    }
}

let balanceChart;
function updateChart() {
    const monthly = {}; 
    transactions.forEach(t => { if(!monthly[t.period]) monthly[t.period]=0; monthly[t.period]+=(t.amt||0); });
    const ctx = document.getElementById("balanceChart");
    if(ctx){
        if(balanceChart) balanceChart.destroy();
        balanceChart = new Chart(ctx, { type:'line', data:{ labels:Object.keys(monthly), datasets:[{ label:'Kas', data:Object.values(monthly), borderColor:'#4f46e5', tension:0.4, fill:true, backgroundColor:'rgba(79,70,229,0.05)' }]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} } });
    }
}

function scrollToTop() { window.scrollTo({ top:0, behavior:'smooth' }); }
function scrollToElement(id) { 
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior:'smooth' }); 
}
function closeModals(e) { if(e.target.classList.contains('modal-overlay')) { closePayModal(); closeMemberModal(); closeSettingModal(); } }

document.addEventListener('DOMContentLoaded', init);
