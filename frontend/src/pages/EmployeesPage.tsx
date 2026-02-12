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
  WORK_AREA_LABELS,
  isApiError,
} from '../api/employee';
import { useToast } from '../context/ToastContext';

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

const defaultBulkGroup = (): BulkGroupFormData => ({
  workArea: 'DEPO',
  rows: [createBulkRow()],
});

function EmployeeModal({ isOpen, onClose, onSave, employee, isLoading }: EmployeeModalProps) {
  const [formData, setFormData] = useState<CreateEmployeeInput>({
    fullName: '',
    workArea: 'DEPO',
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
        workArea: 'DEPO',
        isInsured: false,
        startDate: new Date().toISOString().split('T')[0],
        endDate: null,
        salary: 0,
        workingDays: 30,
      });
    }
    setErrors({});
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
      await onSave(formData);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {employee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="employee_fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Ad Soyad *
            </label>
            <input
              id="employee_fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label htmlFor="employee_workArea" className="block text-sm font-medium text-gray-700 mb-1">
              Çalışma Alanı *
            </label>
            <select
              id="employee_workArea"
              value={formData.workArea}
              onChange={(e) => setFormData({ ...formData, workArea: e.target.value as WorkArea })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              {Object.entries(WORK_AREA_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isInsured"
              checked={formData.isInsured}
              onChange={(e) => setFormData({ ...formData, isInsured: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="isInsured" className="ml-2 text-sm text-gray-700">
              Sigortalı
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="employee_startDate" className="block text-sm font-medium text-gray-700 mb-1">
                İşe Giriş Tarihi *
              </label>
              <input
                id="employee_startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="employee_endDate" className="block text-sm font-medium text-gray-700 mb-1">
                İşten Çıkış Tarihi
              </label>
              <input
                id="employee_endDate"
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="employee_salary" className="block text-sm font-medium text-gray-700 mb-1">
                Maaş (₺) *
              </label>
              <input
                id="employee_salary"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.salary ? 'border-red-500' : 'border-gray-300'
                }`}
                min="0"
                step="0.01"
                disabled={isLoading}
              />
              {errors.salary && (
                <p className="mt-1 text-sm text-red-600">{errors.salary}</p>
              )}
            </div>
            <div>
              <label htmlFor="employee_workingDays" className="block text-sm font-medium text-gray-700 mb-1">
                Çalışma Gün Sayısı
              </label>
              <input
                id="employee_workingDays"
                type="number"
                value={formData.workingDays}
                onChange={(e) => setFormData({ ...formData, workingDays: parseInt(e.target.value) || 30 })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.workingDays ? 'border-red-500' : 'border-gray-300'
                }`}
                min="1"
                max="31"
                disabled={isLoading}
              />
              {errors.workingDays && (
                <p className="mt-1 text-sm text-red-600">{errors.workingDays}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
  const [groups, setGroups] = useState<BulkGroupFormData[]>([defaultBulkGroup()]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setGroups([defaultBulkGroup()]);
    setErrors([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const updateGroupWorkArea = (groupIndex: number, workArea: WorkArea) => {
    setGroups((prev) =>
      prev.map((group, i) => (i === groupIndex ? { ...group, workArea } : group))
    );
  };

  const addGroup = () => setGroups((prev) => [...prev, defaultBulkGroup()]);
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
          fullName: row.fullName.trim(),
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Toplu Çalışan Ekle</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {errors.map((error, index) => (
                  <div key={`${error}-${index}`}>{error}</div>
                ))}
              </div>
            )}

            {groups.map((group, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Kategori {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeGroup(index)}
                    className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
                    disabled={isLoading || groups.length === 1}
                  >
                    Kaldır
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor={`bulk_workarea_${index}`} className="block text-sm font-medium text-gray-700 mb-1">Çalışma Alanı</label>
                    <select
                      id={`bulk_workarea_${index}`}
                      value={group.workArea}
                      onChange={(e) => updateGroupWorkArea(index, e.target.value as WorkArea)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      disabled={isLoading}
                    >
                      {Object.entries(WORK_AREA_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold">Ad Soyad</th>
                        <th className="px-2 py-2 text-left font-semibold">Sigortalı</th>
                        <th className="px-2 py-2 text-left font-semibold">Maaş</th>
                        <th className="px-2 py-2 text-left font-semibold">Çalışma Günü</th>
                        <th className="px-2 py-2 text-left font-semibold">İşe Giriş</th>
                        <th className="px-2 py-2 text-left font-semibold">İşten Çıkış</th>
                        <th className="px-2 py-2 text-right font-semibold">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row, rowIndex) => (
                        <tr key={row.id} className="border-t border-gray-200 bg-white">
                          <td className="px-2 py-2 min-w-[190px]">
                            <label htmlFor={`bulk_fullname_${index}_${row.id}`} className="sr-only">Ad Soyad</label>
                            <input
                              id={`bulk_fullname_${index}_${row.id}`}
                              type="text"
                              value={row.fullName}
                              onChange={(e) => updateRow(index, row.id, 'fullName', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
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
                              className="w-full px-2 py-1 border border-gray-300 rounded"
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
                              className="w-full px-2 py-1 border border-gray-300 rounded"
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
                              className="w-full px-2 py-1 border border-gray-300 rounded"
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
                              className="w-full px-2 py-1 border border-gray-300 rounded"
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
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                              disabled={isLoading}
                            />
                          </td>
                          <td className="px-2 py-2 text-right min-w-[80px]">
                            <button
                              type="button"
                              onClick={() => removeRow(index, row.id)}
                              className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
                              disabled={isLoading || group.rows.length === 1}
                            >
                              Satır Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    type="button"
                    onClick={() => addRow(index)}
                    className="mt-3 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
                    disabled={isLoading}
                  >
                    + Satır Ekle
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addGroup}
              className="px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100"
              disabled={isLoading}
            >
              + Kategori Ekle
            </button>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
            <p className="text-sm text-gray-600">
              Toplam hazırlanmış çalışan: <span className="font-semibold">{totalEmployeeCount}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={isLoading}
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
            Çalışanı Sil
          </h3>
          <p className="text-sm text-gray-500 text-center mb-6">
            <strong>{employeeName}</strong> adlı çalışanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
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
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{employee.fullName}</h3>
          <p className="text-sm text-gray-500">{WORK_AREA_LABELS[employee.workArea]}</p>
        </div>
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            employee.isInsured
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {employee.isInsured ? 'Sigortalı' : 'Sigortasız'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-500">Maaş:</span>
          <span className="ml-1 font-medium text-gray-900">{formatCurrency(employee.salary)}</span>
        </div>
        <div>
          <span className="text-gray-500">Çalışma Günü:</span>
          <span className="ml-1 font-medium text-gray-900">{employee.workingDays}</span>
        </div>
        <div>
          <span className="text-gray-500">İşe Giriş:</span>
          <span className="ml-1 text-gray-900">{formatDate(employee.startDate)}</span>
        </div>
        <div>
          <span className="text-gray-500">İşten Çıkış:</span>
          <span className="ml-1 text-gray-900">{employee.endDate ? formatDate(employee.endDate) : '-'}</span>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => onEdit(employee)}
          className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
        >
          Düzenle
        </button>
        <button
          onClick={() => onDelete(employee)}
          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
        >
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

  const grouped: Record<WorkArea, Employee[]> = {
    DEPO: [],
    URETIM: [],
    OFIS: [],
    SAHA_ELEMANI: [],
    KAYSERI_YATAS: [],
    ANKARA_YATAS: [],
    ISTANBUL_YATAS: [],
    DIGER: [],
  };
  employees.forEach((e) => grouped[e.workArea].push(e));
  const workAreas: WorkArea[] = ['DEPO', 'URETIM', 'OFIS', 'SAHA_ELEMANI', 'KAYSERI_YATAS', 'ANKARA_YATAS', 'ISTANBUL_YATAS', 'DIGER'];

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            Çalışanlar
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
              {employees.length} çalışan
            </span>
          </h1>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => navigate('/trafik-cezalari')}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              Trafik Cezası Ekle
            </button>
            <button
              onClick={handleAddClick}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              + Yeni Çalışan
            </button>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              + Toplu Ekle
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 my-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {employees.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center text-gray-500">
          Henüz çalışan bulunmuyor. Yeni çalışan eklemek için yukarıdaki butonu kullanın.
        </div>
      ) : (
        workAreas.map((area) => {
          const areaEmployees = grouped[area];
          if (areaEmployees.length === 0) return null;

          // Keep stable / readable ordering within a group
          const sorted = [...areaEmployees].sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr-TR'));

          return (
            <div key={area} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 via-white to-slate-50 border-b border-slate-200 flex items-center gap-3">
                <div className="h-6 w-1.5 rounded-full bg-indigo-600" />
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {WORK_AREA_LABELS[area]}
                  <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ad Soyad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Çalışma Alanı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sigorta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşe Giriş
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşten Çıkış
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Maaş
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Çalışma Günü
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sorted.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.fullName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {WORK_AREA_LABELS[employee.workArea]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              employee.isInsured
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {employee.isInsured ? 'Sigortalı' : 'Sigortasız'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(employee.startDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.endDate ? formatDate(employee.endDate) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(employee.salary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.workingDays}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditClick(employee)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteClick(employee)}
                            className="text-red-600 hover:text-red-900"
                          >
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
        })
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
