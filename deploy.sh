#!/bin/bash
# Server deployment script
echo "Guncel kodlar Github'dan cekiliyor..."
git pull origin main

echo "Gerekli paketler yukleniyor..."
npm install

echo "Veritabani (Prisma ORM) yapilandiriliyor..."
export DATABASE_URL="file:./dev.db"
npx prisma db push
npx prisma generate

echo "Next.js projesi derleniyor..."
npm run build

echo "PM2 ile proje yeniden baslatiliyor..."
pm2 restart ikas-entegrasyon

echo "Guncelleme tamamlandi! Yayinda:"
pm2 status
