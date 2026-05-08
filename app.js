const express = require('express');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const multer = require('multer');
const app = express();

// 1. Koneksi Database RDS 
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Otomatis membuat tabel jika belum ada biar nggak error
db.connect((err) => {
    if (err) {
        console.log("Menunggu konfigurasi DB_HOST dari ECS...");
    } else {
        console.log("Berhasil terhubung ke RDS!");
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS laporan_warga (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(255),
                kategori VARCHAR(100),
                deskripsi TEXT,
                nama_file VARCHAR(255),
                tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        db.query(createTableQuery, (err) => {
            if (err) console.log("Gagal membuat tabel:", err);
            else console.log("Tabel laporan_warga siap digunakan.");
        });
    }
});

// 2. Konfigurasi S3
const s3 = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
    // Link CDN ImageKit kamu 
    const cdnUrl = "https://ik.imagekit.io/desa"; 
    
    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SIPEDAS - Sistem Desa Terpadu</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        </head>
        <body class="bg-gray-50 text-gray-800 font-sans antialiased">

            <nav class="bg-emerald-600 shadow-lg">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between h-16 items-center">
                        <div class="flex items-center space-x-3">
                            <i class="fa-solid fa-leaf text-white text-2xl"></i>
                            <span class="font-bold text-white text-xl tracking-wider">SIPEDAS</span>
                        </div>
                        <div class="hidden md:flex space-x-4">
                            <a href="#" class="text-white hover:bg-emerald-700 px-3 py-2 rounded-md font-medium">Beranda</a>
                            <a href="#layanan" class="text-emerald-100 hover:text-white px-3 py-2 font-medium">Layanan</a>
                            <a href="#galeri" class="text-emerald-100 hover:text-white px-3 py-2 font-medium">Galeri</a>
                        </div>
                    </div>
                </div>
            </nav>

            <div class="bg-emerald-700 text-white py-16">
                <div class="max-w-7xl mx-auto px-4 text-center">
                    <h1 class="text-4xl md:text-5xl font-extrabold mb-4">Pelayanan Publik Desa Digital</h1>
                    <p class="text-lg md:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">Sistem terintegrasi untuk memudahkan warga melakukan pengaduan, pengajuan surat, dan melihat informasi desa secara transparan.</p>
                </div>
            </div>

            <div id="layanan" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="text-center mb-12">
                    <h2 class="text-3xl font-bold text-gray-800">Layanan Mandiri Warga</h2>
                    <div class="w-24 h-1 bg-emerald-500 mx-auto mt-4 rounded-full"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-emerald-500 hover:shadow-lg transition">
                        <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl mb-4">
                            <i class="fa-solid fa-file-signature"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">E-Surat Pengantar</h3>
                        <p class="text-gray-500 mb-4">Ajukan surat pengantar RT/RW, surat domisili, dan keterangan usaha secara online.</p>
                        <button class="text-emerald-600 font-semibold hover:text-emerald-700">Buat Surat &rarr;</button>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-orange-500 hover:shadow-lg transition md:col-span-2">
                        <div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xl mb-4">
                            <i class="fa-solid fa-bullhorn"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Formulir Pengaduan Warga</h3>
                        <p class="text-gray-500 mb-4">Laporkan fasilitas desa yang rusak atau masalah ketertiban umum. Lampirkan foto bukti.</p>
                        
                        <form action="/upload" method="post" enctype="multipart/form-data" class="bg-gray-50 p-4 rounded-lg border">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Nama Pelapor</label>
                                    <input type="text" name="nama" required class="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-emerald-500 focus:border-emerald-500" placeholder="Nama lengkap">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                                    <select name="kategori" class="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-emerald-500 focus:border-emerald-500">
                                        <option value="Infrastruktur">Infrastruktur Jalan/Jembatan</option>
                                        <option value="Kebersihan">Sampah & Kebersihan</option>
                                        <option value="Keamanan">Ketertiban & Keamanan</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Detail Laporan</label>
                                <textarea name="deskripsi" rows="2" class="w-full border-gray-300 rounded-md shadow-sm p-2 border focus:ring-emerald-500 focus:border-emerald-500" placeholder="Jelaskan masalahnya..."></textarea>
                            </div>
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Foto Bukti (S3 Storage)</label>
                                <input type="file" name="dokumen" required class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100">
                            </div>
                            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-md transition shadow-md">
                                <i class="fa-solid fa-cloud-arrow-up mr-2"></i> Kirim Laporan
                            </button>
                        </form>
                    </div>

                </div>
            </div>

            <div id="galeri" class="bg-gray-100 py-12 border-t">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="text-center mb-8">
                        <h2 class="text-3xl font-bold text-gray-800">Transparansi Pembangunan</h2>
                        <p class="text-gray-500 mt-2">Dokumentasi disalurkan menggunakan CDN untuk akses super cepat.</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="bg-white p-4 rounded-xl shadow-sm border">
                            <img src="${cdnUrl}/desa.jpg" alt="Pembangunan Desa" class="w-full h-64 object-cover rounded-lg mb-3">
                            <h4 class="font-bold text-lg">Pengecoran Jalan Dusun</h4>
                            <p class="text-sm text-gray-500"><i class="fa-solid fa-bolt text-yellow-500"></i> Asset delivered by ImageKit CDN</p>
                        </div>
                        <div class="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-center h-64 md:h-auto bg-gray-50">
                            <div class="text-center text-gray-400">
                                <i class="fa-regular fa-image text-4xl mb-2"></i>
                                <p>Tambahkan foto lain di S3 Anda</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer class="bg-gray-800 text-gray-300 py-8 text-center text-sm">
                <div class="max-w-7xl mx-auto px-4">
                    <p class="mb-2 font-semibold text-white">Infrastruktur Sistem Berjalan Pada:</p>
                    <div class="flex justify-center space-x-4 mb-4">
                        <span class="bg-gray-700 px-3 py-1 rounded"><i class="fa-brands fa-aws text-orange-400"></i> ECS Fargate</span>
                        <span class="bg-gray-700 px-3 py-1 rounded"><i class="fa-solid fa-database text-blue-400"></i> RDS MySQL</span>
                        <span class="bg-gray-700 px-3 py-1 rounded"><i class="fa-solid fa-bucket text-green-400"></i> Amazon S3</span>
                    </div>
                    <p>&copy; 2026 SIPEDAS - Evaluasi 2 Cloud Computing.</p>
                </div>
            </footer>
        </body>
        </html>
    `);
});

// Fitur Upload & Simpan ke Database [cite: 43, 44]
app.post('/upload', upload.single('dokumen'), (req, res) => {
    const { nama, kategori, deskripsi } = req.body;
    
    // 1. Upload file ke S3
    const params = {
        Bucket: 'berkas-desa', // Pastikan nama bucket sesuai
        Key: Date.now() + '-' + req.file.originalname, // Pakai timestamp biar nama file gak bentrok
        Body: req.file.buffer
    };
    
    s3.upload(params, (err, data) => {
        if (err) {
            console.error("Gagal upload S3:", err);
            return res.status(500).send("Upload ke S3 Gagal: " + err.message);
        }
        
        // 2. Simpan data teks ke RDS Database 
        const sql = "INSERT INTO laporan_warga (nama, kategori, deskripsi, nama_file) VALUES (?, ?, ?, ?)";
        db.query(sql, [nama, kategori, deskripsi, params.Key], (dbErr) => {
            if (dbErr) {
                console.error("Gagal simpan ke DB:", dbErr);
                // Biarpun gagal DB, file udah masuk S3.
                return res.send("<script>alert('File masuk ke S3, tapi gagal simpan ke RDS. Cek koneksi database.'); window.location='/';</script>");
            }
            
            res.send("<script>alert('Berhasil! Laporan tersimpan di RDS dan Lampiran tersimpan di S3.'); window.location='/';</script>");
        });
    });
});

app.listen(3000, () => console.log('Aplikasi Sipedas siap di Port 3000'));