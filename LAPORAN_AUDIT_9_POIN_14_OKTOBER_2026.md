# KOTEKA DIGITAL — Laporan Penyempurnaan Audit Manual 9 Poin

Tanggal: 14 Oktober 2026  
Sumber: `KOTEKA_DIGITAl(1).zip` (168 entri asli)  
Output: ZIP siap diekstrak pada root proyek, **tanpa folder pembungkus tambahan**.

## Ruang lingkup perubahan

| No. | Permintaan | Implementasi |
| --- | --- | --- |
| 1 | Pemilih bahasa publik di kanan atas | Pemilih **ID/EN** di navbar React, dan kontrol di kanan atas halaman artikel statis. Preferensi tersimpan di browser. Menerjemahkan label/menu serta sejumlah komponen publik yang telah dipetakan; teks panjang artikel belum diterjemahkan seluruhnya. |
| 2 | UI mobile premium | Perbaikan jarak navbar, susunan kontrol bahasa, lebar kartu paket, navigasi harga, overflow horizontal, konsistensi form pada layar kecil (CSS tambahan terisolasi). Desain/efek hover sebelumnya dipertahankan. |
| 3 | Animasi masuk saat scroll | `IntersectionObserver` dan Web Animations API untuk heading/kartu terpilih; satu kali saat masuk viewport; menghormati `prefers-reduced-motion`; tidak mengganti definisi animasi hover bawaan. |
| 4 | Paket bisa ditambah & bergeser | Memperbaiki komponen React agar menggunakan `pricingPlans` tersimpan dari Workspace, bukan selalu daftar awal; menampilkan semua paket berstatus Publik dengan kartu horizontal dan tombol panah. |
| 5 | Harga bergerak nonstop | Dua set paket disusun berdampingan, bergerak horizontal dari kanan ke kiri memakai `requestAnimationFrame`, berulang tanpa celah; bisa digeser menggunakan tombol atau swipe, dengan jeda singkat ketika pengunjung berinteraksi. Gerak dihentikan untuk preferensi *reduced motion*. |
| 6 | Tema gelap/terang dashboard | Tombol navbar dengan ikon SVG dari koleksi Font Awesome yang sudah dipakai Workspace; tema disimpan pada `localStorage`, dengan styling kedua mode. |
| 7 | Tooltip menu saat sidebar tertutup | Tooltip teks menu muncul saat hover atau fokus pada ikon sidebar desktop yang diringkas; hilang ketika pointer meninggalkan navigasi. |
| 8 | Form konsultasi, pesan masuk, notifikasi | Endpoint serverless `/api/leads`, penyimpanan Upstash Redis, notifikasi email Resend/WhatsApp Business Cloud API jika dikonfigurasi; menu **Pesan Masuk**, notifikasi navbar, pembacaan dan status pesan, serta login server khusus inbox. |
| 9 | Hapus 3 kartu Keunggulan Beranda | Menghapus seed/default 3 kartu, skema editor, daftar CMS, perhitungan dashboard serta tampilan ringkasan terkait. Data lama dibersihkan ketika Workspace memuat. |

## Alur pesan masuk dan otomasi

1. Pengunjung melengkapi Form Konsultasi, termasuk persetujuan.
2. Form mengirim `POST /api/leads` dengan JSON tervalidasi; server menerapkan batas frekuensi permintaan.
3. Upstash Redis menyimpan pesan secara persisten; server mengirim pemberitahuan email dan/atau template WhatsApp sesuai integrasi yang tersedia.
4. Dashboard `/admin/` → Pesan Masuk membaca data dengan `GET /api/inbox`, **hanya** setelah login akun server (`POST /api/admin-session`). Form login Workspace sebelumnya masih berupa akses frontend prototipe dan **tidak** mengizinkan akses inbox tanpa autentikasi server.
5. Ikon lonceng memeriksa pesan baru secara berkala (25 detik); klik menghapus badge notifikasi yang sudah terlihat dan membuka Pesan Masuk. Pesan juga bisa ditandai sebagai sudah dibaca.
6. Bila backend tidak berjalan, formulir tetap memberikan jalur manual membuka WhatsApp atau aplikasi email. Membuka jendela WhatsApp/mailto **tidak berarti** pesan sudah terkirim otomatis.

**Penting:** notifikasi email dan WhatsApp tidak dapat aktif hanya dengan mengunggah ZIP. Harus diatur environment variable di hosting kompatibel dan menggunakan akun pengirim yang aktif. WhatsApp menggunakan **template yang telah disetujui Meta** untuk pesan baru yang diinisiasi bisnis.

### Konfigurasi yang harus disiapkan di hosting Vercel

Gunakan menu proyek → Settings → Environment Variables (jangan menaruh token asli di ZIP/GitHub):

