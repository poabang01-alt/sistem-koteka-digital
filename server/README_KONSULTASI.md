# Aktivasi konsultasi otomatis

Form mengirim ke `POST /api/leads`. Server menyimpan pesan, lalu mengirim notifikasi melalui kanal yang dipilih pengunjung. Dashboard membaca pesan dari `GET /api/inbox` setelah login administrator server. Klik lonceng membuka Pesan Masuk; angka belum dibaca berkurang ketika pesan ditandai dibaca.

## Konfigurasi hosting

Endpoint dalam folder `api/` menggunakan fungsi Node di Vercel. Hosting file statis saja tidak menjalankan fungsi ini. Atur variabel berikut pada environment hosting, bukan dalam file JavaScript publik atau chat:

| Variabel | Penggunaan |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | URL REST database Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token database |
| `KOTEKA_ADMIN_EMAIL` | Email untuk login administrator server |
| `KOTEKA_ADMIN_PASSWORD` | Kata sandi administrator server |
| `KOTEKA_SESSION_SECRET` | Nilai acak rahasia untuk sesi administrator |
| `RESEND_API_KEY` | Kunci API Resend |
| `KOTEKA_FROM_EMAIL` | Alamat pengirim dari domain yang diverifikasi di Resend |
| `KOTEKA_NOTIFY_EMAIL` | Email Koteka Digital penerima konsultasi |
| `META_WA_TOKEN` | Token WhatsApp Cloud API |
| `META_WA_PHONE_NUMBER_ID` | ID nomor pengirim WhatsApp Cloud API |
| `META_WA_TO` | Nomor Koteka Digital penerima konsultasi, diawali `62` |
| `META_WA_TEMPLATE_NAME` | Nama template konsultasi yang disetujui Meta |
| `META_WA_TEMPLATE_LANGUAGE` | Kode bahasa template, default `id` |

## Template WhatsApp

Gunakan template dengan tepat tiga parameter body, dalam urutan: nama pengunjung, nama bisnis, ringkasan konsultasi. Contoh isi untuk diajukan di WhatsApp Manager:

> Konsultasi baru dari {{1}} untuk {{2}}. Detail: {{3}}. Baca pesan lengkap di https://kotekadigital.com/admin/#inbox

Ringkasan WhatsApp dibatasi 650 karakter. Isi pesan lengkap tersimpan di dashboard. Template lama yang hanya memiliki dua parameter harus diganti dengan template tiga parameter yang disetujui.

API email memakai alamat pengunjung sebagai `reply_to`, sehingga administrator dapat membalas langsung. Status “Diterima layanan pengiriman” berarti API penyedia menerima permintaan; status tersebut bukan konfirmasi bahwa penerima sudah membaca pesan.

Referensi: [API email Resend](https://resend.com/docs/api-reference/emails/send-email), [template WhatsApp dari Meta](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/template/).

## Pemeriksaan setelah aktivasi

1. Deploy ulang setelah variabel hosting disimpan.
2. Login di `/admin/` dengan akun administrator server. Pada Pesan Masuk, periksa indikator Email dan WhatsApp.
3. Kirim satu konsultasi melalui Email dan satu melalui WhatsApp menggunakan data uji milik sendiri.
4. Pastikan notifikasi bertambah, klik lonceng menuju Pesan Masuk, periksa isi serta status pengiriman, lalu tandai dibaca.

Jika penyimpanan berhasil tetapi pengiriman kanal gagal, formulir menjelaskan bahwa pesan tetap masuk dashboard. Jika server belum aktif, formulir mempertahankan isian dan menampilkan kesalahan. Formulir tidak mengklaim bahwa membuka aplikasi WhatsApp/email merupakan pengiriman otomatis.
