import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateOfficialAndCash } from './payroll.service';
import {
  FIXED_OFFICIAL_PAYMENT,
  OFFICIAL_WORKING_DAYS_BASE,
} from '../config/payroll.config';

/**
 * Resmi/elden dağılımının MEVCUT davranışını sabitler.
 *
 * Bu dosyadaki beklenen değerler, üretimde bugün alınan sonuçlardır.
 * Refactor sırasında bir test kırılırsa: hesaplama sonucu değişmiş demektir,
 * refactor geri alınmalıdır.
 */

const OFFICIAL_DAILY = FIXED_OFFICIAL_PAYMENT / OFFICIAL_WORKING_DAYS_BASE;

describe('calculateOfficialAndCash - sabitler', () => {
  it('resmi taban 28075 / 30 gün', () => {
    expect(FIXED_OFFICIAL_PAYMENT).toBe(28075);
    expect(OFFICIAL_WORKING_DAYS_BASE).toBe(30);
  });
});

describe('calculateOfficialAndCash - SİGORTASIZ', () => {
  it('resmi ödeme her zaman 0, her şey elden', () => {
    const result = calculateOfficialAndCash(false, 40000, 30, 30, 1000, 500, 0, 0);

    expect(result.officialPayment).toBe(0);
    expect(result.cashPayment).toBeCloseTo(41500, 6); // 40000 + 1000 + 500
  });

  it('elden avans elden ödemeden düşülür', () => {
    const result = calculateOfficialAndCash(false, 40000, 30, 30, 0, 0, 5000, 0);

    expect(result.officialPayment).toBe(0);
    expect(result.cashPayment).toBeCloseTo(35000, 6);
  });

  it('sigortasızda resmi avans yok sayılır', () => {
    const withOfficialAdvance = calculateOfficialAndCash(false, 40000, 30, 30, 0, 0, 0, 9999);
    const withoutOfficialAdvance = calculateOfficialAndCash(false, 40000, 30, 30, 0, 0, 0, 0);

    expect(withOfficialAdvance).toEqual(withoutOfficialAdvance);
  });

  it('avans hak edişten büyükse elden ödeme 0 olur (negatife düşmez)', () => {
    const result = calculateOfficialAndCash(false, 40000, 30, 30, 0, 0, 99999, 0);

    expect(result.cashPayment).toBe(0);
  });

  it('yarım ay çalışma', () => {
    const result = calculateOfficialAndCash(false, 30000, 30, 15, 0, 0, 0, 0);

    expect(result.officialPayment).toBe(0);
    expect(result.cashPayment).toBeCloseTo(15000, 6);
  });
});