| Environment variable | Keterangan |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Endpoint REST Upstash Redis untuk penyimpanan pesan. |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST Redis rahasia. |
| `KOTEKA_ADMIN_EMAIL` | Email autentikasi server untuk Pesan Masuk. |
| `KOTEKA_ADMIN_PASSWORD` | Kata sandi server yang kuat, **berbeda dari akun demo Workspace**. |
| `KOTEKA_SESSION_SECRET` | Rahasia acak minimal 32 karakter untuk tanda tangan cookie login. |
| `RESEND_API_KEY` | Opsional: token API Resend untuk email otomatis. |
| `KOTEKA_FROM_EMAIL` | Opsional: pengirim pada domain terverifikasi Resend, contoh `noreply@domain-anda.com`. |
| `KOTEKA_NOTIFY_EMAIL` | Opsional: alamat Koteka Digital penerima pesan baru. |
| `META_WA_TOKEN` | Opsional: token resmi WhatsApp Cloud API (Meta). |
| `META_WA_PHONE_NUMBER_ID` | Opsional: ID nomor pengirim WhatsApp Business. |
| `META_WA_TO` | Opsional: nomor administrator penerima notifikasi dalam format internasional. |
| `META_WA_TEMPLATE_NAME` | Opsional: nama template pesan yang disetujui untuk **dua parameter teks**: nama pelanggan dan nama bisnis. |
| `META_WA_TEMPLATE_LANGUAGE` | Opsional: kode bahasa template, nilai default `id`. |

Untuk mengaktifkan inbox diperlukan **lima variabel pertama**. Email/WhatsApp hanya aktif jika variabel terkait juga lengkap dan penyedia menerima pengiriman. Gunakan HTTPS pada domain produksi agar cookie sesi `Secure` berfungsi.

**Hosting static-only atau cPanel biasa tanpa runtime Node/Vercel Functions tidak dapat menjalankan endpoint JavaScript serverless ini.** Bila lokasi deploy masih Hostinger static hosting, diperlukan penyesuaian backend khusus PHP/Laravel atau deploy fungsi pada Vercel dan pengaturan API origin yang benar. Jangan menganggap integrasi sudah aktif sebelum pengujian di domain asli.

## Hasil validasi yang dilakukan

- `node --check` pada **38** berkas `.js` di direktori `assets`, `admin` dan `api`: **lulus**.
- Parsing CSS tambahan `assets/koteka-audit9-public.css` dan `admin/styles.css` dengan `tinycss2`: **tanpa error parsing tingkat atas**.
- Uji unit/integrasi API dengan Redis test-double: respons penyimpanan lead `201`, akses inbox tanpa login `401`, login server `200`, baca satu pesan, menandai sudah dibaca, dan logout: **lulus**.
- Mengganti cache Service Worker dari `v10` menjadi `v11-audit9` dan memasukkan aset baru agar pembaruan diproses saat deploy.
- **Tidak dapat menyelesaikan pengujian interaksi visual otomatis**: Chromium sandbox menolak akses URL localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`). Karena itu, tidak ada klaim Lighthouse 100 atau bebas bug di perangkat nyata.
- Tidak ada kredensial akun layanan atau token rahasia yang dimasukkan ke ZIP.

## Batasan penting

- Label bahasa Indonesia/English berfungsi untuk kosakata yang dipetakan. Isi lengkap artikel atau teks editorial yang belum memiliki padanan terjemahan tidak dipaksakan menjadi bahasa Inggris.
- Kartu yang ditambahkan dari Workspace saat ini berada di `localStorage` dan hanya muncul di website publik pada **browser/origin yang sama**. Pengelolaan konten lintas perangkat memerlukan backend CMS tambahan, yang berada di luar ruang lingkup audit ini.
- Form konsultasi menggunakan endpoint serverless Vercel yang siap dikonfigurasi, **belum terbukti aktif pada domain produksi** tanpa deployment, Upstash Redis, dan akses provider email/WhatsApp.
- Akun demo Workspace tetap diwarisi dari proyek sebelumnya; sistem ini **belum boleh dianggap autentikasi CMS yang aman**. Kredensial produksi inbox disediakan hanya sebagai variable server.

## File penting yang diperbarui atau ditambahkan

- `assets/PricingSectionContainer-CyXKa1Eh.js`
- `assets/ContactSectionContainer-DXOfP6-K.js`
- `assets/appBoot-634c31a5ba.js`
- `assets/koteka-audit9-public.js` dan `.css`
- `admin/index.html`, `admin/app.js`, `admin/styles.css`, `admin/fa-icons.js`
- `api/leads.js`, `api/inbox.js`, `api/admin-session.js`, `server/koteka.js`
- `sw.js`, `package.json`, dan HTML publik untuk ketersediaan kontrol bahasa.

**Pedoman pascadeploy:** jalankan tes pengiriman nyata satu kali, pastikan email masuk dan template WA terkirim, buka `/admin/#inbox` dan login dengan akun server, periksa notifikasi dan tandai dibaca, lalu uji halaman harga dan navbar di HP 320/375/390/430 px serta desktop.
