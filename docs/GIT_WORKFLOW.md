# GitHub’a Kod Gönderme (Mini Doküman)

Bu doküman, `/Users/oz/Desktop/Puantaj` projesinde yaptığın değişiklikleri **GitHub’a** göndermek için gereken en basit adımları anlatır.

---

## 1) Bir kereye mahsus (ilk kurulum)

Bu adımlar sende **tamam** (repo init + push yaptın). Yine de referans olsun:

```bash
cd /Users/oz/Desktop/Puantaj
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/Melihozz/FPuantaj.git
git push -u origin main
```

---

## 2) Her güncellemede (en kısa doğru akış)

Kodda değişiklik yaptıktan sonra sırayla:

```bash
cd /Users/oz/Desktop/Puantaj
git add .
git commit -m "Kısa açıklama: ne değişti?"
git push
```

> **Not**: `git commit` çalışmazsa genelde “add” yapılmamıştır ya da değişiklik yoktur.

---

## 3) Kontrol komutları (push öncesi/sonrası)

### Değişen dosyaları görmek

```bash
git status
```

### Son commit’leri görmek

```bash
git log --oneline -10
```

### GitHub remote doğru mu?

```bash
git remote -v
```

---

## 4) Sık karşılaşılan durumlar

### “nothing to commit”
- Ya dosyaları kaydetmedin,
- Ya `git add .` yapmadın,
- Ya da gerçekten değişiklik yok.

Çözüm:

```bash
git status
```

### “rejected” / “non-fast-forward” (push reddedildi)
Repo’ya başka bir yerden commit gelmiş olabilir.

```bash
git pull --rebase
git push
```

### GitHub şifre istemiyor / token istiyor
GitHub şifre yerine **Personal Access Token** ister (HTTPS kullanıyorsan).
Token’ı şifre yerine girersin.

---

## 5) Önerilen commit mesajı formatı

- `UI: Puantaj tablosu kolonlarını düzenle`
- `Backend: Payroll sortOrder ekle`
- `Fix: Audit log batch başlıkları`