describe('calculateOfficialAndCash - SİGORTALI', () => {
  it('tam ay: resmi taban 28075, kalanı + mesailer elden', () => {
    const result = calculateOfficialAndCash(true, 40000, 30, 30, 1000, 500, 0, 0);

    expect(result.officialPayment).toBeCloseTo(28075, 6);
    // (40000 - 28075) + 1000 + 500
    expect(result.cashPayment).toBeCloseTo(13425, 6);
  });

  it('yarım ay: resmi taban da yarıya iner', () => {
    const result = calculateOfficialAndCash(true, 40000, 30, 15, 0, 0, 0, 0);

    const expectedOfficial = OFFICIAL_DAILY * 15; // 14037.5
    expect(result.officialPayment).toBeCloseTo(expectedOfficial, 6);
    expect(result.cashPayment).toBeCloseTo(20000 - expectedOfficial, 6);
  });

  it('maaş resmi tabanın altındaysa TAMAMI resmi, elden 0', () => {
    const result = calculateOfficialAndCash(true, 20000, 30, 30, 0, 0, 0, 0);

    expect(result.officialPayment).toBeCloseTo(20000, 6);
    expect(result.cashPayment).toBeCloseTo(0, 6);
  });

  it('maaş resmi tabanın altında ama mesai varsa: mesai elden gider', () => {
    const result = calculateOfficialAndCash(true, 20000, 30, 30, 800, 200, 0, 0);

    expect(result.officialPayment).toBeCloseTo(20000, 6);
    expect(result.cashPayment).toBeCloseTo(1000, 6);
  });

  it('iki avans kendi kanalından düşülür', () => {
    const result = calculateOfficialAndCash(true, 40000, 30, 30, 1000, 500, 2000, 5000);

    expect(result.officialPayment).toBeCloseTo(28075 - 5000, 6); // 23075
    expect(result.cashPayment).toBeCloseTo(13425 - 2000, 6); // 11425
  });

  it('resmi avans resmi tabanı aşarsa resmi ödeme 0 olur, eldene TAŞMAZ', () => {
    const result = calculateOfficialAndCash(true, 40000, 30, 30, 0, 0, 0, 99999);

    expect(result.officialPayment).toBe(0);
    // elden taraf resmi avanstan etkilenmez
    expect(result.cashPayment).toBeCloseTo(11925, 6);
  });

  it('elden avans elden bazı aşarsa elden 0 olur, resmiye TAŞMAZ', () => {
    const result = calculateOfficialAndCash(true, 40000, 30, 30, 0, 0, 99999, 0);

    expect(result.cashPayment).toBe(0);
    expect(result.officialPayment).toBeCloseTo(28075, 6);
  });

  it('çalışılan gün 0 ise her iki ödeme de 0', () => {
    const result = calculateOfficialAndCash(true, 40000, 30, 0, 0, 0, 0, 0);

    expect(result.officialPayment).toBe(0);
    expect(result.cashPayment).toBe(0);
  });

  it('30 günden fazla çalışma (31 gün) resmi tabanı orantılı büyütür', () => {
    const result = calculateOfficialAndCash(true, 40000, 30, 31, 0, 0, 0, 0);

    const earned = (40000 / 30) * 31;
    const expectedOfficial = Math.min(earned, OFFICIAL_DAILY * 31);
    expect(result.officialPayment).toBeCloseTo(expectedOfficial, 6);
    expect(result.cashPayment).toBeCloseTo(earned - expectedOfficial, 6);
  });
});

describe('calculateOfficialAndCash - değişmezler (property)', () => {
  const arbInput = fc.record({
    isInsured: fc.boolean(),
    salary: fc.double({ min: 0, max: 500_000, noNaN: true }),
    workingDays: fc.integer({ min: 1, max: 31 }),
    daysWorked: fc.integer({ min: 0, max: 31 }),
    overtime50: fc.double({ min: 0, max: 50_000, noNaN: true }),
    overtime100: fc.double({ min: 0, max: 50_000, noNaN: true }),
    cashAdvance: fc.double({ min: 0, max: 100_000, noNaN: true }),
    officialAdvance: fc.double({ min: 0, max: 100_000, noNaN: true }),
  });

  interface SplitInput {
    isInsured: boolean;
    salary: number;
    workingDays: number;
    daysWorked: number;
    overtime50: number;
    overtime100: number;
    cashAdvance: number;
    officialAdvance: number;
  }

  const run = (i: SplitInput) =>
    calculateOfficialAndCash(
      i.isInsured,
      i.salary,
      i.workingDays,
      i.daysWorked,
      i.overtime50,
      i.overtime100,
      i.cashAdvance,
      i.officialAdvance
    );

  it('hiçbir ödeme negatif olamaz', () => {
    fc.assert(
      fc.property(arbInput, (i) => {
        const result = run(i);
        expect(result.officialPayment).toBeGreaterThanOrEqual(0);
        expect(result.cashPayment).toBeGreaterThanOrEqual(0);
      })
    );
  });

  it('sigortasızda resmi ödeme daima 0', () => {
    fc.assert(
      fc.property(arbInput, (i) => {
        const result = run({ ...i, isInsured: false });
        expect(result.officialPayment).toBe(0);
      })
    );
  });

  it('avans yokken resmi + elden = hak ediş + mesailer', () => {
    fc.assert(
      fc.property(arbInput, (i) => {
        const result = run({ ...i, cashAdvance: 0, officialAdvance: 0 });
        const earned = (i.salary / i.workingDays) * i.daysWorked;
        const expectedTotal = earned + i.overtime50 + i.overtime100;

        expect(result.officialPayment + result.cashPayment).toBeCloseTo(expectedTotal, 4);
      })
    );
  });

  it('resmi ödeme hiçbir zaman hak edişi aşmaz', () => {
    fc.assert(
      fc.property(arbInput, (i) => {
        const result = run(i);
        const earned = (i.salary / i.workingDays) * i.daysWorked;
        expect(result.officialPayment).toBeLessThanOrEqual(earned + 1e-6);
      })
    );
  });
});
