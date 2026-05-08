const express = require('express');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const multer = require('multer');
const app = express();

const cdnUrl = "https://ik.imagekit.io/desa"; 

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
});

db.connect((err) => {
    if (err) {
        console.log("Menunggu konfigurasi DB_HOST...");
    } else {
        console.log("Berhasil terhubung ke server database!");
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

                // Bikin tabel Pengajuan Surat
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

// 2. Konfigurasi Penyimpanan Berkas
const s3 = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware untuk parsing form data
app.use(express.urlencoded({ extended: true }));

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
                <div class="hidden md:flex space-x-1">
                    <a href="/" class="px-3 py-2 rounded-md font-medium transition ${activeMenu === 'home' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'}"><i class="fa-solid fa-house mr-1"></i> Beranda</a>
                    <a href="/pengaduan" class="px-3 py-2 rounded-md font-medium transition ${activeMenu === 'pengaduan' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'}"><i class="fa-solid fa-bullhorn mr-1"></i> Buat Laporan</a>
                    <a href="/laporan" class="px-3 py-2 rounded-md font-medium transition ${activeMenu === 'laporan' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'}"><i class="fa-solid fa-list-check mr-1"></i> Cek Laporan</a>
                    <a href="/surat" class="px-3 py-2 rounded-md font-medium transition ${activeMenu === 'surat' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'}"><i class="fa-solid fa-envelope-open-text mr-1"></i> e-Surat</a>
                    <a href="/status-surat" class="px-3 py-2 rounded-md font-medium transition ${activeMenu === 'status-surat' ? 'bg-emerald-900 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white'}"><i class="fa-solid fa-file-circle-check mr-1"></i> Status Surat</a>
                </div>
            </div>
        </div>
    </nav>

    <main class="flex-grow w-full">
        ${content}
    </main>

    <footer class="bg-slate-900 text-slate-400 py-6 text-center text-sm mt-auto border-t-4 border-emerald-600">
        <p class="mb-2 text-white font-semibold">Sistem Pelayanan Desa Digital Terintegrasi (SIPEDAS)</p>
        <p class="text-xs text-slate-500">Mewujudkan Pelayanan Publik yang Transparan, Cepat, dan Tepat.</p>
        <p class="text-xs text-slate-500 mt-2">&copy; 2026 Pemerintah Desa.</p>
    </footer>
</body>
</html>
`;

// 1. Halaman Beranda
app.get('/', (req, res) => {
    const content = `
        <div class="bg-emerald-800 text-white py-20 text-center shadow-inner">
            <h1 class="text-4xl md:text-5xl font-extrabold mb-4">Portal Pelayanan Warga</h1>
            <p class="text-lg text-emerald-200 max-w-2xl mx-auto">Selamat datang di sistem layanan terpadu. Urus administrasi dan laporkan masalah di lingkungan Anda dengan mudah dari mana saja.</p>
        </div>
        <div class="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="/pengaduan" class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-orange-500 hover:shadow-lg transition transform hover:-translate-y-1">
                <i class="fa-solid fa-camera text-4xl text-orange-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2">Lapor Masalah</h3>
                <p class="text-slate-500 text-sm">Laporkan jalan rusak atau fasilitas desa bermasalah. Wajib melampirkan bukti foto.</p>
            </a>
            <a href="/laporan" class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-blue-500 hover:shadow-lg transition transform hover:-translate-y-1">
                <i class="fa-solid fa-magnifying-glass-location text-4xl text-blue-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2">Cek Laporan</h3>
                <p class="text-slate-500 text-sm">Pantau daftar laporan dari warga sekitar dan lihat tanggapan dari pemerintah desa.</p>
            </a>
            <a href="/surat" class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-purple-500 hover:shadow-lg transition transform hover:-translate-y-1">
                <i class="fa-solid fa-file-signature text-4xl text-purple-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2">Buat e-Surat</h3>
                <p class="text-slate-500 text-sm">Ajukan surat domisili atau keterangan usaha secara online tanpa antre.</p>
            </a>
            <a href="/status-surat" class="bg-white p-6 rounded-xl shadow-sm border-t-4 border-emerald-500 hover:shadow-lg transition transform hover:-translate-y-1">
                <i class="fa-solid fa-clock-rotate-left text-4xl text-emerald-500 mb-4"></i>
                <h3 class="text-xl font-bold mb-2">Status Surat</h3>
                <p class="text-slate-500 text-sm">Cek apakah surat permohonan Anda sudah selesai dicetak atau masih diproses.</p>
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
                    <h2 class="text-2xl font-bold"><i class="fa-solid fa-bullhorn mr-2"></i> Formulir Pengaduan Warga</h2>
                </div>
                <form action="/upload" method="post" enctype="multipart/form-data" class="p-6 space-y-5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                            <input type="text" name="nama" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 focus:ring-2 focus:ring-orange-500 outline-none">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Kategori Laporan</label>
                            <select name="kategori" class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-500">
                                <option value="Infrastruktur & Jalan">Infrastruktur & Jalan</option>
                                <option value="Fasilitas Umum">Fasilitas Umum</option>
                                <option value="Kebersihan Lingkungan">Kebersihan Lingkungan</option>
                                <option value="Keamanan & Ketertiban">Keamanan & Ketertiban</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Detail Kejadian/Kondisi</label>
                        <textarea name="deskripsi" rows="3" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 outline-none focus:ring-2 focus:ring-orange-500" placeholder="Jelaskan detail masalah dan sebutkan lokasinya..."></textarea>
                    </div>
                    <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <label class="block font-semibold text-orange-800 mb-2"><i class="fa-solid fa-image"></i> Unggah Foto Bukti (.jpg / .png)</label>
                        <input type="file" name="dokumen" accept="image/*" required class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 cursor-pointer">
                    </div>
                    <button type="submit" class="w-full bg-orange-600 hover:bg-orange-700 text-white text-lg font-bold py-3 rounded-lg shadow-md transition">Kirim Laporan</button>
                </form>
            </div>
        </div>
    `;
    res.send(renderUI('Buat Pengaduan', content, 'pengaduan'));
});

// 3. Halaman Daftar Hasil Laporan (Dengan fitur klik gambar)
app.get('/laporan', (req, res) => {
    db.query("SELECT * FROM sipedas.laporan_warga ORDER BY tanggal DESC", (err, results) => {
        let cardsHTML = '';
        
        if (err || results.length === 0) {
            cardsHTML = `<div class="col-span-full text-center py-10 text-slate-500 bg-white rounded-xl shadow-sm border border-slate-200">Belum ada data laporan dari warga. Jadilah yang pertama melaporkan.</div>`;
        } else {
            results.forEach(row => {
                const tgl = new Date(row.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const statusColor = row.status === 'Selesai' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                
                cardsHTML += `
                <div class="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200 flex flex-col group">
                    <div class="relative overflow-hidden bg-slate-100">
                        <a href="${cdnUrl}/${row.nama_file}" target="_blank" title="Klik untuk lihat ukuran penuh">
                            <img src="${cdnUrl}/${row.nama_file}" alt="Foto Bukti" class="w-full h-48 object-cover transform transition duration-300 group-hover:scale-105" onerror="this.src='https://via.placeholder.com/400x200?text=Gambar+Tidak+Ditemukan'">
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition duration-300 flex items-center justify-center">
                                <i class="fa-solid fa-expand text-white opacity-0 group-hover:opacity-100 text-2xl drop-shadow-md"></i>
                            </div>
                        </a>
                    </div>
                    <div class="p-5 flex-grow flex flex-col">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-xs font-bold text-orange-600 uppercase tracking-wider">${row.kategori}</span>
                            <span class="text-xs font-semibold px-2 py-1 rounded shadow-sm ${statusColor}">${row.status}</span>
                        </div>
                        <p class="text-slate-800 font-medium mb-3 flex-grow line-clamp-3">"${row.deskripsi}"</p>
                        <div class="mt-auto border-t border-slate-100 pt-3 text-xs text-slate-500 flex flex-col space-y-1">
                            <span><i class="fa-solid fa-user text-slate-400 w-4"></i> ${row.nama}</span>
                            <span><i class="fa-regular fa-calendar text-slate-400 w-4"></i> ${tgl} WIB</span>
                        </div>
                    </div>
                </div>
                `;
            });
        }

        const content = `
            <div class="max-w-7xl mx-auto px-4 py-10">
                <div class="mb-8 border-b pb-4 border-slate-200 flex justify-between items-end">
                    <div>
                        <h2 class="text-3xl font-bold text-slate-800">Transparansi Laporan Publik</h2>
                        <p class="text-slate-500 mt-1">Daftar aduan warga dan status penanganannya.</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    ${cardsHTML}
                </div>
            </div>
        `;
        res.send(renderUI('Cek Laporan', content, 'laporan'));
    });
});

// 4. Halaman Pengajuan Surat
app.get('/surat', (req, res) => {
    const content = `
        <div class="max-w-2xl mx-auto px-4 py-10">
            <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div class="bg-purple-600 px-6 py-4 text-white">
                    <h2 class="text-2xl font-bold"><i class="fa-solid fa-envelope-open-text mr-2"></i> Pengajuan Surat Elektronik</h2>
                </div>
                <form action="/submit-surat" method="post" class="p-6 space-y-5">
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Nomor Induk Kependudukan (NIK)</label>
                        <input type="number" name="nik" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Masukkan 16 digit NIK">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Nama Pemohon</label>
                        <input type="text" name="nama" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Pilih Jenis Surat</label>
                        <select name="jenis_surat" class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 focus:ring-2 focus:ring-purple-500 outline-none">
                            <option>Surat Keterangan Domisili</option>
                            <option>Surat Keterangan Usaha (SKU)</option>
                            <option>Surat Pengantar RT/RW</option>
                            <option>Surat Keterangan Tidak Mampu (SKTM)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-700 mb-1">Tujuan/Keperluan</label>
                        <input type="text" name="keperluan" required class="w-full rounded-lg bg-slate-50 border border-slate-300 p-3 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Contoh: Pembuatan Rekening Bank, Syarat Beasiswa">
                    </div>
                    <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold py-3 rounded-lg shadow-md transition">Ajukan Surat Sekarang</button>
                </form>
            </div>
        </div>
    `;
    res.send(renderUI('Pengajuan Surat', content, 'surat'));
});

// 5. Halaman Tracking Status Surat (Fitur Baru Permintaanmu)
app.get('/status-surat', (req, res) => {
    db.query("SELECT * FROM sipedas.pengajuan_surat ORDER BY tanggal DESC", (err, results) => {
        let rowsHTML = '';
        
        if (err || results.length === 0) {
            rowsHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">Belum ada data pengajuan surat saat ini.</td></tr>`;
        } else {
            results.forEach(row => {
                const tgl = new Date(row.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                // Sembunyikan sebagian NIK demi privasi (Fitur pro)
                const maskedNik = row.nik.substring(0, 4) + "********" + row.nik.substring(12, 16);
                const statusBadge = row.status === 'Selesai' 
                    ? '<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"><i class="fa-solid fa-check mr-1"></i>Selesai</span>' 
                    : '<span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold"><i class="fa-solid fa-spinner animate-spin mr-1"></i>Diproses</span>';
                
                rowsHTML += `
                <tr class="border-b hover:bg-slate-50 transition">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${tgl}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">${row.nama}<br><span class="text-xs text-slate-400">${maskedNik}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-700">${row.jenis_surat}</td>
                    <td class="px-6 py-4 text-sm text-slate-500 truncate max-w-xs">${row.keperluan}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">${statusBadge}</td>
                </tr>
                `;
            });
        }

        const content = `
            <div class="max-w-5xl mx-auto px-4 py-10">
                <div class="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    <div class="bg-emerald-600 px-6 py-4 text-white flex justify-between items-center">
                        <h2 class="text-xl font-bold"><i class="fa-solid fa-file-circle-check mr-2"></i>Daftar Pengajuan Surat</h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-200">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Pemohon</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Jenis Surat</th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Keperluan</th>
                                    <th scope="col" class="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-slate-200">
                                ${rowsHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        res.send(renderUI('Status Surat', content, 'status-surat'));
    });
});

// 6. Halaman Sukses Notifikasi Keren (Pengganti Alert)
app.get('/sukses', (req, res) => {
    const pesan = req.query.pesan || "Aksi berhasil dilakukan!";
    const link = req.query.link || "/";
    const content = `
        <div class="max-w-md mx-auto mt-20 text-center bg-white p-8 rounded-2xl shadow-xl border-t-8 border-emerald-500">
            <div class="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
                <i class="fa-solid fa-check"></i>
            </div>
            <h2 class="text-3xl font-bold text-slate-800 mb-3">Berhasil!</h2>
            <p class="text-slate-600 mb-8 text-lg">${pesan}</p>
            <a href="${link}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition inline-block">Selesai & Kembali</a>
        </div>
    `;
    res.send(renderUI('Berhasil', content, 'none'));
});

// Proses Laporan Warga
app.post('/upload', upload.single('dokumen'), (req, res) => {
    const { nama, kategori, deskripsi } = req.body;
    const safeFileName = Date.now() + '-' + req.file.originalname.replace(/\\s+/g, '-');
    
    const params = { Bucket: 'berkas-desa', Key: safeFileName, Body: req.file.buffer };
    
    s3.upload(params, (err, data) => {
        if (err) return res.send(`<script>alert('Terjadi kesalahan jaringan.'); window.history.back();</script>`);
        
        const sql = "INSERT INTO sipedas.laporan_warga (nama, kategori, deskripsi, nama_file) VALUES (?, ?, ?, ?)";
        db.query(sql, [nama, kategori, deskripsi, params.Key], (dbErr) => {
            if (dbErr) return res.send(`<script>alert('Gagal mencatat laporan.'); window.history.back();</script>`);
            
            // Redirect ke halaman SUKSES
            res.redirect('/sukses?pesan=Terima+kasih!+Laporan+Anda+berhasil+terkirim+dan+akan+segera+ditindaklanjuti.&link=/laporan');
        });
    });
});

// Proses e-Surat
app.post('/submit-surat', (req, res) => {
    const { nik, nama, jenis_surat, keperluan } = req.body;
    const sql = "INSERT INTO sipedas.pengajuan_surat (nik, nama, jenis_surat, keperluan) VALUES (?, ?, ?, ?)";
    
    db.query(sql, [nik, nama, jenis_surat, keperluan], (err) => {
        if (err) return res.send(`<script>alert('Gagal mengajukan surat.'); window.history.back();</script>`);
        
        // Redirect ke halaman SUKSES
        res.redirect('/sukses?pesan=Pengajuan+surat+berhasil!+Silakan+pantau+status+surat+Anda+secara+berkala.&link=/status-surat');
    });
});

app.listen(3000, () => console.log('Aplikasi SIPEDAS (Final Version) siap berjalan!'));