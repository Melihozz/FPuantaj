import { Fragment, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentPeriod, getPayrollByMonth, isPayrollApiError, MONTH_NAMES, PayrollEntry, formatCurrency } from '../api/payroll';
import { createOvertime, createOvertimeBulk, deleteOvertime, getOvertimeEntries, OvertimeEntry, CreateOvertimeInput } from '../api/overtime';
import { WorkArea } from '../api/employee';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../context/ToastContext';
import { PanelLoader } from '../components/Loaders';
import {
  IconAlertTriangle,
  IconCalendar,
  IconClose,
  IconClock,
  IconDownload,
  IconInbox,
  IconPlus,
  IconTrash,
  IconTrendUp,
} from '../components/Icons';

type OvertimeType = 'OVERTIME_50' | 'OVERTIME_100';

interface BulkOvertimeRow {
  id: string;
  employeeId: string;
  entryDate: string;
  type: OvertimeType;
  hours: number;
  description: string;
}

const newRowId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `row_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// Tekli formla AYNI formül: saatlik = günlük / 8, tutar = saatlik × çarpan × saat
const overtimeMultiplier = (type: OvertimeType) => (type === 'OVERTIME_50' ? 1.5 : 2);
const overtimeAmount = (dailyWage: number, type: OvertimeType, hours: number) =>
  Math.max(0, (dailyWage / 8) * overtimeMultiplier(type) * hours);

interface EmployeeOption {
  id: string;
  name: string;
  area: string; // çalışma alanı etiketi (Depo, Üretim, ...)
}

/**
 * Yazarak aranabilir çalışan seçici.
 * Liste, tablo kaydırma alanlarına takılmasın diye fixed konumlanır.
 */
function EmployeeSearchSelect({
  inputId,
  options,
  value,
  onChange,
  disabled,
}: {
  inputId: string;
  options: EmployeeOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const selected = options.find((option) => option.id === value);

  const normalized = (text: string) => text.toLocaleLowerCase('tr-TR');
  const filtered = query.trim()
    ? options.filter((option) => normalized(option.name).includes(normalized(query.trim())))
    : options;

  const computeRect = () => {
    const r = inputRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
  };

  const openList = (resetQuery: boolean) => {
    computeRect();
    if (resetQuery) setQuery('');
    setIsOpen(true);
  };

  const closeList = () => {
    setIsOpen(false);
    setQuery('');
  };

  const pick = (id: string) => {
    onChange(id);
    closeList();
    inputRef.current?.blur();
  };

  // Kaydırma/boyut değişiminde fixed listeyi input'a yeniden hizala.
  // (Kapatmak yerine hizalama: focus'un tetiklediği otomatik kaydırma
  // listeyi daha açılmadan kapatıyordu.)
  useEffect(() => {
    if (!isOpen) return;
    const update = () => computeRect();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        value={isOpen ? query : selected?.name || ''}
        placeholder={selected?.name || 'Çalışan ara...'}
        onFocus={() => openList(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          // resetQuery=false: yazılan harf silinmesin
          if (!isOpen) openList(false);
        }}
        onBlur={() => {
          // Seçenek tıklaması onMouseDown+preventDefault ile focus'u koruduğundan
          // buraya sadece gerçek "dışarı tıklama" düşer
          closeList();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault(); // form submit olmasın
            if (filtered.length > 0) pick(filtered[0].id);
          } else if (e.key === 'Escape') {
            closeList();
            inputRef.current?.blur();
          }
        }}
        className="field-cell"
        disabled={disabled}
        autoComplete="off"
      />
      {isOpen && rect && (
        <div
          className="fixed z-[70] max-h-52 overflow-y-auto rounded-xl border border-ink-200/70 bg-white p-1.5 shadow-lifted"
          style={{ top: rect.top, left: rect.left, width: rect.width }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-ink-500">Sonuç bulunamadı</div>
          ) : (
            filtered.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(option.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-brand-50 ${
                  option.id === value ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-700'
                }`}
              >
                <span>{option.name}</span>
                <span className="text-xs text-ink-500 whitespace-nowrap">{option.area}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface BulkOvertimeModalProps {
  payrollEntries: PayrollEntry[];
  month: number;
  year: number;
  isSaving: boolean;
  onSave: (inputs: CreateOvertimeInput[]) => Promise<void>;
  onClose: () => void;
}

