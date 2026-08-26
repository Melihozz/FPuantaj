import { useState, useEffect, useCallback } from 'react';
import {
  PayrollEntry,
  getPayrollByMonth,
  updatePayroll,
  batchUpdatePayroll,
  isPayrollApiError,
  formatCurrency,
  getCurrentPeriod,
  MONTH_NAMES,
} from '../api/payroll';
import { WorkArea } from '../api/employee';
import { useCategories } from '../context/CategoryContext';
import { getPayrollConfig, DEFAULT_PAYROLL_CONFIG, PayrollConfig } from '../api/config';
import EditableCell from '../components/EditableCell';
import { useToast } from '../context/ToastContext';
import { PanelLoader } from '../components/Loaders';
import {
  IconAlertTriangle,
  IconCalendar,
  IconDownload,
  IconDrag,
  IconGrid,
  IconInbox,
  IconLayers,
  IconTrendUp,
  IconUsers,
  IconWallet,
} from '../components/Icons';

type EditableField = 'daysWorked' | 'advance' | 'officialAdvance' | 'overtime50' | 'overtime100';

export default function PayrollPage() {
  // Hesaplama sabitleri backend'den gelir; ulaşılamazsa varsayılanlar kullanılır.
  const [payrollConfig, setPayrollConfig] = useState<PayrollConfig>(DEFAULT_PAYROLL_CONFIG);
  const FIXED_OFFICIAL_PAYMENT = payrollConfig.officialWageBase;
  const OFFICIAL_WORKING_DAYS_BASE = payrollConfig.officialWorkingDaysBase;

  useEffect(() => {
    let cancelled = false;
    getPayrollConfig().then((config) => {
      if (!cancelled) setPayrollConfig(config);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingArea, setDraggingArea] = useState<WorkArea | null>(null);
  const [draggingGroupArea, setDraggingGroupArea] = useState<WorkArea | null>(null);
  const { showToast } = useToast();
  const { labelOf, orderedCodes } = useCategories();

  const { month: currentMonth, year: currentYear } = getCurrentPeriod();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  // Grup sırası kategorilerden gelir; kullanıcı sürükleyerek döneme özel
  // değiştirirse localStorage'a yazılır
  const [workAreaOrder, setWorkAreaOrder] = useState<WorkArea[]>(orderedCodes);

  const fetchPayroll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPayrollByMonth(selectedMonth, selectedYear);
      setEntries(data);
    } catch (err) {
      const message = isPayrollApiError(err) ? err.message : 'Hata';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, showToast]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  // Restore group order per period
  useEffect(() => {
    if (orderedCodes.length === 0) return; // kategoriler henüz yüklenmedi

    const key = `puantaj_workarea_order_${selectedYear}_${selectedMonth}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      setWorkAreaOrder(orderedCodes);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error('invalid');
      // Silinmiş kategoriler kayıtlı sıradan düşer, yeni eklenenler sona gelir
      const fromStorage = parsed.filter(
        (v): v is WorkArea => typeof v === 'string' && orderedCodes.includes(v)
      );
      const merged = [...fromStorage, ...orderedCodes.filter((a) => !fromStorage.includes(a))];
      setWorkAreaOrder(merged);
    } catch {
      setWorkAreaOrder(orderedCodes);
    }
  }, [selectedMonth, selectedYear, orderedCodes]);

  const handleCellChange = async (entryId: string, field: EditableField, value: number) => {
    setSavingId(entryId);
    try {
      const updatedEntry = await updatePayroll(entryId, { [field]: value });
      setEntries(prev => prev.map(e => e.id === entryId ? updatedEntry : e));
      showToast('Kaydedildi', 'success');
    } catch {
      showToast('Hata', 'error');
      await fetchPayroll();
    } finally {
      setSavingId(null);
    }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  const grouped: Record<string, PayrollEntry[]> = {};
  entries.forEach((e) => {
    if (!grouped[e.employee.workArea]) grouped[e.employee.workArea] = [];
    grouped[e.employee.workArea].push(e);
  });

  // Kategorisi silinmiş çalışanlar tablodan düşmesin diye sona eklenir
  const displayAreas: WorkArea[] = [
    ...workAreaOrder,
    ...Object.keys(grouped).filter((code) => !workAreaOrder.includes(code)),
  ];

  const getSortedAreaEntries = (area: WorkArea) =>
    [...(grouped[area] ?? [])].sort((a, b) => {
      const aOrder = a.sortOrder ?? 0;
      const bOrder = b.sortOrder ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.employee.fullName.localeCompare(b.employee.fullName, 'tr-TR');
    });

  const totalsByArea: Record<string, number> = {};
  // Sum of the "Toplam" column (totalReceivable) across all displayed employees
  entries.forEach((e) => {
    totalsByArea[e.employee.workArea] =
      (totalsByArea[e.employee.workArea] ?? 0) + e.totalReceivable;
  });
  const grandTotal = entries.reduce((acc, e) => acc + e.totalReceivable, 0);

  // Avanslar özeti: avansı olan çalışanlar, resmi (officialAdvance) ve
  // gayri resmi (advance) ayrımıyla. Tablo grubu sırasına göre dizilir.
  const advanceRows = displayAreas.flatMap((area) =>
    getSortedAreaEntries(area)
      .filter((e) => (e.advance || 0) > 0 || (e.officialAdvance || 0) > 0)
      .map((e) => ({
        employeeId: e.employeeId,
        name: e.employee.fullName,
        area: labelOf(e.employee.workArea),
        official: e.officialAdvance || 0, // R.Avans
        cash: e.advance || 0, // G.R.Avans
      }))
  );
  const advanceTotals = advanceRows.reduce(
    (acc, r) => ({ official: acc.official + r.official, cash: acc.cash + r.cash }),
    { official: 0, cash: 0 }
  );

  const persistGroupOrder = (next: WorkArea[]) => {
    const key = `puantaj_workarea_order_${selectedYear}_${selectedMonth}`;
    localStorage.setItem(key, JSON.stringify(next));
  };

  const handleGroupDrop = (targetArea: WorkArea) => {
    if (!draggingGroupArea) return;
    if (draggingGroupArea === targetArea) return;
    const fromIndex = workAreaOrder.indexOf(draggingGroupArea);
    const toIndex = workAreaOrder.indexOf(targetArea);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...workAreaOrder];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggingGroupArea);
    setWorkAreaOrder(next);
    persistGroupOrder(next);
    setDraggingGroupArea(null);
  };

  const handleRowDrop = async (area: WorkArea, targetId: string) => {
    if (!draggingId || draggingArea !== area) return;
    if (draggingId === targetId) return;

    const areaEntries = getSortedAreaEntries(area);
    const fromIndex = areaEntries.findIndex(e => e.id === draggingId);
    const toIndex = areaEntries.findIndex(e => e.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reordered = [...areaEntries];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updates = reordered.map((e, idx) => ({
      employeeId: e.employeeId,
      month: e.month,
      year: e.year,
      sortOrder: idx,
    }));

    // Optimistic UI update
    setEntries(prev =>
      prev.map(e => {
        if (e.employee.workArea !== area) return e;
        const idx = reordered.findIndex(r => r.id === e.id);
        return idx >= 0 ? { ...e, sortOrder: idx } : e;
      })
    );

    try {
      await batchUpdatePayroll(updates);
      showToast('Sıralama kaydedildi', 'success');
    } catch {
      showToast('Sıralama kaydedilemedi', 'error');
      await fetchPayroll();
    } finally {
      setDraggingId(null);
      setDraggingArea(null);
    }
  };

  // Excel dosyasını kullanıcıya kaydettirir (mümkünse kayıt yeri seçtirerek)
  const saveExcelFile = async (workbook: import('exceljs').Workbook, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const binary = buffer instanceof ArrayBuffer ? buffer : (buffer as ArrayBuffer);

    const pickerWindow = window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<{
        createWritable: () => Promise<{
          write: (data: BlobPart) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    };

    if (pickerWindow.showSaveFilePicker) {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Excel File',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(binary);
      await writable.close();
    } else {
      const blob = new Blob([binary], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
      }, 1500);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    }
  };

  const handleExportExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Puantaj');
      const moneyFormat = '#,##0.00';
      const officialDailyRaw = FIXED_OFFICIAL_PAYMENT / OFFICIAL_WORKING_DAYS_BASE;

      const formatExcelDate = (date: string | null) =>
        date ? new Date(date).toLocaleDateString('tr-TR') : '-';

      const headerLabels = [
        'Çalışan',
        'Sigorta',
        'Giriş/Çıkış',
        'Maaş',
        'Ç.Günü',
        'Çalıştığı',
        'R.Günlük',
        'G.R.Günlük',
        'T.Günlük',
        'G.R.Avans',
        'R.Avans',
        'Hak Edilen',
        '%50',
        '%100',
        'Resmi',
        'G.Resmi',
        'Toplam',
      ];

      worksheet.columns = [
        { width: 24 }, { width: 10 }, { width: 16 }, { width: 14 }, { width: 10 }, { width: 10 },
        { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 },
        { width: 12 }, { width: 12 }, { width: 13 }, { width: 13 }, { width: 13 },
      ];

      const period = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
      const titleRow = worksheet.addRow([`Puantaj Tablosu - ${period}`]);
      worksheet.mergeCells(`A${titleRow.number}:Q${titleRow.number}`);
      titleRow.getCell(1).font = { bold: true, size: 14 };
      titleRow.getCell(1).alignment = { horizontal: 'left' };
      worksheet.addRow([]);

      const areaRanges: Array<{ label: string; start: number; end: number }> = [];
      const insuredExpr = (row: number) => `LOWER(TRIM($B${row}))="evet"`;
      const dailyWageExpr = (row: number) => `IF($E${row}>0,$D${row}/$E${row},0)`;
      const earnedExpr = (row: number) => `MAX(0,${dailyWageExpr(row)}*$F${row})`;
      const officialBaseExpr = (row: number) =>
        `IF(${insuredExpr(row)},MIN(${earnedExpr(row)},MAX(0,${officialDailyRaw}*$F${row})),0)`;
      const cashBaseExpr = (row: number) =>
        `MAX(0,${earnedExpr(row)}-${officialBaseExpr(row)})+MAX(0,$M${row})+MAX(0,$N${row})`;

      displayAreas.forEach((area) => {
        const areaEntries = getSortedAreaEntries(area);
        if (areaEntries.length === 0) return;

        const groupTitle = worksheet.addRow([`${labelOf(area)} Çalışanları (${areaEntries.length} kişi)`]);
        worksheet.mergeCells(`A${groupTitle.number}:Q${groupTitle.number}`);
        groupTitle.getCell(1).font = { bold: true, size: 12 };

        const headerRow = worksheet.addRow(headerLabels);
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
        const blueHeaderCols = [6, 10, 11, 13, 14];
        const greenHeaderCols = [7, 8, 9, 12, 15, 16, 17];
        blueHeaderCols.forEach((col) => {
          headerRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDBEAFE' },
          };
        });
        greenHeaderCols.forEach((col) => {
          headerRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' },
          };
        });

        const startDataRow = headerRow.number + 1;

        areaEntries.forEach((entry) => {
          const dataRow = worksheet.addRow([
            entry.employee.fullName,
            entry.employee.isInsured ? 'Evet' : 'Hayır',
            `${formatExcelDate(entry.employee.startDate)}${entry.employee.endDate ? ` / ${formatExcelDate(entry.employee.endDate)}` : ''}`,
            entry.employee.salary,
            entry.employee.workingDays,
            entry.daysWorked,
            0,
            0,
            0,
            entry.advance,
            entry.employee.isInsured ? entry.officialAdvance : 0,
            0,
            Math.max(0, entry.overtime50),
            Math.max(0, entry.overtime100),
            0,
            0,
            0,
          ]);

          const row = dataRow.number;
          dataRow.getCell(7).value = { formula: `IF(${insuredExpr(row)},MIN($I${row},${officialDailyRaw}),0)` };
          dataRow.getCell(8).value = { formula: `MAX(0,$I${row}-$G${row})` };
          dataRow.getCell(9).value = { formula: dailyWageExpr(row) };
          dataRow.getCell(12).value = { formula: earnedExpr(row) };
          dataRow.getCell(15).value = {
            formula: `IF(${insuredExpr(row)},MAX(0,${officialBaseExpr(row)}-MIN(${officialBaseExpr(row)},$K${row})),0)`,
          };
          dataRow.getCell(16).value = {
            formula: `MAX(0,${cashBaseExpr(row)}-MIN(${cashBaseExpr(row)},$J${row}))`,
          };
          dataRow.getCell(17).value = { formula: `MAX(0,$L${row}+$M${row}+$N${row}-$J${row}-$K${row})` };

          dataRow.getCell(2).alignment = { horizontal: 'center' };
          dataRow.getCell(2).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: entry.employee.isInsured ? 'FFDCFCE7' : 'FFFEE2E2' },
          };
          dataRow.getCell(2).font = {
            bold: true,
            color: { argb: entry.employee.isInsured ? 'FF166534' : 'FF991B1B' },
          };
          const blueDataCols = [6, 10, 11, 13, 14];
          const greenDataCols = [7, 8, 9, 12, 15, 16, 17];
          blueDataCols.forEach((col) => {
            dataRow.getCell(col).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFEFF6FF' },
            };
          });
          greenDataCols.forEach((col) => {
            dataRow.getCell(col).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF0FDF4' },
            };
          });
          for (let c = 4; c <= 17; c++) {
            dataRow.getCell(c).numFmt = moneyFormat;
            dataRow.getCell(c).alignment = { horizontal: 'right' };
          }
          dataRow.getCell(5).numFmt = '0';
          dataRow.getCell(6).numFmt = '0';
          dataRow.getCell(5).alignment = { horizontal: 'center' };
          dataRow.getCell(6).alignment = { horizontal: 'center' };
          for (let c = 1; c <= 17; c++) {
            dataRow.getCell(c).border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          }
        });

        const endDataRow = worksheet.rowCount;
        areaRanges.push({
          label: labelOf(area),
          start: startDataRow,
          end: endDataRow,
        });
        worksheet.addRow([]);
      });

      const totalsTitle = worksheet.addRow(['Toplamlar']);
      totalsTitle.getCell(1).font = { bold: true, size: 12 };

      const totalsHeaderRow = worksheet.addRow([
        'Kategori',
        'R.TOPLAM',
        'G.R.TOPLAM',
        'Genel Toplam',
      ]);
      totalsHeaderRow.eachCell((cell) => {
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

      const totalRows: number[] = [];
      areaRanges.forEach((areaRange) => {
        const totalRow = worksheet.addRow([areaRange.label, 0, 0, 0]);
        totalRow.getCell(2).value = { formula: `SUM($O$${areaRange.start}:$O$${areaRange.end})` };
        totalRow.getCell(3).value = { formula: `SUM($P$${areaRange.start}:$P$${areaRange.end})` };
        totalRow.getCell(4).value = { formula: `SUM($Q$${areaRange.start}:$Q$${areaRange.end})` };

        totalRow.getCell(1).font = { bold: true };
        totalRow.getCell(2).numFmt = moneyFormat;
        totalRow.getCell(3).numFmt = moneyFormat;
        totalRow.getCell(4).numFmt = moneyFormat;
        totalRow.getCell(2).alignment = { horizontal: 'right' };
        totalRow.getCell(3).alignment = { horizontal: 'right' };
        totalRow.getCell(4).alignment = { horizontal: 'right' };

        for (let c = 1; c <= 4; c++) {
          totalRow.getCell(c).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }
        totalRows.push(totalRow.number);
      });

      const grandTotalRow = worksheet.addRow(['Genel Toplam', 0, 0, 0]);
      grandTotalRow.getCell(1).font = { bold: true };
      grandTotalRow.getCell(2).font = { bold: true };
      grandTotalRow.getCell(3).font = { bold: true };
      grandTotalRow.getCell(4).font = { bold: true };
      grandTotalRow.getCell(2).numFmt = moneyFormat;
      grandTotalRow.getCell(3).numFmt = moneyFormat;
      grandTotalRow.getCell(4).numFmt = moneyFormat;
      grandTotalRow.getCell(2).alignment = { horizontal: 'right' };
      grandTotalRow.getCell(3).alignment = { horizontal: 'right' };
      grandTotalRow.getCell(4).alignment = { horizontal: 'right' };
      grandTotalRow.getCell(2).value = {
        formula: totalRows.length > 0 ? totalRows.map((row) => `B${row}`).join('+') : '0',
      };
      grandTotalRow.getCell(3).value = {
        formula: totalRows.length > 0 ? totalRows.map((row) => `C${row}`).join('+') : '0',
      };
      grandTotalRow.getCell(4).value = {
        formula: totalRows.length > 0 ? totalRows.map((row) => `D${row}`).join('+') : '0',
      };
      for (let c = 1; c <= 4; c++) {
        grandTotalRow.getCell(c).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      }

      const filename = `puantaj_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
      await saveExcelFile(workbook, filename);
      showToast('Excel indirildi', 'success');
    } catch {
      showToast('Excel oluşturulamadı', 'error');
    }
  };

  // Avanslar bölümünün kendi Excel çıktısı
  const handleExportAdvancesExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Avanslar');
      const moneyFormat = '#,##0.00';

      worksheet.columns = [{ width: 26 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }];

      const period = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
      const titleRow = worksheet.addRow([`Avans Listesi - ${period}`]);
      worksheet.mergeCells(`A${titleRow.number}:E${titleRow.number}`);
      titleRow.getCell(1).font = { bold: true, size: 14 };
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Çalışan', 'Kategori', 'R.Avans', 'G.R.Avans', 'Toplam']);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF334155' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      advanceRows.forEach((r) => {
        const row = worksheet.addRow([r.name, r.area, r.official, r.cash, r.official + r.cash]);
        for (let c = 3; c <= 5; c++) {
          row.getCell(c).numFmt = moneyFormat;
          row.getCell(c).alignment = { horizontal: 'right' };
        }
      });

      const totalRow = worksheet.addRow([
        'Genel Toplam',
        '',
        advanceTotals.official,
        advanceTotals.cash,
        advanceTotals.official + advanceTotals.cash,
      ]);
      totalRow.eachCell((cell) => (cell.font = { bold: true }));
      for (let c = 3; c <= 5; c++) {
        totalRow.getCell(c).numFmt = moneyFormat;
        totalRow.getCell(c).alignment = { horizontal: 'right' };
      }

      const filename = `avanslar_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
      await saveExcelFile(workbook, filename);
      showToast('Excel indirildi', 'success');
    } catch {
      showToast('Excel oluşturulamadı', 'error');
    }
  };

  if (isLoading) return <PanelLoader label="Puantaj tablosu hazırlanıyor..." />;

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div className="flex items-start gap-4">
          <span className="title-icon">
            <IconGrid className="h-[22px] w-[22px]" />
          </span>
          <div>
            <h1 className="page-title">
              Puantaj Tablosu
              <span className="badge badge-neutral">{entries.length} çalışan</span>
            </h1>
            <p className="page-desc">
              {MONTH_NAMES[selectedMonth]} {selectedYear} dönemi · gün, avans ve mesai girişleri
              anında hakedişe yansır.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white p-1 shadow-card">
            <span className="pl-2.5 text-ink-400">
              <IconCalendar className="h-[18px] w-[18px]" />
            </span>
            <select
              aria-label="Ay seçimi"
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="w-auto cursor-pointer appearance-none rounded-lg border-0 bg-transparent py-1.5 pl-1 pr-6 text-sm font-semibold text-ink-800 focus:ring-0"
            >
              {Object.entries(MONTH_NAMES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span aria-hidden="true" className="h-5 w-px bg-ink-200" />
            <select
              aria-label="Yıl seçimi"
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="w-auto cursor-pointer appearance-none rounded-lg border-0 bg-transparent py-1.5 pl-1 pr-6 text-sm font-semibold text-ink-800 focus:ring-0"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button type="button" onClick={handleExportExcel} className="btn btn-success">
            <IconDownload className="h-[18px] w-[18px]" />
            Excel'e İndir
          </button>
        </div>
      </header>

      {/* Dönem özeti */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[
            {
              label: 'Çalışan',
              value: String(entries.length),
              icon: IconUsers,
              tone: 'text-brand-600 bg-brand-50 ring-brand-100',
            },
            {
              label: 'Aktif Bölüm',
              value: String(displayAreas.filter((a) => (grouped[a]?.length ?? 0) > 0).length),
              icon: IconLayers,
              tone: 'text-sky-600 bg-sky-50 ring-sky-100',
            },
            {
              label: 'Toplam Avans',
              value: formatCurrency(advanceTotals.official + advanceTotals.cash),
              icon: IconWallet,
              tone: 'text-accent-600 bg-accent-50 ring-accent-100',
            },
            {
              label: 'Genel Toplam',
              value: formatCurrency(grandTotal),
              icon: IconTrendUp,
              tone: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
            },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="card card-hover flex items-center gap-3.5 px-4 py-4">
              <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="stat-label">{label}</div>
                <div className="truncate font-display text-lg font-bold tracking-tight text-ink-900 tabular-nums">
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <IconAlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          <span className="font-medium">{error}</span>
        </div>
      )}
      {entries.length === 0 ? (
        <div className="card empty-state">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
            <IconInbox className="h-7 w-7" />
          </span>
          <p className="font-display text-base font-semibold text-ink-800">
            Bu dönem için çalışan bulunmuyor
          </p>
          <p className="max-w-sm text-sm text-ink-500">
            Farklı bir dönem seçin veya Tanımlamalar &gt; Çalışanlar sayfasından yeni kayıt ekleyin.
          </p>
        </div>
      ) : (
        <>
          {displayAreas.map(area => {
            const areaEntries = getSortedAreaEntries(area);
            if (areaEntries.length === 0) return null;
            return (
              <div key={area} className="card overflow-hidden">
                <div
                  className="section-head group cursor-move"
                  draggable
                  onDragStart={() => {
                    // Don't start group drag while a row drag is active
                    if (draggingId) return;
                    setDraggingGroupArea(area);
                  }}
                  onDragEnd={() => setDraggingGroupArea(null)}
                  onDragOver={(e) => {
                    if (!draggingGroupArea) return;
                    e.preventDefault();
                  }}
                  onDrop={() => handleGroupDrop(area)}
                  title="Bölümü sürükleyerek sırasını değiştir"
                >
                  <div className="section-bar" />
                  <h2 className="section-title">
                    {labelOf(area)} Çalışanları
                    <span className="badge badge-neutral ml-2">
                      {areaEntries.length} kişi
                    </span>
                  </h2>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconDrag className="h-4 w-4" />
                    Sürükle
                  </span>
                </div>
                {/* Dar ekranda sütunlar üst üste binmesin: min genişliğin altında
                    yatay kaydırma devreye girer, geniş ekranda görünüm aynı kalır. */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] table-fixed">
                    <thead className="bg-ink-50 border-b border-ink-200">
                      <tr>
                        <th className="px-2 py-2 text-left text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight">Çalışan</th>
                        <th className="px-2 py-2 text-center text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight">Sigorta</th>
                        <th className="px-2 py-2 text-left text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight">Giriş/Çıkış</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight">Maaş</th>
                        <th className="px-2 py-2 text-center text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight">Ç.Günü</th>
                        <th className="px-2 py-2 text-center text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-brand-100/60">Çalıştığı</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-emerald-100/60">R.Günlük</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-emerald-100/60">G.R.Günlük</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-emerald-100/60">T.Günlük</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-brand-100/60">G.R.Avans</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-brand-100/60">R.Avans</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-emerald-100/60">Hak Edilen</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-emerald-100/60">%50</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-emerald-100/60">%100</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-emerald-100/60">Resmi</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-emerald-100/60">G.Resmi</th>
                        <th className="px-2 py-2 text-right text-[10.5px] font-bold text-ink-500 uppercase tracking-[0.03em] leading-tight bg-emerald-100/60">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-200/60">
                      {areaEntries.map(entry => {
                      const earned = Math.max(0, entry.earnedSalary);
                      const officialDaily = FIXED_OFFICIAL_PAYMENT / OFFICIAL_WORKING_DAYS_BASE;
                      const officialBase = entry.employee.isInsured
                        ? Math.min(earned, Math.max(0, officialDaily * entry.daysWorked))
                        : 0;
                      const cashBase =
                        Math.max(0, earned - officialBase) +
                        Math.max(0, entry.overtime50) +
                        Math.max(0, entry.overtime100);

                      const officialRemaining = entry.employee.isInsured
                        ? Math.max(0, officialBase - Math.min(officialBase, entry.officialAdvance))
                        : 0;
                      const cashRemaining = Math.max(0, cashBase - Math.min(cashBase, entry.advance));
                      const isPaid = officialRemaining === 0 && cashRemaining === 0;

                      const paidRowClass = isPaid ? 'bg-amber-50/80' : '';

                      return (
                      <tr
                        key={entry.id}
                        draggable
                        onDragStart={() => {
                          setDraggingId(entry.id);
                          setDraggingArea(area);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDraggingArea(null);
                        }}
                        onDragOver={(e) => {
                          if (draggingArea === area) e.preventDefault();
                        }}
                        onDrop={() => handleRowDrop(area, entry.id)}
                        className={`transition-colors duration-150 hover:bg-brand-50/40 ${savingId === entry.id ? 'opacity-50' : ''} ${draggingId === entry.id ? 'cursor-grabbing' : 'cursor-grab'} ${paidRowClass}`}
                        title="Satırı sürükleyerek sırayı değiştir"
                      >
                        <td className="px-2 py-1.5 text-xs font-semibold text-ink-900 whitespace-normal break-words leading-snug" title={entry.employee.fullName}>
                          {entry.employee.fullName}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-center"><span className={entry.employee.isInsured ? 'badge badge-success !px-2 !text-[10.5px]' : 'badge badge-danger !px-2 !text-[10.5px]'}>{entry.employee.isInsured ? 'Evet' : 'Hayır'}</span></td>
                        <td className="px-2 py-1.5 text-xs">
                          <div>{formatDate(entry.employee.startDate)}</div>
                          {entry.employee.endDate && <div className="text-rose-600 font-medium">{formatDate(entry.employee.endDate)}</div>}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap">{formatCurrency(entry.employee.salary)}</td>
                        <td className="px-2 py-1.5 text-xs text-center text-ink-400">{entry.employee.workingDays}</td>
                        <td className="px-2 py-1.5 bg-brand-50/60"><EditableCell value={entry.daysWorked} onChange={v => handleCellChange(entry.id, 'daysWorked', v)} min={0} max={31} isInteger disabled={savingId !== null} className="text-center" /></td>
                        {(() => {
                          const officialDailyRaw = FIXED_OFFICIAL_PAYMENT / OFFICIAL_WORKING_DAYS_BASE;
                          const officialDaily = entry.employee.isInsured ? Math.min(entry.dailyWage, officialDailyRaw) : 0;
                          const cashDaily = Math.max(0, entry.dailyWage - officialDaily);
                          return (
                            <>
                              <td className={`px-2 py-1.5 text-xs text-right whitespace-nowrap bg-emerald-50/50 ${entry.employee.isInsured ? 'text-ink-900' : 'text-ink-400'}`}>
                                {formatCurrency(officialDaily)}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-emerald-50/50">
                                {formatCurrency(cashDaily)}
                              </td>
                            </>
                          );
                        })()}
                        <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-emerald-50/50">{formatCurrency(entry.dailyWage)}</td>
                        <td className="px-2 py-1.5 bg-brand-50/60"><EditableCell value={entry.advance} onChange={v => handleCellChange(entry.id, 'advance', v)} min={0} disabled={savingId !== null} className="text-right" prefix="₺" /></td>
                        <td className={`px-2 py-1.5 ${entry.employee.isInsured ? 'bg-brand-50/60' : 'bg-ink-50'}`}>
                          <EditableCell
                            value={entry.employee.isInsured ? entry.officialAdvance : 0}
                            onChange={v => handleCellChange(entry.id, 'officialAdvance', v)}
                            min={0}
                            disabled={!entry.employee.isInsured || savingId !== null}
                            className={`text-right ${entry.employee.isInsured ? '' : 'text-ink-400'}`}
                            prefix="₺"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-emerald-50/50">{formatCurrency(entry.earnedSalary)}</td>
                        <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-emerald-50/50">{formatCurrency(entry.overtime50)}</td>
                        <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-emerald-50/50">{formatCurrency(entry.overtime100)}</td>
                        {(() => {
                          return (
                            <>
                              <td className={`px-2 py-1.5 text-xs text-right whitespace-nowrap bg-emerald-50/50 ${entry.employee.isInsured ? 'text-ink-900' : 'text-ink-400'}`}>
                                {formatCurrency(officialRemaining)}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-emerald-50/50">
                                {formatCurrency(cashRemaining)}
                              </td>
                            </>
                          );
                        })()}
                        <td className="px-2 py-1.5 text-xs font-semibold text-right whitespace-nowrap bg-emerald-50/50"><span className={entry.totalReceivable >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatCurrency(entry.totalReceivable)}</span></td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

          {/* Totals summary */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <IconTrendUp className="h-[18px] w-[18px]" />
                </span>
                Toplamlar
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-2">
                {displayAreas
                  .filter((area) => (grouped[area]?.length ?? 0) > 0)
                  .map((area) => (
                    <div key={area} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-ink-50">
                      <span className="font-medium text-ink-700">{labelOf(area)}</span>
                      <span className={`font-semibold ${(totalsByArea[area] ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(totalsByArea[area] ?? 0)}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-ink-200/70 bg-ink-50/70 px-3.5 py-3">
                <span className="font-display font-bold text-ink-900">Genel Toplam</span>
                <span className={`font-display text-lg font-bold tabular-nums ${grandTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Advances summary */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600 ring-1 ring-accent-100">
                  <IconWallet className="h-[18px] w-[18px]" />
                </span>
                Avanslar
              </h2>
              <button
                type="button"
                onClick={handleExportAdvancesExcel}
                disabled={advanceRows.length === 0}
                className="btn btn-sm btn-success"
              >
                <IconDownload className="h-4 w-4" />
                Excel'e İndir
              </button>
            </div>
            <div className="px-6 py-4">
              {advanceRows.length === 0 ? (
                <div className="text-sm text-ink-500">Bu dönem için avans girilmemiş.</div>
              ) : (
                <>
                  {advanceRows.map((r, index) => (
                    <div
                      key={r.employeeId}
                      className={`flex items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                        index % 2 === 1 ? 'bg-ink-50/70' : ''
                      } hover:bg-brand-50/70`}
                    >
                      <span className="text-ink-700 font-medium whitespace-nowrap">{r.name}</span>
                      <span className="badge badge-neutral whitespace-nowrap">
                        {r.area}
                      </span>
                      <span aria-hidden="true" className="divider-dots" />
                      <span className="font-semibold whitespace-nowrap">
                        <span className="text-brand-600">R.Avans: {formatCurrency(r.official)}</span>
                        {' · '}
                        <span className="text-accent-600">G.R.Avans: {formatCurrency(r.cash)}</span>
                        {' · '}
                        <span className="text-emerald-700">Toplam: {formatCurrency(r.official + r.cash)}</span>
                      </span>
                    </div>
                  ))}

                  <div className="mt-3 flex items-baseline gap-2 rounded-xl border border-ink-200/70 bg-ink-50/70 px-3 py-2.5">
                    <span className="font-display font-bold text-ink-900 whitespace-nowrap">Genel Toplam</span>
                    <span aria-hidden="true" className="divider-dots" />
                    <span className="font-bold whitespace-nowrap">
                      <span className="text-brand-600">R.Avans: {formatCurrency(advanceTotals.official)}</span>
                      {' · '}
                      <span className="text-accent-600">G.R.Avans: {formatCurrency(advanceTotals.cash)}</span>
                      {' · '}
                      <span className="text-emerald-700">Toplam: {formatCurrency(advanceTotals.official + advanceTotals.cash)}</span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
