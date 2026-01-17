/**
 * Calculation Service
 * 
 * Puantaj hesaplama fonksiyonları - saf fonksiyonlar olarak tasarlanmıştır.
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */

/**
 * Hesaplama girdisi
 */
export interface CalculationInput {
  salary: number;
  workingDays: number;
  daysWorked: number;
  advance: number;
  overtime50: number;
  overtime100: number;
  officialPayment: number;
  cashPayment: number;
}

/**
 * Hesaplama sonucu
 */
export interface CalculationResult {
  dailyWage: number;
  earnedSalary: number;
  totalReceivable: number;
}

/**
 * Günlük ücreti hesaplar
 * Formül: Maaş / Çalışma gün sayısı
 * 
 * @param salary - Aylık maaş
 * @param workingDays - Çalışma gün sayısı (varsayılan 30)
 * @returns Günlük ücret
 * 
 * Requirements: 5.1
 */
export function calculateDailyWage(salary: number, workingDays: number): number {
  if (workingDays <= 0) {
    throw new Error('Çalışma gün sayısı pozitif olmalıdır');
  }
  if (salary < 0) {
    throw new Error('Maaş negatif olamaz');
  }
  return salary / workingDays;
}

/**
 * Hak edilen maaşı hesaplar
 * Formül: Günlük ücret × Çalıştığı gün sayısı
 * 
 * @param dailyWage - Günlük ücret
 * @param daysWorked - Çalıştığı gün sayısı
 * @returns Hak edilen maaş
 * 
 * Requirements: 5.2
 */
export function calculateEarnedSalary(dailyWage: number, daysWorked: number): number {
  if (daysWorked < 0) {
    throw new Error('Çalıştığı gün sayısı negatif olamaz');
  }
  if (dailyWage < 0) {
    throw new Error('Günlük ücret negatif olamaz');
  }
  return dailyWage * daysWorked;
}

/**
 * Toplam alacağı hesaplar
 * Formül: Hak edilen maaş + %50 mesai + %100 mesai - Avans
 *
 * Not: Resmi/Elden ödemeler toplamın dağılımı olarak ele alınır, toplamdan düşülmez.
 * 
 * @param earnedSalary - Hak edilen maaş
 * @param overtime50 - %50 mesai ücreti
 * @param overtime100 - %100 mesai ücreti
 * @param advance - Avans
 * @param officialPayment - Resmi ödeme (hesaplamaya dahil edilmez)
 * @param cashPayment - Elden ödeme (hesaplamaya dahil edilmez)
 * @returns Toplam alacak
 * 
 * Requirements: 5.3
 */
export function calculateTotalReceivable(
  earnedSalary: number,
  overtime50: number,
  overtime100: number,
  advance: number,
  officialPayment: number,
  cashPayment: number
): number {
  void officialPayment;
  void cashPayment;
  return earnedSalary + overtime50 + overtime100 - advance;
}

/**
 * Tüm puantaj hesaplamalarını yapar
 * 
 * @param input - Hesaplama girdisi
 * @returns Hesaplama sonucu (günlük ücret, hak edilen maaş, toplam alacak)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */
export function calculatePayroll(input: CalculationInput): CalculationResult {
  // Validate inputs
  if (input.salary < 0) {
    throw new Error('Maaş negatif olamaz');
  }
  if (input.workingDays <= 0) {
    throw new Error('Çalışma gün sayısı pozitif olmalıdır');
  }
  if (input.daysWorked < 0) {
    throw new Error('Çalıştığı gün sayısı negatif olamaz');
  }
  if (input.advance < 0) {
    throw new Error('Avans negatif olamaz');
  }
  if (input.overtime50 < 0) {
    throw new Error('%50 mesai ücreti negatif olamaz');
  }
  if (input.overtime100 < 0) {
    throw new Error('%100 mesai ücreti negatif olamaz');
  }
  if (input.officialPayment < 0) {
    throw new Error('Resmi ödeme negatif olamaz');
  }
  if (input.cashPayment < 0) {
    throw new Error('Elden ödeme negatif olamaz');
  }

  // Calculate daily wage: salary / workingDays
  const dailyWage = calculateDailyWage(input.salary, input.workingDays);

  // Calculate earned salary: dailyWage * daysWorked
  const earnedSalary = calculateEarnedSalary(dailyWage, input.daysWorked);

  // Calculate total receivable
  const totalReceivable = calculateTotalReceivable(
    earnedSalary,
    input.overtime50,
    input.overtime100,
    input.advance,
    input.officialPayment,
    input.cashPayment
  );

  return {
    dailyWage,
    earnedSalary,
    totalReceivable,
  };
}
