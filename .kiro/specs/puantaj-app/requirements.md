# Requirements Document

## Introduction

Excel'de tutulan puantaj tablosunu web ortamına taşıyan, Excel benzeri tablo görünümü ve kullanımı sunan bir uygulama. Sistem çalışan yönetimi, otomatik maaş hesaplamaları ve detaylı işlem geçmişi (log) modüllerini içerir. React frontend, Node.js backend ve PostgreSQL veritabanı kullanılacaktır.

## Glossary

- **Puantaj_Sistemi**: Ana uygulama sistemi
- **Çalışan_Modülü**: Çalışan kayıtlarını yöneten modül
- **Puantaj_Tablosu**: Excel benzeri hesaplama ve veri giriş tablosu
- **Log_Modülü**: İşlem geçmişini kaydeden ve gösteren modül
- **Kimlik_Doğrulama_Modülü**: Kullanıcı giriş ve yetkilendirme modülü
- **Günlük_Ücret**: Maaş / 30 formülü ile hesaplanan günlük çalışma ücreti
- **Hak_Edilen_Maaş**: Günlük ücret × Çalıştığı gün sayısı
- **Toplam_Alacak**: Hak edilen maaş + %50 mesai + %100 mesai - Avans - Resmi ödeme - Elden ödeme

## Requirements

### Requirement 1: Kullanıcı Kimlik Doğrulama

**User Story:** Bir kullanıcı olarak, sisteme güvenli giriş yapmak istiyorum, böylece yetkisiz erişimi engelleyebilir ve işlemlerimi takip edebilirim.

#### Acceptance Criteria

1. WHEN bir kullanıcı geçerli kullanıcı adı ve şifre ile giriş yapar THEN Kimlik_Doğrulama_Modülü SHALL kullanıcıyı doğrulayıp ana sayfaya yönlendirmeli
2. WHEN bir kullanıcı geçersiz kimlik bilgileri ile giriş yapmaya çalışır THEN Kimlik_Doğrulama_Modülü SHALL hata mesajı göstermeli ve girişi reddetmeli
3. WHEN bir kullanıcı oturum açmadan korumalı sayfalara erişmeye çalışır THEN Puantaj_Sistemi SHALL kullanıcıyı giriş sayfasına yönlendirmeli
4. WHEN bir kullanıcı çıkış yapar THEN Kimlik_Doğrulama_Modülü SHALL oturumu sonlandırmalı ve giriş sayfasına yönlendirmeli
5. THE Kimlik_Doğrulama_Modülü SHALL şifreleri güvenli şekilde (hash) saklamalı

### Requirement 2: Çalışan Yönetimi

**User Story:** Bir kullanıcı olarak, çalışan kayıtlarını eklemek, güncellemek ve silmek istiyorum, böylece puantaj hesaplamalarında güncel çalışan bilgilerini kullanabilirim.

#### Acceptance Criteria

1. WHEN bir kullanıcı yeni çalışan ekler THEN Çalışan_Modülü SHALL ad soyad, çalışma alanı, sigorta durumu, işe giriş tarihi, maaş ve çalışma gün sayısı (varsayılan 30) bilgilerini kaydetmeli
2. WHEN bir kullanıcı çalışan bilgilerini günceller THEN Çalışan_Modülü SHALL değişiklikleri veritabanına kaydetmeli
3. WHEN bir kullanıcı çalışan siler THEN Çalışan_Modülü SHALL çalışanı sistemden kaldırmalı
4. THE Çalışan_Modülü SHALL çalışma alanı için seçmeli liste sunmalı (Depo, Üretim, Ofis vb.)
5. THE Çalışan_Modülü SHALL sigorta durumunu boolean (Sigortalı/Sigortasız) olarak saklamalı
6. THE Çalışan_Modülü SHALL işten çıkış tarihini opsiyonel alan olarak desteklemeli

### Requirement 3: Puantaj Tablosu Görünümü

**User Story:** Bir kullanıcı olarak, tüm çalışanları Excel benzeri bir tabloda görmek istiyorum, böylece verileri hızlıca inceleyebilir ve düzenleyebilirim.

#### Acceptance Criteria

1. THE Puantaj_Tablosu SHALL tüm çalışanları satır bazlı listelemeli
2. THE Puantaj_Tablosu SHALL şu kolonları göstermeli: Çalışan adı, Çalışma alanı, Sigortalı/Sigortasız, İşe giriş/çıkış, Maaş, Çalışma gün sayısı, Çalıştığı gün sayısı, Günlük ücret, Avans, Hak edilen maaş, %50 mesai ücreti, %100 mesai ücreti, Resmi ödeme, Elden ödeme, Toplam alacak
3. THE Puantaj_Tablosu SHALL kolonları net ve düzenli şekilde göstermeli
4. WHEN kullanıcı bir hücreye tıklar THEN Puantaj_Tablosu SHALL düzenlenebilir alanlar için inline düzenleme imkanı sunmalı

### Requirement 4: Puantaj Veri Girişi

