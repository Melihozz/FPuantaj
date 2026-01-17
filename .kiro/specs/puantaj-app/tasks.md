# Implementation Plan: Puantaj Uygulaması

## Overview

Bu plan, Excel benzeri puantaj uygulamasının adım adım implementasyonunu tanımlar. Backend (Node.js/Express) ve Frontend (React) paralel olarak geliştirilecek, her adım önceki adımların üzerine inşa edilecektir.

## Tasks

- [x] 1. Proje yapısı ve temel konfigürasyon
  - [x] 1.1 Backend proje yapısını oluştur
    - Node.js/Express projesi başlat
    - TypeScript konfigürasyonu
    - Prisma ORM kurulumu
    - Klasör yapısı: src/routes, src/services, src/middleware, src/utils
    - _Requirements: Teknoloji tercihi_
  - [x] 1.2 Frontend proje yapısını oluştur
    - React + Vite projesi başlat
    - TypeScript konfigürasyonu
    - Tailwind CSS kurulumu
    - Klasör yapısı: src/components, src/pages, src/context, src/api
    - _Requirements: Teknoloji tercihi_
  - [x] 1.3 Veritabanı şemasını oluştur
    - Prisma schema dosyası (User, Employee, PayrollEntry, AuditLog)
    - Migration oluştur ve çalıştır
    - _Requirements: 2.1, 6.1_

- [x] 2. Kimlik doğrulama modülü
  - [x] 2.1 Auth service implementasyonu
    - Password hashing (bcrypt)
    - JWT token oluşturma ve doğrulama
    - Login/logout fonksiyonları
    - _Requirements: 1.1, 1.4, 1.5_
  - [ ]* 2.2 Property test: Password hashing security
    - **Property 1: Password Hashing Security**
    - **Validates: Requirements 1.5**
  - [ ]* 2.3 Property test: Invalid credentials rejection
    - **Property 2: Invalid Credentials Rejection**
    - **Validates: Requirements 1.2**
  - [x] 2.4 Auth middleware implementasyonu
    - JWT token doğrulama middleware
    - Protected route middleware
    - _Requirements: 1.3_
  - [x] 2.5 Auth API endpoints
    - POST /api/auth/login
    - POST /api/auth/logout
    - GET /api/auth/me
    - _Requirements: 1.1, 1.4_

- [x] 3. Checkpoint - Auth modülü tamamlandı
  - Tüm testlerin geçtiğinden emin ol
  - Kullanıcıya soru sor gerekirse

- [x] 4. Çalışan yönetimi modülü
  - [x] 4.1 Employee service implementasyonu
    - CRUD fonksiyonları (create, read, update, delete)
    - Validation (Zod schema)
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 4.2 Property test: Employee CRUD round-trip
    - **Property 3: Employee CRUD Round-Trip**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  - [x] 4.3 Employee API endpoints
    - GET /api/employees
    - POST /api/employees
    - PUT /api/employees/:id
    - DELETE /api/employees/:id
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Hesaplama servisi
  - [x] 5.1 Calculation service implementasyonu
    - calculateDailyWage fonksiyonu
    - calculateEarnedSalary fonksiyonu
    - calculateTotalReceivable fonksiyonu
    - calculatePayroll ana fonksiyonu
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [ ]* 5.2 Property test: Calculation correctness
    - **Property 6: Calculation Correctness**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 6. Puantaj modülü
  - [x] 6.1 Payroll service implementasyonu
    - Puantaj kaydı CRUD fonksiyonları
    - Ay/yıl bazlı sorgulama
    - Hesaplama servisi entegrasyonu
    - _Requirements: 4.1-4.6_
  - [ ]* 6.2 Property test: Payroll data persistence
    - **Property 4: Payroll Data Persistence**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
  - [ ]* 6.3 Property test: Numeric field validation
    - **Property 5: Numeric Field Validation**
    - **Validates: Requirements 4.7**
  - [x] 6.4 Payroll API endpoints
    - GET /api/payroll (ay/yıl parametreli)
    - PUT /api/payroll/:id
    - POST /api/payroll/batch
    - _Requirements: 4.1-4.7_

