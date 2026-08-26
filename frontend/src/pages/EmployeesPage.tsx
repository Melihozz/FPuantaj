import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  WorkArea,
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  isApiError,
} from '../api/employee';
import { Category } from '../api/category';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../context/ToastContext';
import { PanelLoader } from '../components/Loaders';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconClose,
  IconInbox,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUsers,
} from '../components/Icons';

/**
 * Çalışan adını büyük harfe çevirir.
 * Türkçe kurallarına göre: i -> İ, ı -> I (düz toUpperCase "i"yi "I" yapardı).
 */
const toUpperTr = (text: string) => text.toLocaleUpperCase('tr-TR');

// Modal component for add/edit employee
interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateEmployeeInput | UpdateEmployeeInput) => Promise<void>;
  employee?: Employee | null;
  isLoading: boolean;
}

interface BulkGroupFormData {
  workArea: WorkArea;
  rows: BulkEmployeeRow[];
}

interface BulkEmployeeRow {
  id: string;
  fullName: string;
  isInsured: boolean;
  startDate: string;
  endDate: string;
  salary: number;
  workingDays: number;
}

interface BulkEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employees: CreateEmployeeInput[]) => Promise<void>;
  isLoading: boolean;
}

const createBulkRow = (): BulkEmployeeRow => ({
  id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  fullName: '',
  isInsured: false,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  salary: 0,
  workingDays: 30,
});

const defaultBulkGroup = (defaultWorkArea: string): BulkGroupFormData => ({
  workArea: defaultWorkArea,
  rows: [createBulkRow()],
});

/** Kategori seçim listesi - tanımlı kategori yoksa uyarı gösterir */
function CategorySelect({
  id,
  value,
  onChange,
  disabled,
  categories,
  className,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  categories: Category[];
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled || categories.length === 0}
    >
      {categories.length === 0 && <option value="">Kategori tanımlı değil</option>}
      {/* Silinmiş bir kategoriye ait çalışan düzenlenirse kod kaybolmasın */}
      {value && !categories.some((c) => c.code === value) && (
        <option value={value}>{value} (tanımsız)</option>
      )}
      {categories.map((category) => (
        <option key={category.id} value={category.code}>
          {category.label}
        </option>
      ))}
    </select>
  );
}

