const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxltI2XP9ABXjd_jDOtlEMsAA70-p2XmhfgqFtLzH07YSmxI9v81N-2KZ5nt5Pw3lLccQ/exec";

document.addEventListener("DOMContentLoaded", () => {
    const shippingForm = document.getElementById("shipping-form");
    const tableBody = document.getElementById("table-body");
    const jumlahInput = document.getElementById("jumlah-drum");
    const hargaInput = document.getElementById("harga-drum");
    const totalEstimasi = document.getElementById("total-estimasi");
    const submitBtn = shippingForm ? shippingForm.querySelector('button[type="submit"]') : null;

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

    // Fetch Data dari Google Sheets
    const fetchData = async () => {
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">Memuat data...</td></tr>`;
        try {
            const res = await fetch(SCRIPT_URL);
            const data = await res.json();
            renderTable(data);
        } catch (e) {
            console.error(e);
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-row" style="color:red">Gagal memuat data. Periksa koneksi/Apps Script.</td></tr>`;
        }
    };

    // Render Table (Tepat 8 Kolom)
    const renderTable = (data) => {
        if (!tableBody) return;
        tableBody.innerHTML = "";
        let totalDrum = 0, totalHarga = 0;

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">Belum ada data.</td></tr>`;
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
                    <button class="btn-delete" onclick="deleteData(${index + 2})">Hapus</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        if (document.getElementById("grand-total-drum")) document.getElementById("grand-total-drum").textContent = totalDrum;
        if (document.getElementById("grand-total-harga")) document.getElementById("grand-total-harga").textContent = formatRupiah(totalHarga);
        if (document.getElementById("data-count")) document.getElementById("data-count").textContent = `${data.length} Data`;
    };

    // Submit Form
    if (shippingForm) {
        shippingForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Cegah refresh halaman

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Menyimpan...";
            }

            const payload = {
                action: "insert",
                tanggal: document.getElementById("tanggal").value,
                supir: document.getElementById("supir").value,
                mobil: document.getElementById("mobil").value,
                jumlah: parseInt(jumlahInput.value),
                harga: parseFloat(hargaInput.value),
                keterangan: document.getElementById("keterangan") ? document.getElementById("keterangan").value : ""
            };

            try {
                // Menggunakan mode no-cors atau format URLSearchParams untuk kompatibilitas penuh dengan Google Apps Script
                await fetch(SCRIPT_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8"
                    },
                    body: JSON.stringify(payload)
                });

                shippingForm.reset();
                if (totalEstimasi) totalEstimasi.textContent = "Rp 0";
                
                // Beri jeda 1 detik agar Google Sheets selesai menulis data sebelum diambil ulang
                setTimeout(() => {
                    fetchData();
                }, 1000);

            } catch (err) {
                console.error(err);
                alert("Gagal menyimpan data: " + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Tambah ke Tabel";
                }
            }
        });
    }
    // Reset Form Event
    const resetBtn = document.getElementById("reset-form");
    if (resetBtn && shippingForm) {
        resetBtn.addEventListener("click", () => {
            shippingForm.reset();
            if (totalEstimasi) totalEstimasi.textContent = "Rp 0";
        });
    }

    // Delete Data
    window.deleteData = async (rowIndex) => {
        if (!confirm("Hapus data ini?")) return;
        try {
            await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({ action: "delete", rowIndex: rowIndex })
            });
            fetchData();
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
            const opt = {
                margin: 10,
                filename: `Nota_Pengiriman_${new Date().toISOString().slice(0,10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };
            html2pdf().set(opt).from(element).save();
        });
    }

    // Load Data Awal
    fetchData();
});
