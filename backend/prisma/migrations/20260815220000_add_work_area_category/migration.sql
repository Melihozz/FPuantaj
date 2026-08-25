-- CreateTable
CREATE TABLE "WorkAreaCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkAreaCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkAreaCategory_code_key" ON "WorkAreaCategory"("code");

-- CreateIndex
CREATE INDEX "WorkAreaCategory_sortOrder_idx" ON "WorkAreaCategory"("sortOrder");

-- Mevcut sabit kategorileri taşı: çalışanların workArea değerleri bu kodlara
-- işaret ettiği için bunlar olmadan mevcut kayıtlar kategorisiz kalırdı.
INSERT INTO "WorkAreaCategory" ("id", "code", "label", "sortOrder", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'DEPO',            'Depo',            0, NOW(), NOW()),
    (gen_random_uuid(), 'URETIM',          'Üretim',          1, NOW(), NOW()),
    (gen_random_uuid(), 'OFIS',            'Ofis',            2, NOW(), NOW()),
    (gen_random_uuid(), 'SAHA_ELEMANI',    'İstanbul Saha',   3, NOW(), NOW()),
    (gen_random_uuid(), 'KAYSERI_YATAS',   'Kayseri Yataş',   4, NOW(), NOW()),
    (gen_random_uuid(), 'ANKARA_YATAS',    'Ankara Yataş',    5, NOW(), NOW()),
    (gen_random_uuid(), 'ISTANBUL_YATAS',  'İstanbul Yataş',  6, NOW(), NOW()),
    (gen_random_uuid(), 'DIGER',           'Diğer',           7, NOW(), NOW());

-- Güvenlik ağı: Employee tablosunda yukarıdaki listede olmayan bir workArea
-- değeri varsa onu da kategori olarak ekle ki hiçbir çalışan tanımsız kalmasın.
INSERT INTO "WorkAreaCategory" ("id", "code", "label", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), e."workArea", e."workArea", 100, NOW(), NOW()
FROM (SELECT DISTINCT "workArea" FROM "Employee") AS e
WHERE NOT EXISTS (
    SELECT 1 FROM "WorkAreaCategory" c WHERE c."code" = e."workArea"
);
