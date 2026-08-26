# Railway Update Guide for Future AI Chats

Bu dosya, yeni bir AI sohbeti projeyi ve Railway kurulumunu hızlıca anlasın diye yazıldı. Amaç: güncelleme yaparken mevcut canlı sistemi, GitHub bağlantısını ve veritabanını bozmadan ilerlemek.

## Proje Özeti

- Proje adı: `FPuantaj`
- GitHub repo: `https://github.com/Melihozz/FPuantaj`
- Ana branch: `main`
- Uygulama iki parçalıdır:
  - `backend`: Express + Prisma + PostgreSQL API
  - `frontend`: Vite + React arayüz
- Prod ortam Railway üzerindedir.

## Railway Yapısı

Railway projesinde üç servis vardır:

- `Backend`
  - GitHub repo: `Melihozz/FPuantaj`
  - Root Directory: `/backend`
  - Public domain: `https://fpuantaj-production.up.railway.app`
  - Health check: `https://fpuantaj-production.up.railway.app/health`
  - Beklenen build komutu: `npm install && npx prisma generate && npm run build`
  - Beklenen start komutu: `npm start`
- `Frontend`
  - GitHub repo: `Melihozz/FPuantaj`
  - Root Directory: `/frontend`
  - Public domain güncel ekranda şu şekilde görünmüştü: `https://faithful-laughter-production-824c.up.railway.app`
  - Önceden görülen kısa domain: `https://faithful-laughter-production.up.railway.app`
  - Beklenen build komutu: `npm install && npm run build`
  - Beklenen start komutu: `npm run preview -- --host 0.0.0.0 --port $PORT`
- `Postgres`
  - Railway PostgreSQL servisidir.
  - `postgres-volume` verileri tutar.
  - Bu volume veya Postgres servisi silinmemelidir.

## Backend Environment Variables

Backend servisinde en az şunlar olmalı:

- `DATABASE_URL`: Railway Postgres bağlantısı. Genelde shared/reference variable olarak Postgres servisinden gelir.
- `JWT_SECRET`: prod için zorunlu, en az 32 karakter olmalı.
- `CORS_ORIGIN`: frontend domainlerini içerir.

`CORS_ORIGIN` için mevcut canlı frontend domaini mutlaka ekli olmalı:

```txt
https://faithful-laughter-production-824c.up.railway.app
```

Birden fazla domain gerekiyorsa virgülle yaz:

```txt
https://faithful-laughter-production-824c.up.railway.app,https://faithful-laughter-production.up.railway.app,http://localhost:5173
```

`CORS_ORIGIN` eksik veya yanlışsa login ekranında `Failed to fetch` görülür ve browser console'da `CORS policy` hatası çıkar.

## Frontend Environment Variables

Frontend servisinde API adresi backend'e gitmelidir:

```txt
VITE_API_URL=https://fpuantaj-production.up.railway.app/api
```

Bu yanlışsa frontend backend'e istek atamaz.

## Normal Güncelleme Akışı

Yeni kod değişikliği yapılınca en güvenli akış:

```bash
# Proje kökünde çalış
git status
git add .
git commit -m "Kısa ve doğru commit mesajı"
git push
```

Sonra Railway:

1. `Backend` ve `Frontend` servislerinde deploy başlamış mı kontrol et.
2. Deploy kartındaki commit mesajı GitHub'daki son commit ile aynı mı bak.
3. Deploy otomatik başlamadıysa ilgili serviste `Settings > Source` bölümünü kontrol et:
   - Repo `Melihozz/FPuantaj` olmalı.
   - Branch `main` olmalı.
   - Root Directory backend için `/backend`, frontend için `/frontend` olmalı.
   - `Auto deploy is disabled` görünüyorsa `Enable` yapılmalı.
   - `New version of the upstream repo available` görünüyorsa `Update` butonuna basılmalı.

## Database Schema Değiştiyse

Prisma schema veya migration değiştiyse prod veritabanına migration uygulanır.

