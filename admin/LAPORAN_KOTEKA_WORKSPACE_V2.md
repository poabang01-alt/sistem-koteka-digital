# Koteka Workspace V2 — Laporan Pembaruan (12 Oktober 2026)

## Ruang lingkup
Perubahan **hanya di dalam folder `admin/`**. Halaman publik, aset publik, SEO, navigasi publik, serta file konfigurasi pada direktori utama **tidak dimodifikasi**.

## Implementasi

1. Data konten awal dibaca dari `admin/seed.js` yang diekstraksi dari build website Koteka Digital yang dilampirkan: 3 anggota tim, 3 kategori dan 18 layanan, 3 paket harga, 6 portofolio, 12 artikel, dan 13 FAQ. Testimoni contoh sintetis tidak disertakan.
2. Sidebar dikelompokkan sebagai **Overview**, **Halaman Website**, **Konten & Publikasi**, dan **Komunikasi**. Live Trafik dan Log Aktivitas terpisah sejajar dengan Dashboard.
3. Sidebar mendukung buka/tutup, mode ringkas di desktop (preferensi tersimpan) dan drawer plus overlay di mobile; menggunakan tombol dengan label aksesibel.
4. Ikon di Workspace diganti menjadi vektor **Font Awesome** lokal (`fa-icons.js`), tanpa perlu mengunduh font/CDN.
5. Navbar memiliki **pencarian global** menu dan semua kategori konten (judul/deskripsi/metadata), pencarian instan dan shortcut `Ctrl + K` / `Cmd + K`. Hasil pencarian dapat membuka menu atau editor yang sesuai.
6. Profil admin dapat dilihat dan diubah (nama, email, telepon, jabatan, bio) dengan upload/ganti/hapus foto dan kompresi WebP. Data profil mengikuti penyimpanan lokal untuk tahap HTML/JS.
7. Status Prototype/Data Dummy dan kartu sidebar terkait dihapus. Warna, form, tombol, kartu, spasi, dan gaya responsif diselaraskan pada berbagai ukuran.
8. Tombol Logout dibuat berbeda dengan aksen merah, tanpa mengubah alur logout.
9. Generator trafik palsu dihapus. Data trafik awal = **kosong**, dan tidak ada polling/simulasi pengunjung buatan. Halaman analitik menyediakan **impor CSV/JSON** dari sistem analitik sebenarnya, filter waktu dan perangkat, grafik, serta PDF. Riwayat log administrator benar-benar bersumber dari tindakan di Workspace.
10. Label laporan PDF yang mengklaim "demo" telah disesuaikan.

## Catatan penting keakuratan data

- **Konten**: data awal bersumber dari build publik yang diunggah, bukan diambil langsung dari database server.
- **Live Trafik**: tidak mengklaim mengetahui trafik global; untuk angka asli, ekspor catatan dari Google Analytics/alat lain lalu impor ke menu Live Trafik. Penghitungan metrik unik pada impor data agregat (`users`) adalah penjumlahan angka per baris/periode dan bukan deduplikasi lintas periode. Unggah hanya data yang diizinkan untuk digunakan.
- **Log Aktivitas**: tindakan pengelola Workspace dicatat. Kunjungan semua pengguna internet **tidak** otomatis terpantau oleh HTML/CSS/JavaScript statis tanpa pemasangan pelacakan atau API. File publik sengaja tidak diubah sesuai perintah.
- **Penyimpanan**: konten admin/profil/analitik masih disimpan di browser lokal; penyimpanan tidak tersinkron lintas perangkat dan dapat hilang jika data browser dihapus. Ekspor backup JSON secara berkala.
- **Autentikasi**: halaman login sebelumnya menggunakan kredensial pada frontend. Hal ini tidak aman untuk produksi terbuka. Sistem admin saat ini belum memiliki backend autentikasi nyata. Batasi akses `/admin/` melalui server, misalnya autentikasi yang diterapkan di sisi server, sebelum deploy ke internet. **Jangan gunakan data sensitif atau password asli** pada prototipe ini.
- **Sinkronisasi publik**: edit Workspace belum diterbitkan ke website publik karena file publik tidak diubah dan tidak tersedia endpoint/API CMS.

## Akses yang diwarisi dari ZIP sebelumnya

- Halaman: `/admin/`
- Email: `admin@kotekadigital.com`
- Password: `KotekaDemo@2026`

Kredensial di atas adalah **kredensial frontend bawaan, bukan akun aman dari server**. Ganti setelah implementasi backend autentikasi.

## Format impor analitik

CSV contoh struktur (isi dengan data asli ekspor analitik):

```csv
date,page,channel,device,session,views
2026-10-12T08:00:00+09:00,/,Direct,Desktop,sesi-abc,1
```

Kolom `date` wajib; kolom lain memiliki alias seperti `pagePath`, `deviceCategory`, `pageViews`, `sessionSourceMedium`, `users`. Bisa juga impor JSON array dengan properti yang sama. Maksimum 4 MB dan 15.000 baris per impor. Statistik tidak dibuat otomatis.

## Pemeriksaan dan keterbatasan QA

- `node --check` untuk `app.js`, `pdf.js`, `fa-icons.js`, `seed.js`.
- Tes logika Node VM: pembacaan seed, pencarian global, parser CSV, dan verifikasi jumlah awal trafik/log = 0.
- Pemeriksaan SHA-256 semua file di luar `admin/` terhadap ZIP masukan.
- Pemeriksaan arsip ZIP (`testzip`) serta semua path HTML/CSS/JS lokal.
- **Browser otomatis tidak dapat diuji**: instance Chromium di lingkungan ini mengembalikan `ERR_BLOCKED_BY_ADMINISTRATOR` bahkan untuk alamat `data:` dan file lokal. Ini adalah keterbatasan uji, bukan bukti situs berjalan atau tidak berjalan pada browser pengguna. QA visual/responsif dan uji interaksi manual pada browser target tetap diperlukan.

## Referensi teknis

Font Awesome local icon usage: https://docs.fontawesome.com/web/setup/host-yourself/svg-js
