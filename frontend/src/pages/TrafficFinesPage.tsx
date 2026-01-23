import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllEmployees, Employee, isApiError } from '../api/employee';
import { addTrafficFinePayment, createTrafficFine, getTrafficFines, sumPayments, TrafficFine } from '../api/trafficFine';
import { useToast } from '../context/ToastContext';

interface CreateFineModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  defaultEmployeeId?: string;
  onSaved: (employeeId?: string) => Promise<void>;
}

function CreateFineModal({ isOpen, onClose, employees, defaultEmployeeId, onSaved }: CreateFineModalProps) {
  const { showToast } = useToast();
  const [employeeId, setEmployeeId] = useState<string>(defaultEmployeeId || '');
  const [fineDate, setFineDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmployeeId(defaultEmployeeId || '');
      setFineDate(new Date().toISOString().split('T')[0]);
      setAmount(0);
      setDescription('');
    }
  }, [isOpen, defaultEmployeeId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!employeeId) {
      showToast('Lütfen çalışan seçin', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('Ceza tutarı pozitif olmalıdır', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await createTrafficFine({
        employeeId,
        fineDate,
        amount,
        description: description.trim() ? description.trim() : null,
      });
      showToast('Trafik cezası eklendi', 'success');
      await onSaved(employeeId);
      onClose();
    } catch (err) {
      const msg = isApiError(err) ? err.message : 'Trafik cezası eklenirken hata oluştu';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Trafik Cezası Ekle</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="tfc_employee" className="block text-sm font-medium text-gray-700 mb-1">Çalışan</label>
            <select
              id="tfc_employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isSaving}
            >
              <option value="">Seçiniz</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tfc_date" className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
              <input
                id="tfc_date"
                type="date"
                value={fineDate}
                onChange={(e) => setFineDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="tfc_amount" className="block text-sm font-medium text-gray-700 mb-1">Ceza Tutarı (₺)</label>
              <input
                id="tfc_amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <label htmlFor="tfc_desc" className="block text-sm font-medium text-gray-700 mb-1">Açıklama (opsiyonel)</label>
            <input
              id="tfc_desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isSaving}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fine: TrafficFine | null;
  onSaved: () => Promise<void>;
}

function PaymentModal({ isOpen, onClose, fine, onSaved }: PaymentModalProps) {
  const { showToast } = useToast();
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setAmount(0);
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fine) return;
    if (amount <= 0) {
      showToast('Ödeme tutarı pozitif olmalıdır', 'error');
      return;
    }
    const paid = sumPayments(fine.payments);
    const remaining = Math.max(0, fine.amount - paid);
    if (remaining <= 0) {
      showToast('Bu ceza zaten tamamen ödenmiş', 'error');
      return;
    }
    if (amount > remaining) {
      showToast('Ödeme tutarı kalandan fazla olamaz', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await addTrafficFinePayment(fine.id, { paymentDate, amount });
      showToast('Ödeme eklendi', 'success');
      await onSaved();
      onClose();
    } catch (err) {
      const msg = isApiError(err) ? err.message : 'Ödeme eklenirken hata oluştu';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !fine) return null;

  const paid = sumPayments(fine.payments);
  const remaining = Math.max(0, fine.amount - paid);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Ödeme Ekle</h2>
          <p className="text-sm text-gray-600 mt-1">
            {fine.employee.fullName} · Kalan: <span className="font-medium">{remaining.toFixed(2)} ₺</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="tfp_date" className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
            <input
              id="tfp_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="tfp_amount" className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺)</label>
            <input
              id="tfp_amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isSaving}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TrafficFinesPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const [fines, setFines] = useState<TrafficFine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payingFine, setPayingFine] = useState<TrafficFine | null>(null);

  useMemo(() => employees.find((e) => e.id === selectedEmployeeId) || null, [employees, selectedEmployeeId]);

  useEffect(() => {
    const preselect = searchParams.get('employeeId');
    if (preselect) setSelectedEmployeeId(preselect);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllEmployees();
        setEmployees(data);
      } catch (err) {
        const msg = isApiError(err) ? err.message : 'Çalışanlar yüklenirken hata oluştu';
        showToast(msg, 'error');
      }
    })();
  }, [showToast]);

  const fetchFines = async (employeeId?: string) => {
    setIsLoading(true);
    try {
      const data = await getTrafficFines(employeeId);
      setFines(data);
    } catch (err) {
      const msg = isApiError(err) ? err.message : 'Trafik cezaları yüklenirken hata oluştu';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If no employee selected, show all fines (still useful)
    fetchFines(selectedEmployeeId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('tr-TR');

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Trafik Cezaları</h1>
            <p className="text-sm text-gray-600 mt-1">
              Her ceza ayrı kayıt olur. Ödeme ekleyerek kalan/ödendi durumunu takip edin.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Trafik Cezası Ekle
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tf_employee" className="block text-sm font-medium text-gray-700 mb-1">Çalışan</label>
              <select
                id="tf_employee"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">(Tümü)</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Kayıtlar
            <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
              {fines.length}
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-600">Yükleniyor...</div>
        ) : fines.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Henüz kayıt yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Çalışan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ceza Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ceza
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ödenen
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kalan
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fines.map((fine) => {
                  const paid = sumPayments(fine.payments);
                  const remaining = Math.max(0, fine.amount - paid);
                  const isPaid = remaining === 0 && fine.amount > 0;
                  return (
                    <tr key={fine.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fine.employee.fullName}
                        {fine.description ? (
                          <div className="text-xs text-gray-500 mt-0.5">{fine.description}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(fine.fineDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                        {formatCurrency(fine.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                        {formatCurrency(paid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPaid ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Ödendi
                            </span>
                          ) : null}
                          <span>{formatCurrency(remaining)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => {
                            setPayingFine(fine);
                            setPaymentModalOpen(true);
                          }}
                          className={`text-indigo-600 hover:text-indigo-900 ${isPaid ? 'opacity-40 pointer-events-none' : ''}`}
                        >
                          Ödeme Ekle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateFineModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        employees={employees}
        defaultEmployeeId={selectedEmployeeId || undefined}
        onSaved={async (createdEmployeeId?: string) => {
          // If user has a filter selected, keep it. Otherwise jump to created employee for visibility.
          const employeeIdToUse = selectedEmployeeId || createdEmployeeId;
          if (employeeIdToUse && !selectedEmployeeId) setSelectedEmployeeId(employeeIdToUse);
          await fetchFines(employeeIdToUse || undefined);
        }}
      />

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPayingFine(null);
        }}
        fine={payingFine}
        onSaved={async () => fetchFines(selectedEmployeeId || undefined)}
      />
    </div>
  );
}