Örnek schema değişikliği dosyaları:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**/migration.sql`

Prod'da sadece şu komut kullanılmalı:

```bash
npx prisma migrate deploy
```

Bu komut Railway'de `Backend` servisinin `Console` sekmesinde çalıştırılır. Postgres servisindeki SQL editor veya Database ekranına yazılmaz.

Sıra:

1. Kod GitHub'a pushlanır.
2. Railway `Backend` yeni commit ile deploy edilir.
3. Backend deploy başarılı olduktan sonra `Backend > Console` açılır.
4. `npx prisma migrate deploy` çalıştırılır.
5. Çıktıda `All migrations have been successfully applied.` görülmelidir.

## Prod'da Asla Kullanma

Canlı Railway database üzerinde şu komutlar kullanılmamalı:

```bash
npx prisma migrate reset
npx prisma migrate dev
npx prisma db push
npx prisma db push --force-reset
npx prisma db seed
```

Not: `npx prisma db seed` ilk kurulumda kullanıcı oluşturmak için çalıştırılmıştı. Normal güncellemelerde tekrar çalıştırma.

## Son Yaşanan Önemli Güncelleme

2026-08-25 tarihinde şu commit GitHub'a pushlandı:

```txt
374169f Add managed work-area categories and apply related payroll updates
```

Bu güncelleme yeni `WorkAreaCategory` tablosunu ekledi. Prod database'e şu migration uygulanmıştır:

```txt
20260815220000_add_work_area_category
```

Migration sonucu:

```txt
All migrations have been successfully applied.
```

Bu güncellemeden sonra CORS için backend'e `CORS_ORIGIN` eklenmesi gerekmiştir. Çünkü backend artık sadece izin verilen frontend domainlerinden gelen tarayıcı isteklerini kabul eder.

## Sık Hatalar ve Anlamları

### Frontend yeni ama backend eski

Belirti:

```txt
POST /api/overtime/batch 404
```

Anlamı: Frontend yeni endpoint'i çağırıyor ama Railway `Backend` hâlâ eski commit'te.

Çözüm:

- `Backend > Deployments` ekranında commit mesajını kontrol et.
- Eski commit görünüyorsa `Settings > Source` içinde `Update` veya `Auto Deploy Enable` yap.
- Yeni backend deploy başarılı olunca gerekirse migration çalıştır.

### Login ekranında Failed to fetch

Belirti:

```txt
Failed to fetch
CORS policy: No 'Access-Control-Allow-Origin' header
```

Anlamı: Backend `CORS_ORIGIN` içinde frontend domaini yok.

Çözüm:

- `Backend > Variables` içine doğru frontend domainini ekle.
- Değişikliği `Apply / Deploy` ile uygula.

### Backend health çalışıyor ama login çalışmıyor

`/health` endpoint'i browser dışı isteklerde CORS'a takılmayabilir. Login browser üzerinden geldiği için CORS'a takılır. Bu yüzden health başarılı olsa bile `CORS_ORIGIN` kontrol edilmelidir.

## AI İçin Kısa Kontrol Listesi

Yeni AI sohbeti güncelleme yapacaksa:

1. Önce `git status`, `git remote -v`, `git log -3 --oneline` kontrol et.
2. `.env`, secret, credential, token gibi dosyaları commit'e alma.
3. Küçük ve ilgili değişiklik yap; unrelated refactor yapma.
4. Backend değiştiyse mümkünse `npm run build` ve ilgili testleri çalıştır.
5. Frontend değiştiyse mümkünse `npm run build` çalıştır.
6. GitHub'a push sonrası Railway deploy commit mesajını kontrol et.
7. Prisma migration varsa sadece `Backend > Console` içinde `npx prisma migrate deploy` çalıştırılacağını kullanıcıya söyle.
8. Prod veriyi silebilecek hiçbir reset/push/seed komutunu önermeden önce kullanıcıyı açıkça uyar.

