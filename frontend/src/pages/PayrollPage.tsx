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
import { WORK_AREA_LABELS, WorkArea } from '../api/employee';
import EditableCell from '../components/EditableCell';
import { useToast } from '../context/ToastContext';

type EditableField = 'daysWorked' | 'advance' | 'officialAdvance' | 'overtime50' | 'overtime100';

const FIXED_OFFICIAL_PAYMENT = 28075;
const OFFICIAL_WORKING_DAYS_BASE = 30;

export default function PayrollPage() {
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingArea, setDraggingArea] = useState<WorkArea | null>(null);
  const [draggingGroupArea, setDraggingGroupArea] = useState<WorkArea | null>(null);
  const { showToast } = useToast();
  
  const { month: currentMonth, year: currentYear } = getCurrentPeriod();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const defaultWorkAreas: WorkArea[] = ['DEPO', 'URETIM', 'OFIS', 'SAHA_ELEMANI', 'KAYSERI_YATAS', 'ANKARA_YATAS', 'ISTANBUL_YATAS', 'DIGER'];
  const [workAreaOrder, setWorkAreaOrder] = useState<WorkArea[]>(defaultWorkAreas);

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
    const key = `puantaj_workarea_order_${selectedYear}_${selectedMonth}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      setWorkAreaOrder(defaultWorkAreas);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error('invalid');
      const fromStorage = parsed.filter((v): v is WorkArea => typeof v === 'string' && v in WORK_AREA_LABELS);
      // Ensure we don't lose new areas
      const merged = [...fromStorage, ...defaultWorkAreas.filter(a => !fromStorage.includes(a))];
      setWorkAreaOrder(merged);
    } catch {
      setWorkAreaOrder(defaultWorkAreas);
    }
  }, [selectedMonth, selectedYear]);

  const handleCellChange = async (entryId: string, field: EditableField, value: number) => {
    setSavingId(entryId);
    try {
      const updatedEntry = await updatePayroll(entryId, { [field]: value });
      setEntries(prev => prev.map(e => e.id === entryId ? updatedEntry : e));
      showToast('Kaydedildi', 'success');
    } catch (err) {
      showToast('Hata', 'error');
      await fetchPayroll();
    } finally {
      setSavingId(null);
    }
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  const grouped: Record<WorkArea, PayrollEntry[]> = {
    DEPO: [],
    URETIM: [],
    OFIS: [],
    SAHA_ELEMANI: [],
    KAYSERI_YATAS: [],
    ANKARA_YATAS: [],
    ISTANBUL_YATAS: [],
    DIGER: [],
  };
  entries.forEach(e => grouped[e.employee.workArea].push(e));

  const getSortedAreaEntries = (area: WorkArea) =>
    [...grouped[area]].sort((a, b) => {
      const aOrder = a.sortOrder ?? 0;
      const bOrder = b.sortOrder ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.employee.fullName.localeCompare(b.employee.fullName, 'tr-TR');
    });

  const totalsByArea: Record<WorkArea, number> = {
    DEPO: 0,
    URETIM: 0,
    OFIS: 0,
    SAHA_ELEMANI: 0,
    KAYSERI_YATAS: 0,
    ANKARA_YATAS: 0,
    ISTANBUL_YATAS: 0,
    DIGER: 0,
  };
  // Sum of the "Toplam" column (totalReceivable) across all displayed employees
  entries.forEach((e) => {
    totalsByArea[e.employee.workArea] += e.totalReceivable;
  });
  const grandTotal = entries.reduce((acc, e) => acc + e.totalReceivable, 0);

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

  if (isLoading) return <div className="bg-white shadow rounded-lg p-6 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          Puantaj Tablosu
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
            {entries.length} çalışan
          </span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Dönem:</span>
          <select aria-label="Ay seçimi" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-md text-sm">
            {Object.entries(MONTH_NAMES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select aria-label="Yıl seçimi" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-md text-sm">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      {entries.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">Bu dönem için çalışan bulunmuyor.</div>
      ) : (
        <>
          {workAreaOrder.map(area => {
            const areaEntries = getSortedAreaEntries(area);
            if (areaEntries.length === 0) return null;
            return (
              <div key={area} className="bg-white shadow rounded-lg overflow-hidden">
                <div
                  className="px-6 py-4 bg-gradient-to-r from-indigo-50 via-white to-slate-50 border-b border-slate-200 flex items-center gap-3 cursor-move"
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
                  <div className="h-6 w-1.5 rounded-full bg-indigo-600" />
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    {WORK_AREA_LABELS[area]} Çalışanları
                    <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                      {areaEntries.length} kişi
                    </span>
                  </h2>
                </div>
                <div className="overflow-x-hidden">
                  <table className="w-full table-fixed">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-2 py-2 text-left text-[11px] font-medium text-gray-500 uppercase leading-tight">Çalışan</th>
                        <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-500 uppercase leading-tight">Sigorta</th>
                        <th className="px-2 py-2 text-left text-[11px] font-medium text-gray-500 uppercase leading-tight">Giriş/Çıkış</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight">Maaş</th>
                        <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-500 uppercase leading-tight">Ç.Günü</th>
                        <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-500 uppercase leading-tight bg-blue-50">Çalıştığı</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-green-50">R.Günlük</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-green-50">G.R.Günlük</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-green-50">T.Günlük</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-blue-50">G.R.Avans</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-blue-50">R.Avans</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-green-50">Hak Edilen</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-blue-50">%50</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-blue-50">%100</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-green-50">Resmi</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-green-50">G.Resmi</th>
                        <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-500 uppercase leading-tight bg-green-50">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
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

                      const paidRowClass = isPaid ? 'bg-amber-50' : '';

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
                        className={`${savingId === entry.id ? 'opacity-50' : ''} ${draggingId === entry.id ? 'cursor-grabbing' : 'cursor-grab'} ${paidRowClass}`}
                        title="Satırı sürükleyerek sırayı değiştir"
                      >
                        <td className="px-2 py-1.5 text-xs font-medium whitespace-normal break-words leading-snug" title={entry.employee.fullName}>
                          {entry.employee.fullName}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-center"><span className={entry.employee.isInsured ? 'px-2 py-0.5 text-[11px] rounded-full bg-green-100 text-green-800' : 'px-2 py-0.5 text-[11px] rounded-full bg-gray-100'}>{entry.employee.isInsured ? 'Evet' : 'Hayır'}</span></td>
                        <td className="px-2 py-1.5 text-xs">
                          <div>{formatDate(entry.employee.startDate)}</div>
                          {entry.employee.endDate && <div className="text-red-600 font-medium">{formatDate(entry.employee.endDate)}</div>}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap">{formatCurrency(entry.employee.salary)}</td>
                        <td className="px-2 py-1.5 text-xs text-center text-gray-500">{entry.employee.workingDays}</td>
                        <td className="px-2 py-1.5 bg-blue-50"><EditableCell value={entry.daysWorked} onChange={v => handleCellChange(entry.id, 'daysWorked', v)} min={0} max={31} isInteger disabled={savingId !== null} className="text-center" /></td>
                        {(() => {
                          const officialDailyRaw = FIXED_OFFICIAL_PAYMENT / OFFICIAL_WORKING_DAYS_BASE;
                          const officialDaily = entry.employee.isInsured ? Math.min(entry.dailyWage, officialDailyRaw) : 0;
                          const cashDaily = Math.max(0, entry.dailyWage - officialDaily);
                          return (
                            <>
                              <td className={`px-2 py-1.5 text-xs text-right whitespace-nowrap bg-green-50 ${entry.employee.isInsured ? 'text-gray-900' : 'text-gray-400'}`}>
                                {formatCurrency(officialDaily)}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-green-50">
                                {formatCurrency(cashDaily)}
                              </td>
                            </>
                          );
                        })()}
                        <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-green-50">{formatCurrency(entry.dailyWage)}</td>
                        <td className="px-2 py-1.5 bg-blue-50"><EditableCell value={entry.advance} onChange={v => handleCellChange(entry.id, 'advance', v)} min={0} disabled={savingId !== null} className="text-right" prefix="₺" /></td>
                        <td className={`px-2 py-1.5 ${entry.employee.isInsured ? 'bg-blue-50' : 'bg-gray-50'}`}>
                          <EditableCell
                            value={entry.employee.isInsured ? entry.officialAdvance : 0}
                            onChange={v => handleCellChange(entry.id, 'officialAdvance', v)}
                            min={0}
                            disabled={!entry.employee.isInsured || savingId !== null}
                            className={`text-right ${entry.employee.isInsured ? '' : 'text-gray-400'}`}
                            prefix="₺"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-green-50">{formatCurrency(entry.earnedSalary)}</td>
                        <td className="px-2 py-1.5 bg-blue-50"><EditableCell value={entry.overtime50} onChange={v => handleCellChange(entry.id, 'overtime50', v)} min={0} disabled={savingId !== null} className="text-right" prefix="₺" /></td>
                        <td className="px-2 py-1.5 bg-blue-50"><EditableCell value={entry.overtime100} onChange={v => handleCellChange(entry.id, 'overtime100', v)} min={0} disabled={savingId !== null} className="text-right" prefix="₺" /></td>
                        {(() => {
                          return (
                            <>
                              <td className={`px-2 py-1.5 text-xs text-right whitespace-nowrap bg-green-50 ${entry.employee.isInsured ? 'text-gray-900' : 'text-gray-400'}`}>
                                {formatCurrency(officialRemaining)}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-right whitespace-nowrap bg-green-50">
                                {formatCurrency(cashRemaining)}
                              </td>
                            </>
                          );
                        })()}
                        <td className="px-2 py-1.5 text-xs font-semibold text-right whitespace-nowrap bg-green-50"><span className={entry.totalReceivable >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(entry.totalReceivable)}</span></td>
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
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">Toplamlar</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-2">
                {workAreaOrder
                  .filter((area) => grouped[area].length > 0)
                  .map((area) => (
                    <div key={area} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{WORK_AREA_LABELS[area]}</span>
                      <span className={`font-semibold ${totalsByArea[area] >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(totalsByArea[area])}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-900 font-semibold">Genel Toplam</span>
                <span className={`font-bold ${grandTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
