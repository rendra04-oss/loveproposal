# Romantic Proposal Site

Website mini-game romantis untuk mengajak teman dekat menjadi pacar.

## Jalankan di komputer
1. Install Node.js 20+.
2. `npm install`
3. Set environment variable `ADMIN_KEY` dengan password admin yang kamu pilih.
4. `npm start`
5. Buka `http://localhost:3000`.
6. Dashboard history ada di `http://localhost:3000/#admin`.

## Deploy
Cocok untuk Railway/Render/Fly.io/VPS yang mendukung Node.js dan persistent disk. Karena data disimpan di SQLite, pastikan deploy memakai storage yang persisten.

## Catatan privasi
Halaman awal secara jelas memberi tahu pemain bahwa progres permainan disimpan untuk pengirim. Dashboard memakai admin key, tetapi untuk penggunaan publik sebaiknya ganti autentikasi ke login yang lebih kuat sebelum dipakai serius.
