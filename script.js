const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxltI2XP9ABXjd_jDOtlEMsAA70-p2XmhfgqFtLzH07YSmxI9v81N-2KZ5nt5Pw3lLccQ/exec";

document.addEventListener("DOMContentLoaded", () => {
    const shippingForm = document.getElementById("shipping-form");
    const tableBody = document.getElementById("table-body");
    const jumlahInput = document.getElementById("jumlah-drum");
    const hargaInput = document.getElementById("harga-drum");
    const totalEstimasi = document.getElementById("total-estimasi");

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
        const total = (parseFloat(jumlahInput.value) || 0) * (parseFloat(hargaInput.value) || 0);
        totalEstimasi.textContent = formatRupiah(total);
    };
    jumlahInput.addEventListener("input", updateEstimasi);
    hargaInput.addEventListener("input", updateEstimasi);

    // Fetch Data
    const fetchData = async () => {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">Memuat data...</td></tr>`;
        try {
            const res = await fetch(SCRIPT_URL);
            const data = await res.json();
            renderTable(data);
        } catch (e) {
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-row" style="color:red">Gagal memuat data.</td></tr>`;
        }
    };

    // Render Table
    // Render Table
    const renderTable = (data) => {
        tableBody.innerHTML = "";
        let totalDrum = 0, totalHarga = 0;

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-row">Belum ada data.</td></tr>`;
            document.getElementById("grand-total-drum").textContent = "0";
            document.getElementById("grand-total-harga").textContent = "Rp 0";
            document.getElementById("data-count").textContent = "0 Data";
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

        document.getElementById("grand-total-drum").textContent = totalDrum;
        document.getElementById("grand-total-harga").textContent = formatRupiah(totalHarga);
        document.getElementById("data-count").textContent = `${data.length} Data`;
    };
    // Download PDF
    document.getElementById("download-pdf").addEventListener("click", () => {
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

    // Initial Load
    fetchData();
});
