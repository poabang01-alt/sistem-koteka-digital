# Koteka Digital — Paket Deployment Final (10 Oktober 2026)

Paket produksi website statis Koteka Digital. Konten, navigasi, struktur React/Vite terkompilasi, komponen utama, identitas warna, dan tampilan premium lama dipertahankan. Perubahan ditargetkan pada audit performa, keamanan, animasi, stabilitas, dan kesiapan deployment.

## Instalasi

- **Apache/Hostinger**: salin **isi ZIP** langsung ke `public_html` (termasuk `.htaccess`). Pastikan HTTPS aktif, modul `mod_headers`, `mod_rewrite` dan kompresi tersedia.
- **Vercel**: gunakan root folder deployment yang berisi `index.html` dan `vercel.json` agar header keamanan dan aturan trailing slash diterapkan.
- Sebelum menghapus website lama, simpan backup. Unggah satu paket secara utuh supaya `sw.js` v10 dan berkas aset konsisten.
- Sesudah deployment, buka Home, Layanan, Portofolio, Blog, minimal satu artikel, Kebijakan Privasi, halaman 404, dan formulir kontak pada desktop/mobile. Pastikan HTTPS, Google Fonts, CDN Font Awesome, Google Maps, WhatsApp/email, dan PWA dapat berjalan.

## Perubahan audit

1. JavaScript loader Font Awesome dibuat sebagai file eksternal, sehingga `script-src 'self'` tidak memerlukan `unsafe-inline`.
2. Header CSP, perlindungan clickjacking, MIME sniffing, HSTS dan COOP diperketat pada Apache maupun Vercel.
3. Service Worker v10 membatasi ruang cache halaman/aset/media, memisahkan konten publik dari API/private path, dan memiliki fallback offline.
4. Tombol ulang pada halaman offline dipindah dari handler inline ke JS terpisah agar kompatibel dengan CSP.
5. Form konsultasi hanya menganggap respons API 2xx JSON sebagai keberhasilan penyimpanan otomatis; fallback WhatsApp/email tidak mengosongkan input sebelum benar-benar dikirim.
6. Interaksi scroll menghindari forced synchronous layout; focus keyboard tetap jelas dan reduced-motion tetap dihormati.
7. Preload stylesheet Vite membantu memotong waterfall awal tanpa mengubah styling/animasi React.
8. Dua varian gambar artikel disiapkan (768px dan 1536px) dalam AVIF/WebP dengan responsive srcset; ikon favicon menggunakan aset PNG yang sudah tersedia dan lebih kecil.

## Batas sistem

- Aplikasi ini adalah frontend **statis**. Endpoint `POST /api/leads` tidak dibuat di paket ini; jika belum tersedia, formulir membuka WhatsApp atau email, bukan menyimpan lead ke database.
- Header keamanan efektif bila hosting membaca `.htaccess` (Apache) atau `vercel.json` (Vercel). Konfirmasi pada server produksi.
- Pemeriksaan statis berhasil; skor Lighthouse, respons keamanan server aktual dan bebas bug 100% membutuhkan verifikasi deployment secara langsung.

## Struktur

`index.html`, `assets/`, `img/`, `blog/`, `layanan/`, `portofolio/`, `privacy-policy/`, `downloads/`, `404.html`, `offline.html`, `sw.js`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `.htaccess`, `vercel.json`.

Dokumentasi audit lama dan konfigurasi editor tidak dimasukkan ke public deployment untuk mengurangi eksposur informasi internal. Laporan final disediakan terpisah dari ZIP deployment.