function EmployeeModal({ isOpen, onClose, onSave, employee, isLoading }: EmployeeModalProps) {
  const { categories } = useCategories();
  const defaultWorkArea = categories[0]?.code ?? '';

  const [formData, setFormData] = useState<CreateEmployeeInput>({
    fullName: '',
    workArea: defaultWorkArea,
    isInsured: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: null,
    salary: 0,
    workingDays: 30,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employee) {
      setFormData({
        fullName: employee.fullName,
        workArea: employee.workArea,
        isInsured: employee.isInsured,
        startDate: employee.startDate.split('T')[0],
        endDate: employee.endDate ? employee.endDate.split('T')[0] : null,
        salary: employee.salary,
        workingDays: employee.workingDays,
      });
    } else {
      setFormData({
        fullName: '',
        workArea: defaultWorkArea,
        isInsured: false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: null,
        salary: 0,
        workingDays: 30,
      });
    }
    setErrors({});
    // defaultWorkArea kategoriler yüklendikçe değişir; bilerek bağımlılığa
    // eklenmedi, aksi halde form açıkken seçim sıfırlanırdı
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Ad soyad zorunludur';
    }
    if (formData.salary <= 0) {
      newErrors.salary = 'Maaş pozitif bir sayı olmalıdır';
    }
    if (formData.workingDays && (formData.workingDays < 1 || formData.workingDays > 31)) {
      newErrors.workingDays = 'Çalışma gün sayısı 1-31 arasında olmalıdır';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Kaydederken de büyük harfe zorla (yapıştırma/otomatik doldurma güvencesi)
      await onSave({ ...formData, fullName: toUpperTr(formData.fullName.trim()) });
      onClose();
    } catch (error) {
      if (isApiError(error) && error.details) {
        const apiErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.details)) {
          apiErrors[field] = messages[0];
        }
        setErrors(apiErrors);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-md">
        <div className="modal-header">
          <h2 className="modal-title">
            {employee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="employee_fullName" className="form-label">
              Ad Soyad *
            </label>
            <input
              id="employee_fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: toUpperTr(e.target.value) })}
              className={`field ${errors.fullName ? 'field-invalid' : ''}`}
              disabled={isLoading}
            />
            {errors.fullName && (
              <p className="form-error">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label htmlFor="employee_workArea" className="form-label">
              Çalışma Alanı *
            </label>
            <CategorySelect
              id="employee_workArea"
              value={formData.workArea}
              onChange={(code) => setFormData({ ...formData, workArea: code })}
              categories={categories}
              disabled={isLoading}
              className="field"
            />
            {categories.length === 0 && (
              <p className="mt-1 text-sm text-amber-700">
                Önce Tanımlamalar &gt; Kategoriler sayfasından kategori eklemelisin.
              </p>
            )}
          </div>

          <label
            htmlFor="isInsured"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-200 bg-ink-50/60 px-3.5 py-3 transition-colors hover:border-ink-300 hover:bg-ink-50"
          >
            <input
              type="checkbox"
              id="isInsured"
              checked={formData.isInsured}
              onChange={(e) => setFormData({ ...formData, isInsured: e.target.checked })}
              className="h-[18px] w-[18px] cursor-pointer rounded border-ink-300"
              disabled={isLoading}
            />
            <span className="text-sm font-semibold text-ink-700">Sigortalı</span>
            <span className="ml-auto text-xs text-ink-400">SGK kapsamında çalışıyor</span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="employee_startDate" className="form-label">
                İşe Giriş Tarihi *
              </label>
              <input
                id="employee_startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="field"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="employee_endDate" className="form-label">
                İşten Çıkış Tarihi
              </label>
              <input
                id="employee_endDate"
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })}
                className="field"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="employee_salary" className="form-label">
                Maaş (₺) *
              </label>
              <input
                id="employee_salary"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                className={`field ${errors.salary ? 'field-invalid' : ''}`}
                min="0"
                step="0.01"
                disabled={isLoading}
              />
              {errors.salary && (
                <p className="form-error">{errors.salary}</p>
              )}
            </div>
            <div>
              <label htmlFor="employee_workingDays" className="form-label">
                Çalışma Gün Sayısı
              </label>
              <input
                id="employee_workingDays"
                type="number"
                value={formData.workingDays}
                onChange={(e) => setFormData({ ...formData, workingDays: parseInt(e.target.value) || 30 })}
                className={`field ${errors.workingDays ? 'field-invalid' : ''}`}
                min="1"
                max="31"
                disabled={isLoading}
              />
              {errors.workingDays && (
                <p className="form-error">{errors.workingDays}</p>
              )}
            </div>
          </div>

          <div className="-mx-6 -mb-6 mt-6 flex flex-wrap justify-end gap-3 border-t border-ink-200/70 bg-ink-50/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkEmployeeModal({ isOpen, onClose, onSave, isLoading }: BulkEmployeeModalProps) {
  const { categories } = useCategories();
  const defaultWorkArea = categories[0]?.code ?? '';

  const [groups, setGroups] = useState<BulkGroupFormData[]>([defaultBulkGroup(defaultWorkArea)]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setGroups([defaultBulkGroup(defaultWorkArea)]);
    setErrors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const updateGroupWorkArea = (groupIndex: number, workArea: WorkArea) => {
    setGroups((prev) =>
      prev.map((group, i) => (i === groupIndex ? { ...group, workArea } : group))
    );
  };

  const addGroup = () => setGroups((prev) => [...prev, defaultBulkGroup(defaultWorkArea)]);
  const removeGroup = (index: number) =>
    setGroups((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const addRow = (groupIndex: number) => {
    setGroups((prev) =>
      prev.map((group, i) =>
        i === groupIndex ? { ...group, rows: [...group.rows, createBulkRow()] } : group
      )
    );
  };

  const removeRow = (groupIndex: number, rowId: string) => {
    setGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        if (group.rows.length <= 1) return group;
        return { ...group, rows: group.rows.filter((row) => row.id !== rowId) };
      })
    );
  };

  const updateRow = <K extends keyof BulkEmployeeRow>(
    groupIndex: number,
    rowId: string,
    key: K,
    value: BulkEmployeeRow[K]
  ) => {
    setGroups((prev) =>
      prev.map((group, i) => {
        if (i !== groupIndex) return group;
        return {
          ...group,
          rows: group.rows.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
        };
      })
    );
  };

  const totalEmployeeCount = groups.reduce(
    (acc, group) => acc + group.rows.filter((row) => row.fullName.trim()).length,
    0
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors: string[] = [];
    const payload: CreateEmployeeInput[] = [];

    groups.forEach((group, idx) => {
      const validRows = group.rows.filter((row) => row.fullName.trim().length > 0);
      if (validRows.length === 0) {
        validationErrors.push(`${idx + 1}. kategori: en az bir çalışan adı girin.`);
      }
      validRows.forEach((row, rowIndex) => {
        if (row.salary <= 0) {
          validationErrors.push(`${idx + 1}. kategori / satır ${rowIndex + 1}: maaş pozitif olmalıdır.`);
        }
        if (row.workingDays < 1 || row.workingDays > 31) {
          validationErrors.push(`${idx + 1}. kategori / satır ${rowIndex + 1}: çalışma gün sayısı 1-31 arasında olmalıdır.`);
        }
        if (!row.startDate) {
          validationErrors.push(`${idx + 1}. kategori / satır ${rowIndex + 1}: işe giriş tarihi zorunludur.`);
        }

        payload.push({
          fullName: toUpperTr(row.fullName.trim()),
          workArea: group.workArea,
          isInsured: row.isInsured,
          startDate: row.startDate,
          endDate: row.endDate || null,
          salary: row.salary,
          workingDays: row.workingDays,
        });
      });
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    try {
      await onSave(payload);
      onClose();
    } catch {
      // Error toast is handled in parent
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-4xl max-h-[90vh] flex flex-col">
        <div className="modal-header">
          <h2 className="modal-title">Toplu Çalışan Ekle</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Kapat"
            disabled={isLoading}
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

            {groups.map((group, index) => (
              <div key={index} className="card space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink-800">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand-100 text-[11px] font-bold text-brand-700">
                      {index + 1}
                    </span>
                    Kategori
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeGroup(index)}
                    className="link-danger text-sm"
                    disabled={isLoading || groups.length === 1}
                  >
                    <IconTrash className="h-4 w-4" />
                    Kaldır
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={`bulk_workarea_${index}`} className="form-label">Çalışma Alanı</label>
                    <CategorySelect
                      id={`bulk_workarea_${index}`}
                      value={group.workArea}
                      onChange={(code) => updateGroupWorkArea(index, code)}
                      categories={categories}
                      disabled={isLoading}
                      className="field field-sm"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full overflow-hidden rounded-xl border border-ink-200 text-sm">
                    <thead className="bg-ink-50">
                      <tr>
                        <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Ad Soyad</th>
                        <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Sigortalı</th>
                        <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Maaş</th>
                        <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">Çalışma Günü</th>
                        <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">İşe Giriş</th>
                        <th className="px-2 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">İşten Çıkış</th>
                        <th className="px-2 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-ink-500">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row, rowIndex) => (
                        <tr key={row.id} className="border-t border-ink-200/70 bg-white">
                          <td className="px-2 py-2 min-w-[190px]">
                            <label htmlFor={`bulk_fullname_${index}_${row.id}`} className="sr-only">Ad Soyad</label>
                            <input
                              id={`bulk_fullname_${index}_${row.id}`}
                              type="text"
                              value={row.fullName}
                              onChange={(e) => updateRow(index, row.id, 'fullName', toUpperTr(e.target.value))}
                              className="field-cell"
                              placeholder={`Çalışan ${rowIndex + 1}`}
                              disabled={isLoading}
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[110px]">
                            <label htmlFor={`bulk_isinsured_${index}_${row.id}`} className="sr-only">Sigortalı</label>
                            <select
                              id={`bulk_isinsured_${index}_${row.id}`}
                              value={row.isInsured ? 'yes' : 'no'}
                              onChange={(e) => updateRow(index, row.id, 'isInsured', e.target.value === 'yes')}
                              className="field-cell"
                              disabled={isLoading}
                            >
                              <option value="yes">Evet</option>
                              <option value="no">Hayır</option>
                            </select>
                          </td>
                          <td className="px-2 py-2 min-w-[120px]">
                            <label htmlFor={`bulk_salary_${index}_${row.id}`} className="sr-only">Maaş</label>
                            <input
                              id={`bulk_salary_${index}_${row.id}`}
                              type="number"
                              value={row.salary}
                              onChange={(e) => updateRow(index, row.id, 'salary', parseFloat(e.target.value) || 0)}
                              className="field-cell"
                              min="0"
                              step="0.01"
                              disabled={isLoading}
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[110px]">
                            <label htmlFor={`bulk_workingdays_${index}_${row.id}`} className="sr-only">Çalışma Günü</label>
                            <input
                              id={`bulk_workingdays_${index}_${row.id}`}
                              type="number"
                              value={row.workingDays}
                              onChange={(e) => updateRow(index, row.id, 'workingDays', parseInt(e.target.value) || 30)}
                              className="field-cell"
                              min="1"
                              max="31"
                              disabled={isLoading}
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[130px]">
                            <label htmlFor={`bulk_startdate_${index}_${row.id}`} className="sr-only">İşe Giriş</label>
                            <input
                              id={`bulk_startdate_${index}_${row.id}`}
                              type="date"
                              value={row.startDate}
                              onChange={(e) => updateRow(index, row.id, 'startDate', e.target.value)}
                              className="field-cell"
                              disabled={isLoading}
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[130px]">
                            <label htmlFor={`bulk_enddate_${index}_${row.id}`} className="sr-only">İşten Çıkış</label>
                            <input
                              id={`bulk_enddate_${index}_${row.id}`}
                              type="date"
                              value={row.endDate}
                              onChange={(e) => updateRow(index, row.id, 'endDate', e.target.value)}
                              className="field-cell"
                              disabled={isLoading}
                            />
                          </td>
                          <td className="px-2 py-2 text-right min-w-[80px]">
                            <button
                              type="button"
                              onClick={() => removeRow(index, row.id)}
                              className="link-danger text-sm"
                              disabled={isLoading || group.rows.length === 1}
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
                    onClick={() => addRow(index)}
                    className="btn btn-sm mt-3 border border-dashed border-brand-300 bg-brand-50/60 text-brand-700 hover:bg-brand-100"
                    disabled={isLoading}
                  >
                    <IconPlus className="h-4 w-4" />
                    Satır Ekle
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addGroup}
              className="btn btn-sm w-full border border-dashed border-brand-300 bg-brand-50/60 text-brand-700 hover:bg-brand-100"
              disabled={isLoading}
            >
              <IconPlus className="h-4 w-4" />
              Kategori Ekle
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/70 bg-white px-5 py-4 sm:px-6">
            <p className="text-sm text-ink-500">
              Toplam hazırlanmış çalışan:{' '}
              <span className="badge badge-brand ml-1">{totalEmployeeCount}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Kaydediliyor...' : 'Toplam Listeyi Kaydet'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


// Delete confirmation modal
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  employeeName: string;
  isLoading: boolean;
}

function DeleteModal({ isOpen, onClose, onConfirm, employeeName, isLoading }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-sm">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <IconTrash className="h-7 w-7" />
          </div>
          <h3 className="modal-title text-center">Çalışanı Sil</h3>
          <p className="mt-2 text-center text-sm leading-relaxed text-ink-500">
            <strong>{employeeName}</strong> adlı çalışanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={isLoading}
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className="btn btn-danger flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Siliniyor...' : 'Sil'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// Employee card component for mobile view
interface EmployeeCardProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  formatDate: (dateString: string) => string;
  formatCurrency: (amount: number) => string;
}

function EmployeeCard({ employee, onEdit, onDelete, formatDate, formatCurrency }: EmployeeCardProps) {
  const { labelOf } = useCategories();

  return (
    <div className="card card-hover p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold tracking-tight text-ink-900">
            {employee.fullName}
          </h3>
          <p className="mt-0.5 text-sm text-ink-500">{labelOf(employee.workArea)}</p>
        </div>
        <span
          className={`badge ${employee.isInsured ? 'badge-success' : 'badge-neutral'}`}
        >
          {employee.isInsured ? 'Sigortalı' : 'Sigortasız'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-ink-500">Maaş:</span>
          <span className="ml-1 font-medium text-ink-900">{formatCurrency(employee.salary)}</span>
        </div>
        <div>
          <span className="text-ink-500">Çalışma Günü:</span>
          <span className="ml-1 font-medium text-ink-900">{employee.workingDays}</span>
        </div>
        <div>
          <span className="text-ink-500">İşe Giriş:</span>
          <span className="ml-1 text-ink-900">{formatDate(employee.startDate)}</span>
        </div>
        <div>
          <span className="text-ink-500">İşten Çıkış:</span>
          <span className="ml-1 text-ink-900">{employee.endDate ? formatDate(employee.endDate) : '-'}</span>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 border-t border-ink-200/70 pt-3">
        <button onClick={() => onEdit(employee)} className="link-action">
          <IconPencil className="h-4 w-4" />
          Düzenle
        </button>
        <button onClick={() => onDelete(employee)} className="link-danger">
          <IconTrash className="h-4 w-4" />
          Sil
        </button>
      </div>
    </div>
  );
}


// Main EmployeesPage component
export default function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { labelOf, orderedCodes, refresh: refreshCategories } = useCategories();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  
  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // "Aktif Olmayan Çalışanlar" paneli (varsayılan kapalı)
  const [isInactiveOpen, setIsInactiveOpen] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllEmployees();
      setEmployees(data);
      // Kategorilerdeki çalışan sayıları değişmiş olabilir
      refreshCategories();
    } catch (err) {
      const message = isApiError(err) ? err.message : 'Çalışanlar yüklenirken bir hata oluştu';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (employee: Employee) => {
    setDeletingEmployee(employee);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async (data: CreateEmployeeInput | UpdateEmployeeInput) => {
    setIsSaving(true);
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, data);
        showToast('Çalışan başarıyla güncellendi', 'success');
      } else {
        await createEmployee(data as CreateEmployeeInput);
        showToast('Çalışan başarıyla eklendi', 'success');
      }
      await fetchEmployees();
    } catch (err) {
      const message = isApiError(err) ? err.message : 'İşlem sırasında bir hata oluştu';
      showToast(message, 'error');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkSave = async (bulkEmployees: CreateEmployeeInput[]) => {
    setIsBulkSaving(true);
    let createdCount = 0;
    try {
      for (const employee of bulkEmployees) {
        await createEmployee(employee);
        createdCount += 1;
      }
      showToast(`${createdCount} çalışan başarıyla eklendi`, 'success');
      await fetchEmployees();
    } catch (err) {
      const message = isApiError(err) ? err.message : 'Toplu ekleme sırasında bir hata oluştu';
      if (createdCount > 0) {
        showToast(`${createdCount} çalışan eklendi, kalanlar eklenemedi: ${message}`, 'error');
      } else {
        showToast(message, 'error');
      }
      throw err;
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;
    
    setIsDeleting(true);
    try {
      await deleteEmployee(deletingEmployee.id);
      setIsDeleteModalOpen(false);
      setDeletingEmployee(null);
      showToast('Çalışan başarıyla silindi', 'success');
      await fetchEmployees();
    } catch (err) {
      const message = isApiError(err) ? err.message : 'Çalışan silinirken bir hata oluştu';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  // İşten çıkış tarihi verilen çalışan artık aktif değildir:
  // ana gruplarda değil, "Aktif Olmayan Çalışanlar" panelinde listelenir
  const activeEmployees = employees.filter((e) => !e.endDate);
  const inactiveEmployees = [...employees]
    .filter((e) => !!e.endDate)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr-TR'));

  // Gruplar tanımlı kategorilerden gelir; kategorisi silinmiş çalışanlar
  // (workArea kodu artık listede yoksa) kaybolmasın diye sona eklenir
  const grouped: Record<string, Employee[]> = {};
  activeEmployees.forEach((e) => {
    if (!grouped[e.workArea]) grouped[e.workArea] = [];
    grouped[e.workArea].push(e);
  });
  const orphanAreas = Object.keys(grouped).filter((code) => !orderedCodes.includes(code));
  const workAreas: WorkArea[] = [...orderedCodes, ...orphanAreas];

  if (isLoading) {
    return <PanelLoader label="Çalışan listesi yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div className="flex items-start gap-4">
          <span className="title-icon">
            <IconUsers className="h-[22px] w-[22px]" />
          </span>
          <div>
            <h1 className="page-title">
              Çalışanlar
              <span className="badge badge-neutral">{activeEmployees.length} aktif</span>
              {inactiveEmployees.length > 0 && (
                <span className="badge badge-warning">{inactiveEmployees.length} pasif</span>
              )}
            </h1>
            <p className="page-desc">
              Kadro kayıtları, maaş ve sigorta bilgileri. Kategoriler bölüm sırasını belirler.
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:auto-cols-max sm:grid-flow-col lg:w-auto">
          <button onClick={() => navigate('/trafik-cezalari')} className="btn btn-secondary">
            <IconAlertTriangle className="h-[18px] w-[18px]" />
            Trafik Cezası
          </button>
          <button onClick={() => setIsBulkModalOpen(true)} className="btn btn-secondary">
            <IconPlus className="h-[18px] w-[18px]" />
            Toplu Ekle
          </button>
          <button onClick={handleAddClick} className="btn btn-primary">
            <IconPlus className="h-[18px] w-[18px]" />
            Yeni Çalışan
          </button>
        </div>
      </header>

      {error && (
        <div className="alert alert-danger">
          <IconAlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          <span className="flex-1 font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="btn-icon h-7 w-7 shrink-0 text-rose-500 hover:bg-rose-100 hover:text-rose-700"
            aria-label="Hatayı kapat"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
      )}

      {employees.length === 0 ? (
        <div className="card empty-state">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
            <IconInbox className="h-7 w-7" />
          </span>
          <p className="font-display text-base font-semibold text-ink-800">
            Henüz çalışan bulunmuyor
          </p>
          <p className="max-w-sm text-sm text-ink-500">
            İlk kaydı oluşturmak için yukarıdaki <strong>Yeni Çalışan</strong> butonunu kullanın.
          </p>
        </div>
      ) : (
        <>
        {activeEmployees.length === 0 && (
          <div className="card empty-state text-sm text-ink-500">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
              <IconInbox className="h-6 w-6" />
            </span>
            Aktif çalışan bulunmuyor. Tüm çalışanlar işten çıkış almış durumda.
          </div>
        )}
        {workAreas.map((area) => {
          const areaEmployees = grouped[area] ?? [];
          if (areaEmployees.length === 0) return null;

          // Keep stable / readable ordering within a group
          const sorted = [...areaEmployees].sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr-TR'));

          return (
            <div key={area} className="card overflow-hidden">
              <div className="section-head">
                <div className="section-bar" />
                <h2 className="section-title">
                  {labelOf(area)}
                  <span className="badge badge-neutral ml-2">
                    {sorted.length} kişi
                  </span>
                </h2>
              </div>

              {/* Mobile card view */}
              <div className="block md:hidden p-4 space-y-4">
                {sorted.map((employee) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-ink-200/60">
                  <thead className="thead">
                    <tr>
                      <th className="th">
                        Ad Soyad
                      </th>
                      <th className="th">
                        Çalışma Alanı
                      </th>
                      <th className="th">
                        Sigorta
                      </th>
                      <th className="th">
                        İşe Giriş
                      </th>
                      <th className="th">
                        İşten Çıkış
                      </th>
                      <th className="th">
                        Maaş
                      </th>
                      <th className="th">
                        Çalışma Günü
                      </th>
                      <th className="th-right">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-200/60">
                    {sorted.map((employee) => (
                      <tr key={employee.id} className="hover:bg-ink-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink-900">
                          {employee.fullName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                          {labelOf(employee.workArea)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                          <span
                            className={`badge ${employee.isInsured ? 'badge-success' : 'badge-neutral'}`}
                          >
                            {employee.isInsured ? 'Sigortalı' : 'Sigortasız'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                          {formatDate(employee.startDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                          {employee.endDate ? formatDate(employee.endDate) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                          {formatCurrency(employee.salary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                          {employee.workingDays}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditClick(employee)}
                            className="link-action mr-1"
                          >
                            <IconPencil className="h-4 w-4" />
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteClick(employee)}
                            className="link-danger"
                          >
                            <IconTrash className="h-4 w-4" />
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Aktif olmayan (işten çıkış almış) çalışanlar - açılır/kapanır panel */}
        {inactiveEmployees.length > 0 && (
          <div className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setIsInactiveOpen((open) => !open)}
              aria-expanded={isInactiveOpen}
              className={`w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-ink-50/70 ${
                isInactiveOpen ? 'border-b border-ink-200/70' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="section-bar from-ink-300 to-ink-500" />
                <h2 className="section-title text-ink-600">
                  Aktif Olmayan Çalışanlar
                  <span className="badge badge-warning">{inactiveEmployees.length} kişi</span>
                </h2>
              </div>
              <IconChevronDown
                className={`h-5 w-5 shrink-0 text-ink-400 transition-transform duration-200 ${
                  isInactiveOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isInactiveOpen && (
              <>
                {/* Mobile card view */}
                <div className="block md:hidden p-4 space-y-4 opacity-80">
                  {inactiveEmployees.map((employee) => (
                    <EmployeeCard
                      key={employee.id}
                      employee={employee}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      formatDate={formatDate}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-ink-200/60">
                    <thead className="thead">
                      <tr>
                        <th className="th">Ad Soyad</th>
                        <th className="th">Çalışma Alanı</th>
                        <th className="th">Sigorta</th>
                        <th className="th">İşe Giriş</th>
                        <th className="th">İşten Çıkış</th>
                        <th className="th">Maaş</th>
                        <th className="th">Çalışma Günü</th>
                        <th className="th-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-200/60">
                      {inactiveEmployees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-ink-50 bg-ink-50/60">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink-600">
                            {employee.fullName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                            {labelOf(employee.workArea)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                            <span
                              className={`badge ${employee.isInsured ? 'badge-success' : 'badge-neutral'}`}
                            >
                              {employee.isInsured ? 'Sigortalı' : 'Sigortasız'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                            {formatDate(employee.startDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-rose-600">
                            {employee.endDate ? formatDate(employee.endDate) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                            {formatCurrency(employee.salary)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-500">
                            {employee.workingDays}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditClick(employee)}
                              className="link-action mr-1"
                            >
                              <IconPencil className="h-4 w-4" />
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteClick(employee)}
                              className="link-danger"
                            >
                              <IconTrash className="h-4 w-4" />
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card-footer">
                  Bu çalışanlar işten çıkış tarihinden sonraki dönemlerin puantaj tablosunda görünmez.
                  Tekrar aktifleştirmek için "Düzenle" ile işten çıkış tarihini silebilirsin.
                </div>
              </>
            )}
          </div>
        )}
        </>
      )}

      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        employee={editingEmployee}
        isLoading={isSaving}
      />

      <BulkEmployeeModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSave={handleBulkSave}
        isLoading={isBulkSaving}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingEmployee(null);
        }}
        onConfirm={handleDelete}
        employeeName={deletingEmployee?.fullName || ''}
        isLoading={isDeleting}
      />
    </div>
  );
}
