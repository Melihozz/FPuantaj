# Local Geliştirme (Mac + Postgres.app + Prisma)

Bu doküman, projeyi **sunucuya atmadan önce localde** (Mac’te) çalıştırıp değişiklikleri görmen için hazırlanmıştır.

> Not: Prod verilerin değerli olduğu için localde **ayrı bir database** kullanacağız: `puantaj_dev`.

---

## 1) Postgres.app’i çalıştır

- Postgres.app’i aç
- Status **Running** olmalı (Port: **5432**)

---

## 2) Terminalde `psql/createdb` komutlarını kalıcı yap

Bir kere çalıştır:

```bash
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Kontrol:

```bash
createdb --version
psql --version
```

---

## 3) Local dev database oluştur

```bash
createdb puantaj_dev
```

> Zaten varsa `already exists` benzeri bir şey görebilirsin, sorun değil.

---

## 4) Backend’i local DB’ye bağla

Backend dizinine geç:

```bash
cd /Users/oz/Desktop/Puantaj/backend
```

DB bağlantısını env ile ver:

```bash
export DATABASE_URL="postgresql://oz@localhost:5432/puantaj_dev?schema=public"
```

> `oz` kısmı senin Mac kullanıcı/role adın. Postgres.app’de görünen role farklıysa onu yaz.

---

## 5) Prisma şemasını local DB’ye uygula (localde hızlı yol)

SQLite → PostgreSQL geçişinden dolayı migration lock uyuşmazlığı görebilirsin (P3019).  
Local dev için en pratik yol:

```bash
npx prisma db push
npx prisma generate
npx prisma db seed
```

> Bu yöntem **migration üretmez**, sadece local dev DB’yi ayağa kaldırır.

---

## 6) Backend’i çalıştır

```bash
npm run dev
```

Backend health:
- `http://localhost:3000/health`

---

## 7) Frontend’i çalıştır

Yeni terminal aç:

```bash
cd /Users/oz/Desktop/Puantaj/frontend
npm run dev
```

Frontend:
- `http://localhost:5173/`

---

## 8) Login bilgileri (seed ile gelir)

- `admin / admin123`
- `user / user123`

---

## 9) Local dev DB’yi sıfırlamak istersen (sadece local!)

```bash
dropdb puantaj_dev || true
createdb puantaj_dev
```

Sonra tekrar:

```bash
cd /Users/oz/Desktop/Puantaj/backend
export DATABASE_URL="postgresql://oz@localhost:5432/puantaj_dev?schema=public"
npx prisma db push
npx prisma db seed
```

---

## 10) Önemli uyarı (prod için)

Prod’da şunları **kullanma**:
- `npx prisma migrate reset`
- `npx prisma migrate dev`
- `npx prisma db push`

Prod’da sadece:
- `npx prisma migrate deploy`

