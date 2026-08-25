import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateDailyWage,
  calculateEarnedSalary,
  calculateTotalReceivable,
  calculatePayroll,
} from './calculation.service';

/**
 * Bu testler MEVCUT davranışı sabitler (characterization test).
 * Amaç: refactor sırasında hesaplama sonuçlarının değişmediğini kanıtlamak.
 * Bir test kırılırsa, önce "sonuç bilerek mi değiştirildi?" diye sor.
 */

describe('calculateDailyWage', () => {
  it('maaşı çalışma gün sayısına böler', () => {
    expect(calculateDailyWage(30000, 30)).toBe(1000);
    expect(calculateDailyWage(45000, 30)).toBe(1500);
  });

  it('30 dışında bir çalışma gününü de kullanır', () => {
    expect(calculateDailyWage(26000, 26)).toBe(1000);
  });

  it('maaş 0 ise günlük ücret 0', () => {
    expect(calculateDailyWage(0, 30)).toBe(0);
  });

  it('çalışma günü pozitif değilse hata verir', () => {
    expect(() => calculateDailyWage(30000, 0)).toThrow('Çalışma gün sayısı pozitif olmalıdır');
    expect(() => calculateDailyWage(30000, -1)).toThrow('Çalışma gün sayısı pozitif olmalıdır');
  });

  it('maaş negatifse hata verir', () => {
    expect(() => calculateDailyWage(-1, 30)).toThrow('Maaş negatif olamaz');
  });
});

describe('calculateEarnedSalary', () => {
  it('günlük ücret × çalışılan gün', () => {
    expect(calculateEarnedSalary(1000, 30)).toBe(30000);
    expect(calculateEarnedSalary(1000, 15)).toBe(15000);
  });

  it('çalışılan gün 0 ise hak ediş 0', () => {
    expect(calculateEarnedSalary(1000, 0)).toBe(0);
  });

  it('negatif değerlerde hata verir', () => {
    expect(() => calculateEarnedSalary(1000, -1)).toThrow('Çalıştığı gün sayısı negatif olamaz');
    expect(() => calculateEarnedSalary(-1, 30)).toThrow('Günlük ücret negatif olamaz');
  });
});

describe('calculateTotalReceivable', () => {
  it('hak ediş + mesailer - avans', () => {
    expect(calculateTotalReceivable(30000, 1000, 500, 2000, 0, 0)).toBe(29500);
  });

  it('resmi ve elden ödemeyi TOPLAMDAN DÜŞMEZ (bilinçli davranış)', () => {
    // Bu ödemeler toplamın dağılımıdır, ayrı bir kesinti değildir.
    const withoutPayments = calculateTotalReceivable(30000, 0, 0, 0, 0, 0);
    const withPayments = calculateTotalReceivable(30000, 0, 0, 0, 20000, 10000);
    expect(withPayments).toBe(withoutPayments);
    expect(withPayments).toBe(30000);
  });

  it('avans hak edişten büyükse sonuç negatif olur', () => {
    expect(calculateTotalReceivable(1000, 0, 0, 3000, 0, 0)).toBe(-2000);
  });
});

describe('calculatePayroll', () => {
  it('üç alanı birlikte hesaplar', () => {
    const result = calculatePayroll({
      salary: 30000,
      workingDays: 30,
      daysWorked: 20,
      advance: 1000,
      overtime50: 500,
      overtime100: 250,
      officialPayment: 0,
      cashPayment: 0,
    });

    expect(result.dailyWage).toBe(1000);
    expect(result.earnedSalary).toBe(20000);
    expect(result.totalReceivable).toBe(19750);
  });

  it('negatif girdileri reddeder', () => {
    const base = {
      salary: 30000,
      workingDays: 30,
      daysWorked: 20,
      advance: 0,
      overtime50: 0,
      overtime100: 0,
      officialPayment: 0,
      cashPayment: 0,
    };

    expect(() => calculatePayroll({ ...base, salary: -1 })).toThrow('Maaş negatif olamaz');
    expect(() => calculatePayroll({ ...base, workingDays: 0 })).toThrow('Çalışma gün sayısı pozitif olmalıdır');
    expect(() => calculatePayroll({ ...base, daysWorked: -1 })).toThrow('Çalıştığı gün sayısı negatif olamaz');
    expect(() => calculatePayroll({ ...base, advance: -1 })).toThrow('Avans negatif olamaz');
    expect(() => calculatePayroll({ ...base, overtime50: -1 })).toThrow('%50 mesai ücreti negatif olamaz');
    expect(() => calculatePayroll({ ...base, overtime100: -1 })).toThrow('%100 mesai ücreti negatif olamaz');
    expect(() => calculatePayroll({ ...base, officialPayment: -1 })).toThrow('Resmi ödeme negatif olamaz');
    expect(() => calculatePayroll({ ...base, cashPayment: -1 })).toThrow('Elden ödeme negatif olamaz');
  });

  // Property test - tasks.md 5.2 / design.md Property 6
  it('property: formüller her geçerli girdi için tutarlıdır', () => {
    fc.assert(
      fc.property(
        fc.record({
          salary: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
          workingDays: fc.integer({ min: 1, max: 31 }),
          daysWorked: fc.integer({ min: 0, max: 31 }),
          advance: fc.double({ min: 0, max: 100_000, noNaN: true }),
          overtime50: fc.double({ min: 0, max: 100_000, noNaN: true }),
          overtime100: fc.double({ min: 0, max: 100_000, noNaN: true }),
        }),
        (input) => {
          const result = calculatePayroll({
            ...input,
            officialPayment: 0,
            cashPayment: 0,
          });

          expect(result.dailyWage).toBeCloseTo(input.salary / input.workingDays, 6);
          expect(result.earnedSalary).toBeCloseTo(result.dailyWage * input.daysWorked, 6);
          expect(result.totalReceivable).toBeCloseTo(
            result.earnedSalary + input.overtime50 + input.overtime100 - input.advance,
            6
          );
        }
      )
    );
  });
});
