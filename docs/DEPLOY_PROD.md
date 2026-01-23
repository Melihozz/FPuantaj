# Prod Deploy (Docker + PostgreSQL + Prisma)

Bu doküman, projeyi Ubuntu sunucuda Docker Compose + PostgreSQL ile **güvenli (veri kaybetmeden)** deploy etmek için kısa rehberdir.

> Varsayımlar:
> - Docker compose içinde `db` (PostgreSQL) servisi var ve volume bağlı (örn. `postgres_data`)
> - Prisma `provider = "postgresql"` ve `DATABASE_URL` ile bağlanıyor
> - Prod’da **reset/push** komutları kullanılmayacak

---

## 1) Güncelleme (kod değişince)

Sunucuda proje klasörüne gir:

```bash
cd /opt/FPuantaj
git pull
docker compose up -d --build
```

Log kontrol:

```bash
docker compose logs -f backend
```

---

## 2) DB schema değiştiyse (migration)

Prod’da **sadece** şu:

```bash
docker compose exec backend npx prisma migrate deploy
```

> Not: Bu komut mevcut migration’ları uygular, normal şartlarda veri silmez.

---

## 3) İlk kurulum / kullanıcı seed

İlk kurulumda (veya admin/user yoksa) seed:

```bash
docker compose exec backend npx prisma db seed
```

Bu projede seed, varsayılan kullanıcıları oluşturur:
- `admin / admin123`
- `user / user123`

---

## 4) Prod’da KULLANMA (veri kaybettirir)

Aşağıdakileri prod’da çalıştırma:

- `npx prisma migrate reset`
- `npx prisma migrate dev`
- `npx prisma db push`
- `npx prisma db push --force-reset`

---

## 5) Backup

Örnek manuel backup (dosyayı bulunduğun dizine yazar):

```bash
docker compose exec -T db pg_dump -U postgres -d puantaj > backup_$(date +%F).sql
```

> Servis adı / kullanıcı / db adı sende farklıysa (db=postgres vb.) buna göre düzenle.

---

## 6) Restore (test/geri dönüş)

Önce hedef DB’ye restore edeceğin bir yer belirle (tercihen test DB).

Genel mantık:

```bash
cat backup_YYYY-MM-DD.sql | docker compose exec -T db psql -U postgres -d puantaj
```

> Restore öncesi hedef DB’yi boşaltma/yeniden yaratma stratejisi sende nasıl ise ona göre uygulanır.

---

## 7) Rollback (hızlı geri dönüş)

En güvenli rollback genelde:
- Uygulamayı bir önceki commit’e döndürmek (git checkout)
- `docker compose up -d --build`

Migration rollback Prisma’da otomatik değildir; bu yüzden:
- Prod’a migration çıkmadan önce test etmek
- Backup/restore planını hazır tutmak
önemlidir.