function BulkOvertimeModal({ payrollEntries, month, year, isSaving, onSave, onClose }: BulkOvertimeModalProps) {
  const { labelOf } = useCategories();
  const today = new Date().toISOString().split('T')[0];
  const defaultEmployeeId = payrollEntries[0]?.employeeId || '';

  const employeeOptions: EmployeeOption[] = payrollEntries.map((entry) => ({
    id: entry.employeeId,
    name: entry.employee.fullName,
    area: labelOf(entry.employee.workArea),
  }));

  const areaLabelOf = (employeeId: string) =>
    employeeOptions.find((option) => option.id === employeeId)?.area || '-';

  const makeRow = (base?: Partial<BulkOvertimeRow>): BulkOvertimeRow => ({
    id: newRowId(),
    employeeId: base?.employeeId ?? defaultEmployeeId,
    entryDate: base?.entryDate ?? today,
    type: base?.type ?? 'OVERTIME_50',
    hours: base?.hours ?? 0,
    description: base?.description ?? '',
  });

  const [rows, setRows] = useState<BulkOvertimeRow[]>([makeRow()]);
  const [errors, setErrors] = useState<string[]>([]);

  const dailyWageOf = (employeeId: string) =>
    payrollEntries.find((entry) => entry.employeeId === employeeId)?.dailyWage || 0;

  const updateRow = <K extends keyof BulkOvertimeRow>(rowId: string, key: K, value: BulkOvertimeRow[K]) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
  };

  const addRow = () => {
    // Yeni satır son satırın tarihini devralır - aynı gün için seri giriş kolaylaşır
    setRows((prev) => [...prev, makeRow({ entryDate: prev[prev.length - 1]?.entryDate })]);
  };

  // Aynı çalışana diğer mesai türünden kopya satır: %50 satırından tek tıkla %100 (ve tersi)
  const duplicateWithOtherType = (rowId: string) => {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.id === rowId);
      if (index < 0) return prev;
      const source = prev[index];
      const copy = makeRow({
        ...source,
        type: source.type === 'OVERTIME_50' ? 'OVERTIME_100' : 'OVERTIME_50',
      });
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== rowId)));
  };

  const validRows = rows.filter((row) => row.employeeId && row.hours > 0);
  const totalAmount = validRows.reduce(
    (acc, row) => acc + overtimeAmount(dailyWageOf(row.employeeId), row.type, row.hours),
    0
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors: string[] = [];

    rows.forEach((row, index) => {
      if (!row.employeeId) {
        validationErrors.push(`Satır ${index + 1}: çalışan seçin.`);
      }
      if (row.hours <= 0) {
        validationErrors.push(`Satır ${index + 1}: mesai saati 0'dan büyük olmalıdır.`);
      }
      if (row.description.length > 100) {
        validationErrors.push(`Satır ${index + 1}: açıklama en fazla 100 karakter olabilir.`);
      }
      if (!row.entryDate) {
        validationErrors.push(`Satır ${index + 1}: tarih zorunludur.`);
      }
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    const payload: CreateOvertimeInput[] = rows.map((row) => ({
      employeeId: row.employeeId,
      entryDate: row.entryDate,
      month,
      year,
      type: row.type,
      multiplier: overtimeMultiplier(row.type),
      hours: row.hours,
      amount: Number(overtimeAmount(dailyWageOf(row.employeeId), row.type, row.hours).toFixed(2)),
      description: row.description.trim() || null,
    }));

    try {
      await onSave(payload);
      onClose();
    } catch {
      // Hata toast'ı parent'ta gösteriliyor
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-[min(1500px,95vw)] max-h-[90vh] flex flex-col">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Toplu Mesai Ekle</h2>
            <p className="text-xs text-ink-500 mt-0.5">
              {MONTH_NAMES[month]} {year} dönemine eklenecek
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            disabled={isSaving}
            aria-label="Kapat"
          >
            <IconClose />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex-1 space-y-4 overflow-y-auto bg-ink-50/40 p-5 sm:p-6">
            {errors.length > 0 && (
              <div className="alert alert-danger flex-col items-stretch gap-1.5">
                <span className="flex items-center gap-2 font-semibold">
                  <IconAlertTriangle className="h-[18px] w-[18px] shrink-0" />
                  Lütfen aşağıdaki alanları düzeltin
                </span>
                {errors.map((error, index) => (
                  <div key={`${error}-${index}`} className="pl-6 text-[13px]">
                    {error}
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full overflow-hidden rounded-xl border border-ink-200 bg-white text-sm">
                <thead className="bg-ink-50">
                  <tr>
                    <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Kategori</th>
                    <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Çalışan</th>
                    <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Tarih</th>
                    <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Mesai Türü</th>
                    <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Saat</th>
                    <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Açıklama</th>
                    <th className="px-2 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Tutar</th>
                    <th className="px-2 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      // Tür bir bakışta ayrışsın: %50 turuncu, %100 mavi
                      // (sayfadaki özet bölümünün renk kodlamasıyla aynı)
                      className={`border-t border-ink-200/70 ${
                        row.type === 'OVERTIME_50' ? 'bg-accent-50/60' : 'bg-brand-50/60'
                      }`}
                    >
                      <td className="px-2 py-2 whitespace-nowrap min-w-[110px]">
                        <span className="badge badge-neutral">{areaLabelOf(row.employeeId)}</span>
                      </td>
                      <td className="px-2 py-2 min-w-[200px]">
                        <label htmlFor={`bulk_ot_employee_${row.id}`} className="sr-only">Çalışan</label>
                        <EmployeeSearchSelect
                          inputId={`bulk_ot_employee_${row.id}`}
                          options={employeeOptions}
                          value={row.employeeId}
                          onChange={(id) => updateRow(row.id, 'employeeId', id)}
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-2 py-2 min-w-[130px]">
                        <label htmlFor={`bulk_ot_date_${row.id}`} className="sr-only">Tarih</label>
                        <input
                          id={`bulk_ot_date_${row.id}`}
                          type="date"
                          value={row.entryDate}
                          onChange={(e) => updateRow(row.id, 'entryDate', e.target.value)}
                          className="field-cell"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-2 py-2 min-w-[90px]">
                        <label htmlFor={`bulk_ot_type_${row.id}`} className="sr-only">Mesai Türü</label>
                        <select
                          id={`bulk_ot_type_${row.id}`}
                          value={row.type}
                          onChange={(e) => updateRow(row.id, 'type', e.target.value as OvertimeType)}
                          className={`field-cell font-semibold ${
                            row.type === 'OVERTIME_50'
                              ? 'border-accent-300 text-accent-700'
                              : 'border-brand-300 text-brand-700'
                          }`}
                          disabled={isSaving}
                        >
                          <option value="OVERTIME_50">%50</option>
                          <option value="OVERTIME_100">%100</option>
                        </select>
                      </td>
                      <td className="px-2 py-2 min-w-[90px]">
                        <label htmlFor={`bulk_ot_hours_${row.id}`} className="sr-only">Saat</label>
                        <input
                          id={`bulk_ot_hours_${row.id}`}
                          type="number"
                          min="0"
                          step="0.25"
                          value={row.hours}
                          onChange={(e) => updateRow(row.id, 'hours', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-ink-200 rounded text-right bg-white"
                          placeholder="0"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-2 py-2 min-w-[200px]">
                        <label htmlFor={`bulk_ot_desc_${row.id}`} className="sr-only">Açıklama</label>
                        <input
                          id={`bulk_ot_desc_${row.id}`}
                          type="text"
                          maxLength={100}
                          value={row.description}
                          onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                          className="field-cell"
                          placeholder={`Mesai açıklaması (satır ${rowIndex + 1})`}
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap font-medium text-ink-900 min-w-[110px]">
                        {formatCurrency(overtimeAmount(dailyWageOf(row.employeeId), row.type, row.hours))}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap min-w-[150px]">
                        <button
                          type="button"
                          onClick={() => duplicateWithOtherType(row.id)}
                          className="link-action mr-1 text-sm"
                          disabled={isSaving}
                          title="Bu satırı diğer mesai türüyle kopyala (aynı çalışana %50 + %100)"
                        >
                          <IconPlus className="h-4 w-4" />
                          Diğer Tür
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="link-danger text-sm"
                          disabled={isSaving || rows.length === 1}
                        >
                          <IconTrash className="h-4 w-4" />
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={addRow}
                className="btn btn-sm mt-3 border border-dashed border-brand-300 bg-brand-50/60 text-brand-700 hover:bg-brand-100"
                disabled={isSaving}
              >
                <IconPlus className="h-4 w-4" />
                Satır Ekle
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/70 bg-white px-5 py-4 sm:px-6">
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
              Hazır satır: <span className="badge badge-brand">{validRows.length}</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-ink-300" />
              Toplam tutar:{' '}
              <span className="font-display font-bold tabular-nums text-ink-900">
                {formatCurrency(totalAmount)}
              </span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Kaydediliyor...' : 'Mesaileri Kaydet'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OvertimePage() {
  const { showToast } = useToast();
  const { labelOf, orderedCodes } = useCategories();
  const { month: currentMonth, year: currentYear } = getCurrentPeriod();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Silme onayı bekleyen kayıt (window.confirm gömülü tarayıcılarda
  // gösterilmeden false dönebildiği için satır içi onay kullanılıyor)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [listEmployeeFilterId, setListEmployeeFilterId] = useState('');

  const [employeeId, setEmployeeId] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'OVERTIME_50' | 'OVERTIME_100'>('OVERTIME_50');
  const [hours, setHours] = useState(0);
  const [description, setDescription] = useState('');

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

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

  // Mesai kayıtlarını çalışanın kategorisine göre grupla (boş kategoriler atlanır)
  const entriesByArea = useMemo(() => {
    // Kategorisi silinmiş çalışanların kayıtları kaybolmasın diye sona eklenir
    const areasInUse = Array.from(
      new Set(filteredOvertimeEntries.map((e) => e.employee.workArea))
    );
    const areas: WorkArea[] = [
      ...orderedCodes,
      ...areasInUse.filter((code) => !orderedCodes.includes(code)),
    ];

    return areas
      .map((area) => {
        const areaEntries = filteredOvertimeEntries.filter(
          (entry) => entry.employee.workArea === area
        );
        return {
          area,
          entries: areaEntries,
          amount50: areaEntries
            .filter((e) => e.type === 'OVERTIME_50')
            .reduce((acc, e) => acc + e.amount, 0),
          amount100: areaEntries
            .filter((e) => e.type === 'OVERTIME_100')
            .reduce((acc, e) => acc + e.amount, 0),
          total: areaEntries.reduce((acc, e) => acc + e.amount, 0),
        };
      })
      .filter((group) => group.entries.length > 0);
  }, [filteredOvertimeEntries, orderedCodes]);

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

  const handleBulkSave = async (inputs: CreateOvertimeInput[]) => {
    setIsBulkSaving(true);
    try {
      const saved = await createOvertimeBulk(inputs);
      showToast(`${saved.length} mesai kaydı eklendi`, 'success');
      await fetchData();
    } catch (err) {
      const message = isPayrollApiError(err) ? err.message : 'Toplu mesai eklenemedi';
      showToast(message, 'error');
      throw err; // Modal açık kalsın, kullanıcı düzeltebilsin
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleDelete = async (entry: OvertimeEntry) => {
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
      setConfirmingDeleteId(null);
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

      const filename = `mesailer_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
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
      showToast('Excel indirildi', 'success');
    } catch {
      showToast('Excel oluşturulamadı', 'error');
    }
  };

  if (isLoading) {
    return <PanelLoader label="Mesai kayıtları yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div className="flex items-start gap-4">
          <span className="title-icon">
            <IconClock className="h-[22px] w-[22px]" />
          </span>
          <div>
            <h1 className="page-title">
              Mesailer
              <span className="badge badge-neutral">{overtimeEntries.length} kayıt</span>
            </h1>
            <p className="page-desc">
              {MONTH_NAMES[selectedMonth]} {selectedYear} dönemi · %50 ve %100 mesai girişleri
              hakedişe otomatik yansır.
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
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-auto cursor-pointer appearance-none rounded-lg border-0 bg-transparent py-1.5 pl-1 pr-6 text-sm font-semibold text-ink-800 focus:ring-0"
            >
              {Object.entries(MONTH_NAMES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="h-5 w-px bg-ink-200" />
            <select
              aria-label="Yıl seçimi"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-auto cursor-pointer appearance-none rounded-lg border-0 bg-transparent py-1.5 pl-1 pr-6 text-sm font-semibold text-ink-800 focus:ring-0"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            disabled={payrollEntries.length === 0}
            className="btn btn-secondary"
          >
            <IconPlus className="h-[18px] w-[18px]" />
            Toplu Mesai
          </button>
          <button type="button" onClick={handleExportExcel} className="btn btn-success">
            <IconDownload className="h-[18px] w-[18px]" />
            Excel'e İndir
          </button>
        </div>
      </header>

      <div className="card px-5 sm:px-6 py-5">
        <h2 className="card-title mb-5 flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <IconPlus className="h-[18px] w-[18px]" />
          </span>
          Mesai Ekle
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="form-label" htmlFor="ot_date">Tarih</label>
              <input
                id="ot_date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="field field-sm"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="ot_employee">Çalışan</label>
              <select
                id="ot_employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="field field-sm"
              >
                {payrollEntries.map((entry) => (
                  <option key={entry.employeeId} value={entry.employeeId}>
                    {entry.employee.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="ot_type">Mesai Türü</label>
              <select
                id="ot_type"
                value={type}
                onChange={(e) => setType(e.target.value as 'OVERTIME_50' | 'OVERTIME_100')}
                className="field field-sm"
              >
                <option value="OVERTIME_50">%50</option>
                <option value="OVERTIME_100">%100</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="ot_hours">Saat</label>
              <input
                id="ot_hours"
                type="number"
                min="0"
                step="0.25"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                className="field field-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSaving || !selectedEntry}
                className="btn btn-primary w-full"
              >
                {isSaving ? 'Kaydediliyor...' : 'Mesaiyi Kaydet'}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="ot_desc">
              Açıklama (maks. 100 karakter)
            </label>
            <input
              id="ot_desc"
              type="text"
              value={description}
              maxLength={100}
              onChange={(e) => setDescription(e.target.value)}
              className="field field-sm"
              placeholder="Mesai açıklaması"
            />
            <div className="text-xs text-ink-500 mt-1">{description.length}/100</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            <div className="stat-tile">
              <div className="text-ink-600">Maaş</div>
              <div className="font-semibold text-ink-900">{formatCurrency(selectedEntry?.employee.salary || 0)}</div>
            </div>
            <div className="stat-tile">
              <div className="text-ink-600">Toplam Günlük</div>
              <div className="font-semibold text-ink-900">{formatCurrency(selectedEntry?.dailyWage || 0)}</div>
            </div>
            <div className="stat-tile">
              <div className="text-ink-600">Saatlik Ücret</div>
              <div className="font-semibold text-ink-900">{formatCurrency(hourlyWage)}</div>
            </div>
            <div className="stat-tile">
              <div className="text-ink-600">Çarpan</div>
              <div className="font-semibold text-ink-900">{multiplier}</div>
            </div>
            <div className="stat-tile border-brand-200 bg-brand-50">
              <div className="text-brand-700">Mesai Tutarı</div>
              <div className="font-bold text-brand-900">{formatCurrency(amount)}</div>
            </div>
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <IconClock className="h-[18px] w-[18px]" />
            </span>
            Girilen Mesailer
          </h2>
          <div className="w-full md:w-72">
            <label htmlFor="overtime_table_employee_filter" className="form-label">
              Çalışan Filtresi
            </label>
            <select
              id="overtime_table_employee_filter"
              value={listEmployeeFilterId}
              onChange={(e) => setListEmployeeFilterId(e.target.value)}
              className="field field-sm"
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
          <div className="empty-state">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
              <IconInbox className="h-7 w-7" />
            </span>
            <p className="font-display text-base font-semibold text-ink-800">
              Bu dönem için mesai kaydı yok
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Yukarıdaki formdan tek tek, ya da <strong>Toplu Mesai</strong> ile hızlıca giriş
              yapabilirsiniz.
            </p>
          </div>
        ) : (
          <>
            {filteredOvertimeEntries.length === 0 ? (
              <div className="empty-state text-sm text-ink-500">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
                  <IconInbox className="h-6 w-6" />
                </span>
                Seçili filtreye uygun mesai kaydı yok.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-ink-200/60">
                    <thead className="thead">
                      <tr>
                        <th className="th">Çalışan</th>
                        <th className="th">Tarih</th>
                        <th className="th">Tür</th>
                        <th className="th-right">Saat</th>
                        <th className="th-right">Çarpan</th>
                        <th className="th-right">Tutar</th>
                        <th className="th">Açıklama</th>
                        <th className="th-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-200/60">
                      {entriesByArea.map((group) => (
                      <Fragment key={group.area}>
                        <tr className="border-y border-ink-200 bg-gradient-to-r from-brand-50/70 via-ink-50 to-ink-50">
                          <td colSpan={8} className="px-6 py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="h-4 w-1 rounded-full bg-gradient-to-b from-brand-400 to-brand-700" />
                              <span className="text-sm font-semibold text-ink-800">
                                {labelOf(group.area)}
                              </span>
                              <span className="badge bg-white text-ink-600 ring-ink-300">
                                {group.entries.length} kayıt
                              </span>
                              <span className="ml-auto text-xs font-semibold">
                                <span className="text-accent-600">%50: {formatCurrency(group.amount50)}</span>
                                {' · '}
                                <span className="text-brand-600">%100: {formatCurrency(group.amount100)}</span>
                                {' · '}
                                <span className="text-emerald-700">Toplam: {formatCurrency(group.total)}</span>
                              </span>
                            </div>
                          </td>
                        </tr>
                        {group.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-6 py-4 text-sm text-ink-900">{entry.employee.fullName}</td>
                          <td className="px-6 py-4 text-sm text-ink-700">{new Date(entry.entryDate).toLocaleDateString('tr-TR')}</td>
                          <td className="px-6 py-4 text-sm text-ink-700">{entry.type === 'OVERTIME_50' ? '%50' : '%100'}</td>
                          <td className="px-6 py-4 text-sm text-right text-ink-700">{entry.hours}</td>
                          <td className="px-6 py-4 text-sm text-right text-ink-700">{entry.multiplier}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-ink-900">{formatCurrency(entry.amount)}</td>
                          <td className="px-6 py-4 text-sm text-ink-600">{entry.description || '-'}</td>
                          <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                            {confirmingDeleteId === entry.id ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="text-xs text-ink-600">Silinsin mi?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(entry)}
                                  disabled={deletingId === entry.id}
                                  className="link-danger"
                                >
                                  {deletingId === entry.id ? 'Siliniyor...' : 'Evet, Sil'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingDeleteId(null)}
                                  disabled={deletingId === entry.id}
                                  className="link-muted"
                                >
                                  Vazgeç
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingDeleteId(entry.id)}
                                disabled={deletingId !== null}
                                className="link-danger"
                              >
                                <IconTrash className="h-4 w-4" />
                                Sil
                              </button>
                            )}
                          </td>
                        </tr>
                        ))}
                      </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-ink-200/70 bg-ink-50/70 px-5 py-5 sm:px-6">
                  <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-500">
                    <IconTrendUp className="h-4 w-4" />
                    Çalışan Bazlı Toplamlar
                  </h3>
                  <div>
                    {employeeSummaries.map((item, index) => (
                      <div
                        key={item.employeeName}
                        // Geniş ekranda isim ile tutar arası çok açılıyor:
                        // noktalı kılavuz çizgi + zebra + hover ile satır takibi kolaylaşır
                        className={`flex items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                          index % 2 === 1 ? 'bg-white' : ''
                        } hover:bg-brand-50/70`}
                      >
                        <span className="text-ink-700 font-medium whitespace-nowrap">{item.employeeName}</span>
                        <span aria-hidden="true" className="divider-dots" />
                        <span className="font-semibold text-ink-900 whitespace-nowrap">
                          <span className="text-accent-600">%50: {formatCurrency(item.amount50)} ({item.hours50.toFixed(2)}s)</span>
                          {' · '}
                          <span className="text-brand-600">%100: {formatCurrency(item.amount100)} ({item.hours100.toFixed(2)}s)</span>
                          {' · '}
                          <span className="text-emerald-700">Toplam: {formatCurrency(item.totalAmount)} ({item.totalHours.toFixed(2)}s)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2 rounded-xl border border-ink-200/70 bg-white px-3 py-2.5">
                    <span className="font-display font-bold text-ink-900 whitespace-nowrap">Genel Toplam</span>
                    <span aria-hidden="true" className="divider-dots" />
                    <span className="font-bold text-ink-900 whitespace-nowrap">
                      <span className="text-accent-600">%50: {formatCurrency(totals.amount50)} ({totals.hours50.toFixed(2)}s)</span>
                      {' · '}
                      <span className="text-brand-600">%100: {formatCurrency(totals.amount100)} ({totals.hours100.toFixed(2)}s)</span>
                      {' · '}
                      <span className="text-emerald-700">Toplam: {formatCurrency(totals.totalAmount)} ({totals.totalHours.toFixed(2)}s)</span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {isBulkModalOpen && (
        <BulkOvertimeModal
          payrollEntries={payrollEntries}
          month={selectedMonth}
          year={selectedYear}
          isSaving={isBulkSaving}
          onSave={handleBulkSave}
          onClose={() => setIsBulkModalOpen(false)}
        />
      )}
    </div>
  );
}