- [x] 7. Checkpoint - Backend core tamamlandı
  - Tüm testlerin geçtiğinden emin ol
  - Kullanıcıya soru sor gerekirse

- [x] 8. Audit log modülü
  - [x] 8.1 Log service implementasyonu
    - createAuditLog fonksiyonu
    - computeChanges fonksiyonu (eski/yeni değer karşılaştırma)
    - Log sorgulama fonksiyonları
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [ ]* 8.2 Property test: Audit log creation
    - **Property 7: Audit Log Creation**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
  - [ ]* 8.3 Property test: Log serialization round-trip
    - **Property 8: Log Serialization Round-Trip**
    - **Validates: Requirements 6.7**
  - [x] 8.4 Log middleware implementasyonu
    - Employee işlemlerini otomatik loglama
    - Payroll işlemlerini otomatik loglama
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 8.5 Log API endpoints
    - GET /api/logs (pagination)
    - GET /api/logs/:entityId
    - _Requirements: 7.1, 7.2_

- [x] 9. Frontend - Auth ve Layout
  - [x] 9.1 Auth context ve provider
    - AuthContext oluştur
    - Login/logout state yönetimi
    - Token storage (localStorage)
    - _Requirements: 1.1, 1.4_
  - [x] 9.2 Login sayfası
    - Login formu
    - Hata mesajları gösterimi
    - _Requirements: 1.1, 1.2_
  - [x] 9.3 Layout ve navigasyon
    - Navbar bileşeni
    - Protected route wrapper
    - Sayfa navigasyonu (Çalışanlar, Puantaj, Log)
    - _Requirements: 7.5, 8.4_

- [x] 10. Frontend - Çalışan listesi
  - [x] 10.1 Employee API client
    - API fonksiyonları (getAll, create, update, delete)
    - Error handling
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 10.2 Çalışan listesi sayfası
    - Tablo görünümü
    - Ekleme/düzenleme modal
    - Silme onayı
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 11. Frontend - Puantaj tablosu
  - [x] 11.1 Payroll API client
    - API fonksiyonları (getByMonth, update, batchUpdate)
    - Error handling
    - _Requirements: 4.1-4.7_
  - [x] 11.2 EditableCell bileşeni
    - Inline düzenleme
    - Sayısal validation
    - Blur/Enter ile kaydetme
    - _Requirements: 3.4, 4.7, 8.2_
  - [x] 11.3 Puantaj tablosu sayfası
    - Excel benzeri tablo görünümü
    - Tüm kolonlar (çalışan bilgileri + puantaj alanları)
    - Otomatik hesaplama gösterimi
    - Ay/yıl seçici
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 8.1_

- [x] 12. Frontend - Log görüntüleme
  - [x] 12.1 Log API client
    - API fonksiyonları (getAll, getByEntity)
    - Pagination desteği
    - _Requirements: 7.1, 7.2_
  - [x] 12.2 Log görüntüleme sayfası
    - Log listesi
    - Tarih, kullanıcı, işlem türü gösterimi
    - Değişiklik detayları (eski → yeni)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 13. Checkpoint - Tüm özellikler tamamlandı
  - Tüm testlerin geçtiğinden emin ol
  - End-to-end akışları kontrol et
  - Kullanıcıya soru sor gerekirse

- [x] 14. Final entegrasyon ve polish
  - [x] 14.1 Responsive tasarım kontrolü
    - Farklı ekran boyutları için test
    - Mobile uyumluluk
    - _Requirements: 8.5_
  - [x] 14.2 Error handling ve UX iyileştirmeleri
    - Loading states
    - Error boundaries
    - Toast notifications
    - _Requirements: 8.1, 8.2, 8.3_

## Notes

- `*` ile işaretli görevler opsiyoneldir ve hızlı MVP için atlanabilir
- Her property test, design.md'deki ilgili property'yi referans alır
- Checkpoint'lerde tüm testlerin geçtiğinden emin olunmalı
- Backend ve frontend paralel geliştirilebilir (API contract'lar tanımlı)
