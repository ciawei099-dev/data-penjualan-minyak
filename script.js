const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxltI2XP9ABXjd_jDOtlEMsAA70-p2XmhfgqFtLzH07YSmxI9v81N-2KZ5nt5Pw3lLccQ/exec";

document.addEventListener("DOMContentLoaded", () => {
    // Nav Tab Switcher Logic
    const tabs = document.querySelectorAll(".nav-tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-tab");

            tabs.forEach(t => t.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(target).classList.add("active");
        });
    });

    // Elements - Shipping
    const shippingForm = document.getElementById("shipping-form");
    const tableBody = document.getElementById("table-body");
    const jumlahInput = document.getElementById("jumlah-drum");
    const hargaInput = document.getElementById("harga-drum");
    const totalEstimasi = document.getElementById("total-estimasi");
    const submitBtn = shippingForm ? shippingForm.querySelector('button[type="submit"]') : null;

    // Elements - Kasbon
    const kasbonForm = document.getElementById("kasbon-form");
    const kasbonTableBody = document.getElementById("kasbon-table-body");
    const kasbonSubmitBtn = kasbonForm ? kasbonForm.querySelector('button[type="submit"]') : null;

    // Format Helpers
    const formatRupiah = (number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(number) || 0);
    const formatDateIndonesia = (dateString) => {
        if (!dateString) return "-";
        const dateObj = new Date(dateString);
        if (isNaN(dateObj.getTime())) return dateString;
        return dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Auto Calculate Estimasi
    const updateEstimasi = () => {
        if (jumlahInput && hargaInput && totalEstimasi) {
            const total = (parseFloat(jumlahInput.value) || 0) * (parseFloat(hargaInput.value) || 0);
            totalEstimasi.textContent = formatRupiah(total);
        }
    };

    if (jumlahInput) jumlahInput.addEventListener("input", updateEstimasi);
    if (hargaInput) hargaInput.addEventListener("input", updateEstimasi);

    // Fetch All Data (Shipping + Kasbon)
    const fetchData = async () => {
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">Memuat data pengiriman...</td></tr>`;
        if (kasbonTableBody) kasbonTableBody.innerHTML = `<tr><td colspan="5" class="empty-row">Memuat data kasbon...</td></tr>`;
        
        try {
            const res = await fetch(SCRIPT_URL);
            const data = await res.json();

            // Memisahkan data (jika backend mengirim objek {shipping: [], kasbon: []} atau array)
            if (Array.isArray(data)) {
                renderShippingTable(data);
            } else {
                renderShippingTable(data.shipping || []);
                renderKasbonTable(data.kasbon || []);
            }
        } catch (e) {
            console.error(e);
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" class="empty-row text-danger">Gagal memuat data. Periksa Apps Script.</td></tr>`;
            if (kasbonTableBody) kasbonTableBody.innerHTML = `<tr><td colspan="5" class="empty-row text-danger">Gagal memuat data kasbon.</td></tr>`;
        }
    };

    // Render Table Pengiriman
    const renderShippingTable = (data) => {
        if (!tableBody) return;
        tableBody.innerHTML = "";
        let totalDrum = 0, totalHarga = 0;

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">Belum ada data pengiriman.</td></tr>`;
            if (document.getElementById("grand-total-drum")) document.getElementById("grand-total-drum").textContent = "0";
            if (document.getElementById("grand-total-harga")) document.getElementById("grand-total-harga").textContent = "Rp 0";
            if (document.getElementById("data-count")) document.getElementById("data-count").textContent = "0 Data";
            return;
        }

        data.forEach((item, index) => {
            const rowTotal = (Number(item.jumlah) || 0) * (Number(item.harga) || 0);
            totalDrum += Number(item.jumlah) || 0;
            totalHarga += rowTotal;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${formatDateIndonesia(item.tanggal)}</td>
                <td>${item.supir || "-"}</td>
                <td>${item.mobil || "-"}</td>
                <td>${item.jumlah || 0}</td>
                <td>${formatRupiah(item.harga)}</td>
                <td>${formatRupiah(rowTotal)}</td>
                <td>${item.keterangan && item.keterangan !== "" ? item.keterangan : "-"}</td>
                <td class="no-print">
                    <button class="btn-delete" onclick="deleteData(${index + 2}, 'shipping')">Hapus</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        if (document.getElementById("grand-total-drum")) document.getElementById("grand-total-drum").textContent = totalDrum;
        if (document.getElementById("grand-total-harga")) document.getElementById("grand-total-harga").textContent = formatRupiah(totalHarga);
        if (document.getElementById("data-count")) document.getElementById("data-count").textContent = `${data.length} Data`;
    };

    // Render Table Kasbon
    const renderKasbonTable = (data) => {
        if (!kasbonTableBody) return;
        kasbonTableBody.innerHTML = "";
        let totalKasbon = 0;

        if (!data || data.length === 0) {
            kasbonTableBody.innerHTML = `<tr><td colspan="5" class="empty-row">Belum ada catatan kasbon.</td></tr>`;
            if (document.getElementById("grand-total-kasbon")) document.getElementById("grand-total-kasbon").textContent = "Rp 0";
            if (document.getElementById("kasbon-count")) document.getElementById("kasbon-count").textContent = "0 Catatan";
            return;
        }

        data.forEach((item, index) => {
            const nominal = Number(item.nominal) || 0;
            totalKasbon += nominal;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${formatDateIndonesia(item.tanggal)}</td>
                <td>${item.supir || "-"}</td>
                <td class="text-danger text-bold">${formatRupiah(nominal)}</td>
                <td>${item.keterangan || "-"}</td>
                <td class="no-print">
                    <button class="btn-delete" onclick="deleteData(${index + 2}, 'kasbon')">Hapus</button>
                </td>
            `;
            kasbonTableBody.appendChild(tr);
        });

        if (document.getElementById("grand-total-kasbon")) document.getElementById("grand-total-kasbon").textContent = formatRupiah(totalKasbon);
        if (document.getElementById("kasbon-count")) document.getElementById("kasbon-count").textContent = `${data.length} Catatan`;
    };

    // Submit Form Pengiriman
    if (shippingForm) {
        shippingForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Menyimpan..."; }

            const payload = {
                action: "insert",
                target: "shipping",
                tanggal: document.getElementById("tanggal").value,
                supir: document.getElementById("supir").value,
                mobil: document.getElementById("mobil").value,
                jumlah: parseInt(jumlahInput.value),
                harga: parseFloat(hargaInput.value),
                keterangan: document.getElementById("keterangan") ? document.getElementById("keterangan").value : ""
            };

            try {
                await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
                shippingForm.reset();
                if (totalEstimasi) totalEstimasi.textContent = "Rp 0";
                setTimeout(() => fetchData(), 1000);
            } catch (err) {
                console.error(err);
                alert("Gagal menyimpan data.");
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Tambah ke Tabel"; }
            }
        });
    }

    // Submit Form Kasbon
    if (kasbonForm) {
        kasbonForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (kasbonSubmitBtn) { kasbonSubmitBtn.disabled = true; kasbonSubmitBtn.textContent = "Menyimpan..."; }

            const payload = {
                action: "insert",
                target: "kasbon",
                tanggal: document.getElementById("kasbon-tanggal").value,
                supir: document.getElementById("kasbon-supir").value,
                nominal: parseFloat(document.getElementById("kasbon-nominal").value),
                keterangan: document.getElementById("kasbon-keterangan").value
            };

            try {
                await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
                kasbonForm.reset();
                setTimeout(() => fetchData(), 1000);
            } catch (err) {
                console.error(err);
                alert("Gagal menyimpan data kasbon.");
            } finally {
                if (kasbonSubmitBtn) { kasbonSubmitBtn.disabled = false; kasbonSubmitBtn.textContent = "Simpan Kasbon"; }
            }
        });
    }

    // Reset Forms
    document.getElementById("reset-form")?.addEventListener("click", () => {
        shippingForm.reset();
        if (totalEstimasi) totalEstimasi.textContent = "Rp 0";
    });

    document.getElementById("kasbon-reset")?.addEventListener("click", () => {
        kasbonForm.reset();
    });

    // Delete Data
    window.deleteData = async (rowIndex, target = 'shipping') => {
        if (!confirm("Hapus data ini?")) return;
        try {
            await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({ action: "delete", target: target, rowIndex: rowIndex })
            });
            setTimeout(() => fetchData(), 1000);
        } catch (err) {
            console.error(err);
            alert("Gagal menghapus data.");
        }
    };

    // Download PDF
    const downloadPdfBtn = document.getElementById("download-pdf");
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener("click", () => {
            const element = document.getElementById("print-area");
            const noPrintElements = element.querySelectorAll(".no-print");
            noPrintElements.forEach(el => el.style.display = "none");

            const opt = {
                margin:       [10, 10, 10, 10],
                filename:     `Nota_Pengiriman_${new Date().toISOString().slice(0,10)}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
                jsPDF:         { unit: 'mm', format: 'a4', orientation: 'landscape' },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                noPrintElements.forEach(el => el.style.display = "");
            });
        });
    }

    // Initial Load
    fetchData();
});