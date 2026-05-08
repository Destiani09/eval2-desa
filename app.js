const express = require('express');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const multer = require('multer');
const app = express();

// 1. Koneksi Database RDS (Tanpa milih database dulu)
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
        
        // Bikin database 'sipedas' kalau belum ada
        db.query("CREATE DATABASE IF NOT EXISTS sipedas", (err) => {
            if (err) console.log("Gagal buat database:", err);
            else {
                console.log("Database 'sipedas' siap!");
                
                // Bikin tabel di dalam database sipedas
                const createTableQuery = `
                    CREATE TABLE IF NOT EXISTS sipedas.laporan_warga (
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
    }
});

// 2. Konfigurasi S3
const s3 = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
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
                    </div>
                </div>
            </nav>

            <div class="bg-emerald-700 text-white py-16">
                <div class="max-w-7xl mx-auto px-4 text-center">
                    <h1 class="text-4xl md:text-5xl font-extrabold mb-4">Pelayanan Publik Desa Digital</h1>
                    <p class="text-lg md:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">Sistem terintegrasi untuk memudahkan warga melakukan pengaduan.</p>
                </div>
            </div>

            <div id="layanan" class="max-w-4xl mx-auto px-4 py-12">
                <div class="bg-white rounded-xl shadow-md p-6 border-t-4 border-orange-500">
                    <h3 class="text-xl font-bold mb-2"><i class="fa-solid fa-bullhorn text-orange-500"></i> Formulir Pengaduan Warga</h3>
                    <form action="/upload" method="post" enctype="multipart/form-data" class="bg-gray-50 p-4 rounded-lg border mt-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nama Pelapor</label>
                                <input type="text" name="nama" required class="w-full rounded-md p-2 border">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                                <select name="kategori" class="w-full rounded-md p-2 border">
                                    <option value="Infrastruktur">Infrastruktur Jalan/Jembatan</option>
                                    <option value="Kebersihan">Sampah & Kebersihan</option>
                                </select>
                            </div>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Detail Laporan</label>
                            <textarea name="deskripsi" rows="2" class="w-full rounded-md p-2 border"></textarea>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Foto Bukti (S3 Storage)</label>
                            <input type="file" name="dokumen" required class="block w-full text-sm text-gray-500 border p-2 bg-white">
                        </div>
                        <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-md">
                            Kirim Laporan
                        </button>
                    </form>
                </div>

                <div class="mt-12 text-center">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">Galeri Desa</h2>
                    <img src="${cdnUrl}/desa.jpg" alt="Pembangunan Desa" class="w-full max-w-lg mx-auto h-64 object-cover rounded-lg shadow border">
                    <p class="text-sm text-gray-500 mt-2"><i class="fa-solid fa-bolt text-yellow-500"></i> Asset delivered by ImageKit CDN</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Fitur Upload & Simpan ke Database
app.post('/upload', upload.single('dokumen'), (req, res) => {
    const { nama, kategori, deskripsi } = req.body;
    
    const params = {
        Bucket: 'berkas-desa',
        Key: Date.now() + '-' + req.file.originalname,
        Body: req.file.buffer
    };
    
    s3.upload(params, (err, data) => {
        if (err) return res.status(500).send("Upload ke S3 Gagal: " + err.message);
        
        // Perhatikan bagian ini: Kita langsung tembak ke database sipedas.laporan_warga
        const sql = "INSERT INTO sipedas.laporan_warga (nama, kategori, deskripsi, nama_file) VALUES (?, ?, ?, ?)";
        db.query(sql, [nama, kategori, deskripsi, params.Key], (dbErr) => {
            if (dbErr) return res.send("<script>alert('Gagal simpan ke RDS: " + dbErr.message + "'); window.location='/';</script>");
            
            res.send("<script>alert('Sempurna! Laporan tersimpan di RDS dan Foto tersimpan di S3.'); window.location='/';</script>");
        });
    });
});

app.listen(3000, () => console.log('Aplikasi Sipedas siap di Port 3000'));