**User Story:** Bir kullanıcı olarak, puantaj tablosunda hızlıca veri girişi yapmak istiyorum, böylece çalışanların aylık verilerini kolayca güncelleyebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı çalıştığı gün sayısı girer THEN Puantaj_Tablosu SHALL değeri kaydetmeli
2. WHEN kullanıcı avans miktarı girer THEN Puantaj_Tablosu SHALL değeri kaydetmeli
3. WHEN kullanıcı %50 mesai ücreti girer THEN Puantaj_Tablosu SHALL değeri kaydetmeli
4. WHEN kullanıcı %100 mesai ücreti girer THEN Puantaj_Tablosu SHALL değeri kaydetmeli
5. WHEN kullanıcı resmi ödeme girer THEN Puantaj_Tablosu SHALL değeri kaydetmeli
6. WHEN kullanıcı elden ödeme girer THEN Puantaj_Tablosu SHALL değeri kaydetmeli
7. THE Puantaj_Tablosu SHALL sayısal alanlar için geçerlilik kontrolü yapmalı

### Requirement 5: Otomatik Hesaplamalar

**User Story:** Bir kullanıcı olarak, maaş hesaplamalarının otomatik yapılmasını istiyorum, böylece manuel hesaplama hatalarından kaçınabilirim.

#### Acceptance Criteria

1. THE Puantaj_Tablosu SHALL günlük ücreti "Maaş / 30" formülü ile otomatik hesaplamalı
2. THE Puantaj_Tablosu SHALL hak edilen maaşı "Günlük ücret × Çalıştığı gün sayısı" formülü ile otomatik hesaplamalı
3. THE Puantaj_Tablosu SHALL toplam alacağı "Hak edilen maaş + %50 mesai + %100 mesai - Avans - Resmi ödeme - Elden ödeme" formülü ile otomatik hesaplamalı
4. WHEN herhangi bir girdi değeri değişir THEN Puantaj_Tablosu SHALL ilgili hesaplamaları anında güncellemeli
5. THE Puantaj_Tablosu SHALL hesaplama formüllerini güncellenebilir şekilde esnek tasarlamalı

### Requirement 6: İşlem Geçmişi (Log) Kaydı

**User Story:** Bir yönetici olarak, sistemde yapılan tüm değişikliklerin kaydını tutmak istiyorum, böylece denetim ve takip yapabilirim.

#### Acceptance Criteria

1. WHEN bir çalışan eklenir THEN Log_Modülü SHALL işlemi tarih, saat, kullanıcı ve detayları ile kaydetmeli
2. WHEN bir çalışan güncellenir THEN Log_Modülü SHALL değişen alanları eski ve yeni değerleri ile kaydetmeli
3. WHEN bir çalışan silinir THEN Log_Modülü SHALL silme işlemini kaydetmeli
4. WHEN puantaj tablosunda herhangi bir değer değişir THEN Log_Modülü SHALL değişikliği kaydetmeli
5. THE Log_Modülü SHALL her kayıt için işlem türünü (CREATE/UPDATE/DELETE) saklamalı
6. THE Log_Modülü SHALL her kayıt için etkilenen çalışan bilgisini saklamalı
7. THE Log_Modülü SHALL log verilerini JSON formatında serialize edip deserialize edebilmeli

### Requirement 7: Log Görüntüleme

**User Story:** Bir kullanıcı olarak, işlem geçmişini ayrı bir sekmede görüntülemek istiyorum, böylece yapılan değişiklikleri takip edebilirim.

#### Acceptance Criteria

1. THE Puantaj_Sistemi SHALL log ekranını ayrı bir sekme/sayfa olarak sunmalı
2. THE Log_Modülü SHALL tüm log kayıtlarını tarih sırasına göre listelemeli
3. THE Log_Modülü SHALL her kayıt için tarih, saat, kullanıcı, işlem türü, etkilenen kayıt ve değişen alanları göstermeli
4. THE Log_Modülü SHALL değişen alanları "eski değer → yeni değer" formatında göstermeli
5. THE Log_Modülü SHALL log ekranına kolay erişim sağlamalı (navigasyon menüsünden)

### Requirement 8: Kullanıcı Arayüzü

**User Story:** Bir kullanıcı olarak, Excel'e benzer, kullanımı kolay bir arayüz istiyorum, böylece sistemi hızlıca öğrenip verimli kullanabilirim.

#### Acceptance Criteria

1. THE Puantaj_Sistemi SHALL Excel benzeri tablo görünümü sunmalı
2. THE Puantaj_Sistemi SHALL tablo üzerinde hızlı veri girişi imkanı sağlamalı
3. THE Puantaj_Sistemi SHALL satır bazlı düzenlemeyi kolay hale getirmeli
4. THE Puantaj_Sistemi SHALL çalışan listesi, puantaj tablosu, log ve giriş ekranlarını içermeli
5. THE Puantaj_Sistemi SHALL responsive tasarım ile farklı ekran boyutlarını desteklemeli
