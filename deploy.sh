#!/bin/bash
# Server deployment script

echo "Guncel kodlar Github'dan cekiliyor..."
git pull origin main

echo "Eski Prisma V7 yapilandirmasi siliniyor (varsa)..."
rm -f prisma.config.ts

echo "Gerekli paketler yukleniyor..."
npm install

echo "Veritabani (Prisma ORM) yapilandiriliyor..."
export DATABASE_URL="file:/var/www/entegrasyon/prisma/dev.db"
npx prisma db push
npx prisma generate

echo "Next.js projesi derleniyor..."
npm run build

echo "Standalone dosyalari kopyalaniyor..."
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

echo "PM2 ile proje yeniden baslatiliyor..."
pm2 restart ecosystem.config.js --update-env

echo "Guncelleme tamamlandi! Yayinda:"
pm2 status
