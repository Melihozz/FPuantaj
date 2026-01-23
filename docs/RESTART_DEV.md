# Projeyi Durdurduktan Sonra Tekrar Çalıştırma (Local)

Bu doküman, **kurulum/migration adımlarını tekrar etmeden** projeyi durdurup sonra geri geldiğinde hızlıca ayağa kaldırman içindir. Kurulum için `docs/LOCAL_DEV.md` kullan.

---

## 1) Postgres.app’i aç (DB servisinin çalıştığından emin ol)

- Postgres.app’i aç
- Status **Running** olmalı (Port: **5432**)

> Bilgisayarı yeni açtıysan, `createdb/psql` komutları çalışmıyorsa `docs/LOCAL_DEV.md` içindeki PATH adımını (Bölüm 2) bir kere yapmış olman gerekir.

---

## 2) Backend’i çalıştır (DB bağlantısını vererek)

Bir terminal aç:

```bash
cd /Users/oz/Desktop/Puantaj/backend
export DATABASE_URL="postgresql://oz@localhost:5432/puantaj_dev?schema=public"
npm run dev
```

- Backend health: `http://localhost:3000/health`

> `oz` kısmı senin Postgres role adın. (Genelde Mac kullanıcı adı.) Farklıysa onu yaz.

---

## 3) Frontend’i çalıştır

İkinci terminal aç:

```bash
cd /Users/oz/Desktop/Puantaj/frontend
npm run dev
```

- Frontend: `http://localhost:5173/`

---

## 4) “DB yok / tablo yok” gibi bir hata görürsen (sadece local için)

Eğer `puantaj_dev` DB hiç yoksa:

```bash
createdb puantaj_dev
```

Sonra backend tarafında (aynı terminalde) şemayı local DB’ye uygula:

```bash
cd /Users/oz/Desktop/Puantaj/backend
export DATABASE_URL="postgresql://oz@localhost:5432/puantaj_dev?schema=public"
npx prisma db push
npx prisma generate
npx prisma db seed
```

Ardından tekrar:

```bash
npm run dev
```

---

## 5) Login bilgileri (seed ile gelir)

- `admin / admin123`
- `user / user123`

