const express = require('express');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const multer = require('multer');
const app = express();

// Koneksi Database RDS (Konfigurasi via Environment Variables)
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Konfigurasi S3 (AWS SDK akan otomatis ambil kredensial dari IAM Role ECS)
const s3 = new AWS.S3();
const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
    // URL ImageKit kamu sebagai pengganti CloudFront [cite: 45]
    const cdnUrl = "https://ik.imagekit.io/desa"; 
    
    res.send(`
        <html>
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-gray-100 p-10 text-center font-sans">
            <div class="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border-t-8 border-blue-600">
                <h1 class="text-3xl font-bold text-gray-800">SIPEDAS Online</h1>
                <p class="text-gray-500 mt-2">Sistem Pelayanan Publik Desa Digital</p>
                <hr class="my-6">
                
                <div class="bg-blue-50 p-4 rounded-lg mb-6 text-left">
                    <h3 class="font-bold text-blue-800 mb-2">📸 Upload Laporan Warga (Fitur S3)</h3>
                    <form action="/upload" method="post" enctype="multipart/form-data" class="flex gap-2">
                        <input type="file" name="dokumen" class="border p-2 rounded bg-white w-full text-sm">
                        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Upload</button>
                    </form>
                </div>

                <h3 class="font-bold text-gray-700 mb-2">🏘️ Dokumentasi Desa (Fitur CDN)</h3>
                <img src="${cdnUrl}/desa.jpg" class="w-full rounded-lg shadow-md mb-4 border" alt="Asset via ImageKit">
                
                <div class="text-xs text-gray-400 mt-6 italic">
                    Infrastructure: ECS Fargate | Database: RDS MySQL | Storage: S3
                </div>
            </div>
        </body>
        </html>
    `);
});

// Fitur Upload ke S3 [cite: 43]
app.post('/upload', upload.single('dokumen'), (req, res) => {
    const params = {
        Bucket: 'berkas-desa', // Ganti dengan nama bucket kamu
        Key: req.file.originalname,
        Body: req.file.buffer
    };
    s3.upload(params, (err) => {
        if (err) return res.status(500).send("Upload ke S3 Gagal");
        res.send("<script>alert('Laporan terkirim ke S3!'); window.location='/';</script>");
    });
});

app.listen(3000, () => console.log('Aplikasi Sipedas siap di Port 3000'));