import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getCurrentPeriod, getPayrollByMonth, isPayrollApiError, MONTH_NAMES, PayrollEntry, formatCurrency } from '../api/payroll';
import { createOvertime, deleteOvertime, getOvertimeEntries, OvertimeEntry } from '../api/overtime';
import { useToast } from '../context/ToastContext';

export default function OvertimePage() {
  const { showToast } = useToast();
  const { month: currentMonth, year: currentYear } = getCurrentPeriod();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listEmployeeFilterId, setListEmployeeFilterId] = useState('');

  const [employeeId, setEmployeeId] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'OVERTIME_50' | 'OVERTIME_100'>('OVERTIME_50');
  const [hours, setHours] = useState(0);
  const [description, setDescription] = useState('');

  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [payrollData, overtimeData] = await Promise.all([
        getPayrollByMonth(selectedMonth, selectedYear),
        getOvertimeEntries(selectedMonth, selectedYear),
      ]);
      const sortedPayroll = [...payrollData].sort((a, b) =>
        a.employee.fullName.localeCompare(b.employee.fullName, 'tr-TR')
      );
      setPayrollEntries(sortedPayroll);
      setOvertimeEntries(overtimeData);

      if (!employeeId || !sortedPayroll.some((entry) => entry.employeeId === employeeId)) {
        setEmployeeId(sortedPayroll[0]?.employeeId || '');
      }
    } catch (err) {
      const message = isPayrollApiError(err) ? err.message : 'Mesai verileri yüklenemedi';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const selectedEntry = useMemo(
    () => payrollEntries.find((entry) => entry.employeeId === employeeId) || null,
    [payrollEntries, employeeId]
  );
  const filteredOvertimeEntries = useMemo(
    () =>
      listEmployeeFilterId
        ? overtimeEntries.filter((entry) => entry.employeeId === listEmployeeFilterId)
        : overtimeEntries,
    [overtimeEntries, listEmployeeFilterId]
  );
  const multiplier = type === 'OVERTIME_50' ? 1.5 : 2;
  const hourlyWage = (selectedEntry?.dailyWage || 0) / 8;
  const amount = Math.max(0, hourlyWage * multiplier * hours);

  const employeeSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        employeeName: string;
        amount50: number;
        amount100: number;
        hours50: number;
        hours100: number;
        totalHours: number;
        totalAmount: number;
      }
    >();
    filteredOvertimeEntries.forEach((item) => {
      const current = map.get(item.employeeId);
      const is50 = item.type === 'OVERTIME_50';
      if (current) {
        if (is50) {
          current.amount50 += item.amount;
          current.hours50 += item.hours;
        } else {
          current.amount100 += item.amount;
          current.hours100 += item.hours;
        }
        current.totalHours += item.hours;
        current.totalAmount += item.amount;
      } else {
        map.set(item.employeeId, {
          employeeName: item.employee.fullName,
          amount50: is50 ? item.amount : 0,
          amount100: is50 ? 0 : item.amount,
          hours50: is50 ? item.hours : 0,
          hours100: is50 ? 0 : item.hours,
          totalHours: item.hours,
          totalAmount: item.amount,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredOvertimeEntries]);

  const totals = useMemo(
    () =>
      employeeSummaries.reduce(
        (acc, item) => ({
          amount50: acc.amount50 + item.amount50,
          amount100: acc.amount100 + item.amount100,
          hours50: acc.hours50 + item.hours50,
          hours100: acc.hours100 + item.hours100,
          totalHours: acc.totalHours + item.totalHours,
          totalAmount: acc.totalAmount + item.totalAmount,
        }),
        { amount50: 0, amount100: 0, hours50: 0, hours100: 0, totalHours: 0, totalAmount: 0 }
      ),
    [employeeSummaries]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      showToast('Lütfen çalışan seçin', 'error');
      return;
    }
    if (hours <= 0) {
      showToast('Mesai saati 0’dan büyük olmalıdır', 'error');
      return;
    }
    if (description.length > 100) {
      showToast('Açıklama en fazla 100 karakter olabilir', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await createOvertime({
        employeeId,
        entryDate,
        month: selectedMonth,
        year: selectedYear,
        type,
        multiplier,
        hours,
        amount: Number(amount.toFixed(2)),
        description: description.trim() || null,
      });
      showToast('Mesai kaydedildi', 'success');
      setHours(0);
      setDescription('');
      await fetchData();
    } catch (err) {
      const message = isPayrollApiError(err) ? err.message : 'Mesai kaydedilemedi';
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entry: OvertimeEntry) => {
    const confirmed = window.confirm(`${entry.employee.fullName} için mesai kaydı silinsin mi?`);
    if (!confirmed) return;

    setDeletingId(entry.id);
    try {
      await deleteOvertime(entry.id);
      showToast('Mesai kaydı silindi', 'success');
      await fetchData();
    } catch (err) {
      const message = isPayrollApiError(err) ? err.message : 'Mesai kaydı silinemedi';
      showToast(message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Mesailer');
      const moneyFormat = '#,##0.00';

      worksheet.columns = [
        { width: 24 },
        { width: 14 },
        { width: 10 },
        { width: 10 },
        { width: 10 },
        { width: 14 },
        { width: 42 },
      ];

      const period = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
      const titleRow = worksheet.addRow([`Mesai Listesi - ${period}`]);
      worksheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
      titleRow.getCell(1).font = { bold: true, size: 14 };
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Çalışan', 'Tarih', 'Tür', 'Saat', 'Çarpan', 'Tutar', 'Açıklama']);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF334155' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE2E8F0' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      filteredOvertimeEntries.forEach((entry) => {
        const row = worksheet.addRow([
          entry.employee.fullName,
          new Date(entry.entryDate).toLocaleDateString('tr-TR'),
          entry.type === 'OVERTIME_50' ? '%50' : '%100',
          entry.hours,
          entry.multiplier,
          entry.amount,
          entry.description || '-',
        ]);
        row.getCell(4).numFmt = '0.00';
        row.getCell(5).numFmt = '0.00';
        row.getCell(6).numFmt = moneyFormat;
        row.getCell(4).alignment = { horizontal: 'right' };
        row.getCell(5).alignment = { horizontal: 'right' };
        row.getCell(6).alignment = { horizontal: 'right' };
      });

      worksheet.addRow([]);
      const summaryTitle = worksheet.addRow(['Çalışan Bazlı Toplamlar']);
      summaryTitle.getCell(1).font = { bold: true, size: 12 };
      const summaryHeader = worksheet.addRow(['Çalışan', '%50 Tutar', '%50 Saat', '%100 Tutar', '%100 Saat', 'Toplam Tutar', 'Toplam Saat']);
      summaryHeader.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });

      employeeSummaries.forEach((item) => {
        const row = worksheet.addRow([
          item.employeeName,
          item.amount50,
          item.hours50,
          item.amount100,
          item.hours100,
          item.totalAmount,
          item.totalHours,
        ]);
        row.getCell(2).numFmt = moneyFormat;
        row.getCell(3).numFmt = '0.00';
        row.getCell(4).numFmt = moneyFormat;
        row.getCell(5).numFmt = '0.00';
        row.getCell(6).numFmt = moneyFormat;
        row.getCell(7).numFmt = '0.00';
      });

      const totalRow = worksheet.addRow([
        'Genel Toplam',
        totals.amount50,
        totals.hours50,
        totals.amount100,
        totals.hours100,
        totals.totalAmount,
        totals.totalHours,
      ]);
      totalRow.eachCell((cell) => (cell.font = { bold: true }));
      totalRow.getCell(2).numFmt = moneyFormat;
      totalRow.getCell(3).numFmt = '0.00';
      totalRow.getCell(4).numFmt = moneyFormat;
      totalRow.getCell(5).numFmt = '0.00';
      totalRow.getCell(6).numFmt = moneyFormat;
      totalRow.getCell(7).numFmt = '0.00';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mesailer_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      // Revoke too early can break downloads on some environments.
      // Keep blob URL longer to avoid stalled downloads.
      setTimeout(() => {
        link.remove();
      }, 1500);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
      showToast('Excel indirildi', 'success');
    } catch {
      showToast('Excel oluşturulamadı', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Mesailer</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Dönem:</span>
          <select
            aria-label="Ay seçimi"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {Object.entries(MONTH_NAMES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            aria-label="Yıl seçimi"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
          >
            Excel'e İndir
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Mesai Ekle</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ot_date">Tarih</label>
              <input
                id="ot_date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ot_employee">Çalışan</label>
              <select
                id="ot_employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {payrollEntries.map((entry) => (
                  <option key={entry.employeeId} value={entry.employeeId}>
                    {entry.employee.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ot_type">Mesai Türü</label>
              <select
                id="ot_type"
                value={type}
                onChange={(e) => setType(e.target.value as 'OVERTIME_50' | 'OVERTIME_100')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="OVERTIME_50">%50</option>
                <option value="OVERTIME_100">%100</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ot_hours">Saat</label>
              <input
                id="ot_hours"
                type="number"
                min="0"
                step="0.25"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSaving || !selectedEntry}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? 'Kaydediliyor...' : 'Mesaiyi Kaydet'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ot_desc">
              Açıklama (maks. 100 karakter)
            </label>
            <input
              id="ot_desc"
              type="text"
              value={description}
              maxLength={100}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Mesai açıklaması"
            />
            <div className="text-xs text-gray-500 mt-1">{description.length}/100</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-200">
              <div className="text-slate-600">Maaş</div>
              <div className="font-semibold text-slate-900">{formatCurrency(selectedEntry?.employee.salary || 0)}</div>
            </div>
            <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-200">
              <div className="text-slate-600">Toplam Günlük</div>
              <div className="font-semibold text-slate-900">{formatCurrency(selectedEntry?.dailyWage || 0)}</div>
            </div>
            <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-200">
              <div className="text-slate-600">Saatlik Ücret</div>
              <div className="font-semibold text-slate-900">{formatCurrency(hourlyWage)}</div>
            </div>
            <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-200">
              <div className="text-slate-600">Çarpan</div>
              <div className="font-semibold text-slate-900">{multiplier}</div>
            </div>
            <div className="px-3 py-2 rounded-md bg-indigo-50 border border-indigo-200">
              <div className="text-indigo-700">Mesai Tutarı</div>
              <div className="font-bold text-indigo-900">{formatCurrency(amount)}</div>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Girilen Mesailer</h2>
          <div className="w-full md:w-72">
            <label htmlFor="overtime_table_employee_filter" className="block text-xs font-medium text-gray-600 mb-1">
              Çalışan Filtresi
            </label>
            <select
              id="overtime_table_employee_filter"
              value={listEmployeeFilterId}
              onChange={(e) => setListEmployeeFilterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">(Tümü)</option>
              {payrollEntries.map((entry) => (
                <option key={entry.employeeId} value={entry.employeeId}>
                  {entry.employee.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
        {overtimeEntries.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Bu dönem için mesai kaydı yok.</div>
        ) : (
          <>
            {filteredOvertimeEntries.length === 0 ? (
              <div className="p-10 text-center text-gray-500">Seçili filtreye uygun mesai kaydı yok.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saat</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Çarpan</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOvertimeEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-6 py-4 text-sm text-gray-900">{entry.employee.fullName}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{new Date(entry.entryDate).toLocaleDateString('tr-TR')}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{entry.type === 'OVERTIME_50' ? '%50' : '%100'}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700">{entry.hours}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-700">{entry.multiplier}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(entry.amount)}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{entry.description || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <button
                              type="button"
                              onClick={() => handleDelete(entry)}
                              disabled={deletingId === entry.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              {deletingId === entry.id ? 'Siliniyor...' : 'Sil'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-gray-200 bg-slate-50 px-6 py-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Çalışan Bazlı Toplamlar</h3>
                  <div className="space-y-1">
                    {employeeSummaries.map((item) => (
                      <div key={item.employeeName} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{item.employeeName}</span>
                        <span className="font-semibold text-slate-900">
                          <span className="text-orange-600">%50: {formatCurrency(item.amount50)} ({item.hours50.toFixed(2)}s)</span>
                          {' · '}
                          <span className="text-blue-600">%100: {formatCurrency(item.amount100)} ({item.hours100.toFixed(2)}s)</span>
                          {' · '}
                          <span className="text-green-700">Toplam: {formatCurrency(item.totalAmount)} ({item.totalHours.toFixed(2)}s)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-900 font-semibold">Genel Toplam</span>
                    <span className="font-bold text-slate-900">
                      <span className="text-orange-600">%50: {formatCurrency(totals.amount50)} ({totals.hours50.toFixed(2)}s)</span>
                      {' · '}
                      <span className="text-blue-600">%100: {formatCurrency(totals.amount100)} ({totals.hours100.toFixed(2)}s)</span>
                      {' · '}
                      <span className="text-green-700">Toplam: {formatCurrency(totals.totalAmount)} ({totals.totalHours.toFixed(2)}s)</span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
