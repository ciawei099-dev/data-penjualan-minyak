const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxltI2XP9ABXjd_jDOtlEMsAA70-p2XmhfgqFtLzH07YSmxI9v81N-2KZ5nt5Pw3lLccQ/exec";

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const form = document.getElementById("shipping-form");
    const tanggalInput = document.getElementById("tanggal");
    const jumlahInput = document.getElementById("jumlah-drum");
    const hargaInput = document.getElementById("harga-drum");
    const totalEstimasi = document.getElementById("total-estimasi");
    const resetBtn = document.getElementById("reset-form");
    const tableBody = document.getElementById("table-body");
    const grandTotalDrum = document.getElementById("grand-total-drum");
    const grandTotalHarga = document.getElementById("grand-total-harga");
    const dataCount = document.getElementById("data-count");
    const addEmptyRowBtn = document.getElementById("add-empty-row");
    const downloadPdfBtn = document.getElementById("download-pdf");

    let shippingData = [];

    // Helper: Format Tanggal ke "Hari, DD/MM/YYYY" (contoh: Jumat, 24/07/2026)
    const formatDateIndonesia = (dateString) => {
        if (!dateString || dateString === "-") return "-";
        
        // Jika data lama sudah berupa teks biasa
        if (isNaN(Date.parse(dateString)) && !dateString.includes("-")) {
            return dateString;
        }

        const dateObj = new Date(dateString);
        if (isNaN(dateObj.getTime())) return dateString;

        const options = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' };
        return dateObj.toLocaleDateString('id-ID', options);
    };

    // Helper: Format Rupiah Utuh (Contoh: Rp 1.000.000)
    const formatRupiah = (number) => {
        const val = Number(number) || 0;
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(val);
    };

    // Hitung Estimasi otomatis saat ngetik
    const calculateEstimasi = () => {
        const jumlah = parseFloat(jumlahInput.value) || 0;
        const harga = parseFloat(hargaInput.value) || 0;
        totalEstimasi.textContent = formatRupiah(jumlah * harga);
    };

    jumlahInput.addEventListener("input", calculateEstimasi);
    hargaInput.addEventListener("input", calculateEstimasi);

    // Ambil Data dari Google Sheets
    const fetchSheetData = async () => {
        tableBody.innerHTML = `<tr><td colspan="7" class="empty-row">Memuat data dari Google Sheets...</td></tr>`;

        try {
            const response = await fetch(SCRIPT_URL);
            const data = await response.json();
            shippingData = data;
            renderTable();
        } catch (error) {
            console.error("Gagal mengambil data:", error);
            tableBody.innerHTML = `<tr><td colspan="7" class="empty-row" style="color:red;">Gagal memuat data dari database.</td></tr>`;
        }
    };

    // Render Tabel
    const renderTable = () => {
        tableBody.innerHTML = "";
        
        if (shippingData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-row">Belum ada data. Silakan isi form di atas.</td>
                </tr>
            `;
            grandTotalDrum.textContent = "0";
            grandTotalHarga.textContent = "Rp 0";
            dataCount.textContent = "0 Data";
            return;
        }

        let totalDrum = 0;
        let totalHarga = 0;

        shippingData.forEach((item, index) => {
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
                <td class="no-print">
                    <button class="btn-delete" onclick="deleteData(${index + 2})">Hapus</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        grandTotalDrum.textContent = totalDrum;
        grandTotalHarga.textContent = formatRupiah(totalHarga);
        dataCount.textContent = `${shippingData.length} Data`;
    };

    // Kirim Data Baru ke Google Sheets
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan...";

        const payload = {
            action: "insert",
            tanggal: tanggalInput.value, // Mengirim format YYYY-MM-DD
            supir: document.getElementById("supir").value,
            mobil: document.getElementById("mobil").value,
            jumlah: parseInt(jumlahInput.value),
            harga: parseFloat(hargaInput.value)
        };

        try {
            await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            form.reset();
            totalEstimasi.textContent = "Rp 0";
            await fetchSheetData();
        } catch (error) {
            alert("Gagal menyimpan data ke Google Sheets");
            console.error(error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Tambah ke Tabel";
        }
    });

    // Reset Form
    resetBtn.addEventListener("click", () => {
        form.reset();
        totalEstimasi.textContent = "Rp 0";
    });

    // Tambah Baris Kosong
    addEmptyRowBtn.addEventListener("click", async () => {
        const payload = {
            action: "insert",
            tanggal: "-",
            supir: "-",
            mobil: "-",
            jumlah: 0,
            harga: 0
        };

        try {
            await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            await fetchSheetData();
        } catch (error) {
            alert("Gagal menambah baris kosong.");
        }
    });

    // Hapus Data dari Google Sheets (global)
    window.deleteData = async (rowIndex) => {
        if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;

        const payload = {
            action: "delete",
            rowIndex: rowIndex
        };

        try {
            await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            await fetchSheetData();
        } catch (error) {
            alert("Gagal menghapus data.");
        }
    };

    // Unduh PDF
    downloadPdfBtn.addEventListener("click", () => {
        const element = document.getElementById("print-area");
        const noPrintElements = element.querySelectorAll(".no-print");
        noPrintElements.forEach(el => el.style.display = "none");

        const opt = {
            margin:       10,
            filename:     'Rekap_Data_Pengiriman.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            noPrintElements.forEach(el => el.style.display = "");
        });
    });

    // Muat data awal
    fetchSheetData();
});