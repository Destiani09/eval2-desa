const express = require('express');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const multer = require('multer');
const app = express();

// Konfigurasi URL CDN (Ganti jika perlu)
const cdnUrl = "https://ik.imagekit.io/desa"; 

// 1. Koneksi Database RDS
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
});

// Otomatis membuat Database dan Tabel dari dalam ECS
db.connect((err) => {
    if (err) {
        console.log("Menunggu konfigurasi DB_HOST dari ECS...");
    } else {
        console.log("Berhasil terhubung ke server RDS!");
        db.query("CREATE DATABASE IF NOT EXISTS sipedas", (err) => {
            if (err) console.log("Gagal buat database:", err);
            else {
                // Bikin tabel Pengaduan Warga
                const tablePengaduan = `
                    CREATE TABLE IF NOT EXISTS sipedas.laporan_warga (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        nama VARCHAR(255),
                        kategori VARCHAR(100),
                        deskripsi TEXT,
                        nama_file VARCHAR(255),
                        status VARCHAR(50) DEFAULT 'Menunggu Validasi',
                        tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                db.query(tablePengaduan);

                // Bikin tabel Pengajuan Surat (Fitur Ekstra)
                const tableSurat = `
                    CREATE TABLE IF NOT EXISTS sipedas.pengajuan_surat (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        nik VARCHAR(16),
                        nama VARCHAR(255),
                        jenis_surat VARCHAR(100),
                        keperluan TEXT,
                        status VARCHAR(50) DEFAULT 'Diproses',
                        tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                db.query(tableSurat);
                console.log("Semua tabel SIPEDAS siap digunakan!");
            }
        });
    }
});

// 2. Konfigurasi S3
const s3 = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware untuk parsing form data biasa
app.use(express.urlencoded({ extended: true }));

// ========================================================
// SISTEM TEMPLATE UI (Biar rapi dan seragam di semua halaman)
// ========================================================
const renderUI = (title, content, activeMenu) => `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIPEDAS - ${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-50 text-slate-800 font-sans antialiased flex flex-col min-h-screen">
    <nav class="bg-emerald-700 shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                <div class="flex items-center space-x-3">
                    <i class="fa-solid fa-leaf text-white text-2xl"></i>
                    <span class="font-bold text-white text-xl tracking-wider">SIPEDAS</span>
                </div>
                <div class="hidden md:flex space-x-2">
                    <a href="/" class="px-3 py-2 rounded-md font-medium ${activeMenu === 'home' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'}"><i class="fa-solid fa-house mr-1"></i> Beranda</a>
                    <a href="/pengaduan" class="px-3 py-2 rounded-md font-medium ${activeMenu === 'pengaduan' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'}"><i class="fa-solid fa-bullhorn mr-1"></i> Buat Laporan</a>
                    <a href="/laporan" class="px-3 py-2 rounded-md font-medium ${activeMenu === 'laporan' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'}"><i class="fa-solid fa-list-check mr-1"></i> Hasil Laporan</a>
                    <a href="/surat" class="px-3 py-2 rounded-md font-medium ${activeMenu === 'surat' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'}"><i class="fa-solid fa-envelope-open-text mr-1"></i> e-Surat</a>
                </div>
            </div>
        </div>
    </nav>

    <main class="flex-grow w-full">
        ${content}
    </main>

    <footer class="bg-slate-900 text-slate-400 py-6 text-center text-sm mt-auto">
        <p class="mb-2 text-slate-300 font-semibold">Infrastruktur Berjalan di AWS Cloud</p>
        <div class="flex justify-center space-x-4">
            <span class="bg-slate-800 px-2 py-1 rounded border border-slate-700">ECS Fargate</span>
            <span class="bg-slate-800 px-2 py-1 rounded border border-slate-700">RDS MySQL</span>
            <span class="bg-slate-800 px-2 py-1 rounded border border-slate-700">Amazon S3</span>
            <span class="bg-slate-800 px-2 py-1 rounded border border-slate-700">CDN ImageKit</span>
        </div>
    </footer>
</body>
</html>
`;

// ========================================================
// ROUTING HALAMAN
// ========================================================

// 1. Halaman Beranda
app.get('/', (req, res) => {
    const content = `
        <div class="bg-emerald-800 text-white py-20 text-center">
            <h1 class="text-4xl md:text-5xl font-extrabold mb-4">Selamat Datang di Portal Desa</h1>
            <p class="text-lg text-emerald-200 max-w-2xl mx-auto">Sistem Pelayanan Terpadu untuk kemudahan administrasi dan transparansi pembangunan warga.</p>
        </div>
        <div class="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <a href="/pengaduan" class="bg-white p-6 rounded-xl shadow border-t-4 border-orange-500 hover:shadow-lg transition transform hover:-translate-y-1">
                <i class="fa-solid fa-camera text-4xl text-orange-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2">Lapor Masalah</h3>
                <p class="text-slate-500">Laporkan jalan rusak atau fasilitas desa bermasalah. Wajib upload bukti foto (S3).</p>
            </a>
            <a href="/laporan" class="bg-white p-6 rounded-xl shadow border-t-4 border-blue-500 hover:shadow-lg transition transform hover:-translate-y-1">
                <i class="fa-solid fa-bars-progress text-4xl text-blue-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2">Tracking Laporan</h3>
                <p class="text-slate-500">Pantau status laporan warga lainnya. Foto bukti didistribusikan via CDN berkecepatan tinggi.</p>
            </a>
            <a href="/surat" class="bg-white p-6 rounded-xl shadow border-t-4 border-purple-500 hover:shadow-lg transition transform hover:-translate-y-1">
                <i class="fa-solid fa-file-signature text-4xl text-purple-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2">Pengajuan Surat</h3>
                <p class="text-slate-500">Ajukan surat domisili atau keterangan usaha tanpa perlu antre di balai desa.</p>
            </a>
        </div>
    `;
    res.send(renderUI('Beranda', content, 'home'));
});

// 2. Halaman Form Pengaduan
app.get('/pengaduan', (req, res) => {
    const content = `
        <div class="max-w-3xl mx-auto px-4 py-10">
            <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div class="bg-orange-500 px-6 py-4 text-white">
                    <h2 class="text-2xl font-bold"><i class="fa-solid fa-bullhorn mr-2"></i> Formulir Pengaduan</h2>
                </div>
                <form action="/upload" method="post" enctype="multipart/form-data" class="p-6 space-y-5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Nama Pelapor</label>
                            <input type="text" name="nama" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 focus:ring-2 focus:ring-orange-500 outline-none">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Kategori Masalah</label>
                            <select name="kategori" class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 outline-none">
                                <option value="Infrastruktur Jalan/Jembatan">Infrastruktur Jalan</option>
                                <option value="Fasilitas Umum">Fasilitas Umum</option>
                                <option value="Kebersihan/Lingkungan">Kebersihan/Lingkungan</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Deskripsi Lengkap</label>
                        <textarea name="deskripsi" rows="3" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 outline-none" placeholder="Ceritakan detail lokasinya..."></textarea>
                    </div>
                    <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <label class="block font-semibold text-orange-800 mb-2"><i class="fa-solid fa-cloud-arrow-up"></i> Upload Foto Bukti (Masuk ke S3)</label>
                        <input type="file" name="dokumen" accept="image/*" required class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200">
                    </div>
                    <button type="submit" class="w-full bg-orange-600 hover:bg-orange-700 text-white text-lg font-bold py-3 rounded-lg shadow-md transition">Kirim Laporan Warga</button>
                </form>
            </div>
        </div>
    `;
    res.send(renderUI('Buat Pengaduan', content, 'pengaduan'));
});

// 3. Halaman Daftar Hasil Laporan (Baca dari RDS & S3 via CDN)
app.get('/laporan', (req, res) => {
    db.query("SELECT * FROM sipedas.laporan_warga ORDER BY tanggal DESC", (err, results) => {
        let cardsHTML = '';
        
        if (err || results.length === 0) {
            cardsHTML = `<div class="col-span-full text-center py-10 text-slate-500">Belum ada data laporan dari warga.</div>`;
        } else {
            results.forEach(row => {
                // Konversi tanggal
                const tgl = new Date(row.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                // Label warna status
                const statusColor = row.status === 'Selesai' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                
                cardsHTML += `
                <div class="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200 flex flex-col">
                    <img src="${cdnUrl}/${row.nama_file}" alt="Foto Bukti" class="w-full h-48 object-cover bg-slate-100" onerror="this.src='https://via.placeholder.com/400x200?text=Gambar+Tidak+Ditemukan'">
                    <div class="p-5 flex-grow flex flex-col">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-xs font-bold text-orange-600 uppercase tracking-wider">${row.kategori}</span>
                            <span class="text-xs font-semibold px-2 py-1 rounded ${statusColor}">${row.status}</span>
                        </div>
                        <p class="text-slate-800 font-medium mb-3 flex-grow">"${row.deskripsi}"</p>
                        <div class="mt-auto border-t pt-3 text-xs text-slate-500 flex justify-between">
                            <span><i class="fa-solid fa-user"></i> ${row.nama}</span>
                            <span><i class="fa-regular fa-calendar"></i> ${tgl}</span>
                        </div>
                    </div>
                </div>
                `;
            });
        }

        const content = `
            <div class="max-w-7xl mx-auto px-4 py-10">
                <div class="text-center mb-10">
                    <h2 class="text-3xl font-bold text-slate-800">Tracking Status Laporan</h2>
                    <p class="text-slate-500 mt-2">Galeri transparansi laporan warga. Gambar diload dari Amazon S3 menggunakan ImageKit CDN.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    ${cardsHTML}
                </div>
            </div>
        `;
        res.send(renderUI('Hasil Laporan', content, 'laporan'));
    });
});

// 4. Halaman Pengajuan Surat (Fitur Baru)
app.get('/surat', (req, res) => {
    const content = `
        <div class="max-w-2xl mx-auto px-4 py-10">
            <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div class="bg-purple-600 px-6 py-4 text-white">
                    <h2 class="text-2xl font-bold"><i class="fa-solid fa-envelope-open-text mr-2"></i> Pengajuan e-Surat</h2>
                </div>
                <form action="/submit-surat" method="post" class="p-6 space-y-5">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Nomor Induk Kependudukan (NIK)</label>
                        <input type="number" name="nik" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Nama Pemohon</label>
                        <input type="text" name="nama" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Jenis Surat</label>
                        <select name="jenis_surat" class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3">
                            <option>Surat Keterangan Domisili</option>
                            <option>Surat Keterangan Usaha (SKU)</option>
                            <option>Surat Pengantar RT/RW</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Keperluan</label>
                        <input type="text" name="keperluan" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3" placeholder="Contoh: Pembuatan Rekening Bank">
                    </div>
                    <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-md">Ajukan Surat</button>
                </form>
            </div>
        </div>
    `;
    res.send(renderUI('e-Surat', content, 'surat'));
});

// ========================================================
// PROSES DATABASE & S3 (POST METHODS)
// ========================================================

// Endpoint Upload Laporan (S3 + RDS)
app.post('/upload', upload.single('dokumen'), (req, res) => {
    const { nama, kategori, deskripsi } = req.body;
    
    // Format nama file agar aman dari spasi
    const safeFileName = Date.now() + '-' + req.file.originalname.replace(/\\s+/g, '-');
    
    const params = {
        Bucket: 'berkas-desa',
        Key: safeFileName,
        Body: req.file.buffer
    };
    
    s3.upload(params, (err, data) => {
        if (err) return res.status(500).send("Upload ke S3 Gagal: " + err.message);
        
        const sql = "INSERT INTO sipedas.laporan_warga (nama, kategori, deskripsi, nama_file) VALUES (?, ?, ?, ?)";
        db.query(sql, [nama, kategori, deskripsi, params.Key], (dbErr) => {
            if (dbErr) return res.send("<script>alert('Gagal simpan ke RDS.'); window.location='/pengaduan';</script>");
            
            // Jika sukses, langsung arahkan ke halaman daftar laporan
            res.redirect('/laporan');
        });
    });
});

// Endpoint Simpan Pengajuan Surat (RDS Saja)
app.post('/submit-surat', (req, res) => {
    const { nik, nama, jenis_surat, keperluan } = req.body;
    
    const sql = "INSERT INTO sipedas.pengajuan_surat (nik, nama, jenis_surat, keperluan) VALUES (?, ?, ?, ?)";
    db.query(sql, [nik, nama, jenis_surat, keperluan], (err) => {
        if (err) return res.send("<script>alert('Gagal mengajukan surat.'); window.location='/surat';</script>");
        res.send("<script>alert('Pengajuan surat berhasil masuk ke Database RDS! Silakan tunggu proses validasi.'); window.location='/';</script>");
    });
});

app.listen(3000, () => console.log('Aplikasi Sipedas siap di Port 3000'));