import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllEmployees, Employee, isApiError } from '../api/employee';
import { addTrafficFinePayment, createTrafficFine, deleteTrafficFine, getTrafficFines, sumPayments, TrafficFine } from '../api/trafficFine';
import { useToast } from '../context/ToastContext';
import {
  IconAlertTriangle,
  IconInbox,
  IconPlus,
  IconTrash,
  IconWallet,
} from '../components/Icons';

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
    <div className="modal-backdrop">
      <div className="modal-panel max-w-md">
        <div className="modal-header">
          <h2 className="modal-title">Trafik Cezası Ekle</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="tfc_employee" className="form-label">Çalışan</label>
            <select
              id="tfc_employee"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="field"
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
              <label htmlFor="tfc_date" className="form-label">Tarih</label>
              <input
                id="tfc_date"
                type="date"
                value={fineDate}
                onChange={(e) => setFineDate(e.target.value)}
                className="field"
                disabled={isSaving}
              />
            </div>
            <div>
              <label htmlFor="tfc_amount" className="form-label">Ceza Tutarı (₺)</label>
              <input
                id="tfc_amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="field"
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <label htmlFor="tfc_desc" className="form-label">Açıklama (opsiyonel)</label>
            <input
              id="tfc_desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="field"
              disabled={isSaving}
            />
          </div>

          <div className="-mx-6 -mb-6 mt-6 flex flex-wrap justify-end gap-3 border-t border-ink-200/70 bg-ink-50/60 px-6 py-4">
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
    <div className="modal-backdrop">
      <div className="modal-panel max-w-md">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Ödeme Ekle</h2>
            <p className="mt-1 text-sm text-ink-500">
              {fine.employee.fullName} · Kalan:{' '}
              <span className="font-semibold text-ink-800">{remaining.toFixed(2)} ₺</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="tfp_date" className="form-label">Tarih</label>
            <input
              id="tfp_date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="field"
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="tfp_amount" className="form-label">Tutar (₺)</label>
            <input
              id="tfp_amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="field"
              disabled={isSaving}
            />
          </div>

          <div className="-mx-6 -mb-6 mt-6 flex flex-wrap justify-end gap-3 border-t border-ink-200/70 bg-ink-50/60 px-6 py-4">
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

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingFine, setDeletingFine] = useState<TrafficFine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteFine = async () => {
    if (!deletingFine) return;
    setIsDeleting(true);
    try {
      await deleteTrafficFine(deletingFine.id);
      showToast('Trafik cezası silindi', 'success');
      setDeleteModalOpen(false);
      setDeletingFine(null);
      await fetchFines(selectedEmployeeId || undefined);
    } catch (err) {
      const msg = isApiError(err) ? err.message : 'Trafik cezası silinirken hata oluştu';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalsByEmployee = useMemo(() => {
    const totals = new Map<string, { name: string; totalRemaining: number }>();
    fines.forEach((fine) => {
      const paid = sumPayments(fine.payments);
      const remaining = Math.max(0, fine.amount - paid);
      const current = totals.get(fine.employeeId);
      if (current) {
        current.totalRemaining += remaining;
      } else {
        totals.set(fine.employeeId, {
          name: fine.employee.fullName,
          totalRemaining: remaining,
        });
      }
    });
    return Array.from(totals.values())
      .filter((item) => item.totalRemaining > 0)
      .sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [fines]);

  const grandRemainingTotal = useMemo(
    () => totalsByEmployee.reduce((acc, item) => acc + item.totalRemaining, 0),
    [totalsByEmployee]
  );

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div className="flex items-start gap-4">
          <span className="title-icon">
            <IconAlertTriangle className="h-[22px] w-[22px]" />
          </span>
          <div>
            <h1 className="page-title">
              Trafik Cezaları
              <span className="badge badge-neutral">{fines.length} kayıt</span>
            </h1>
            <p className="page-desc">
              Her ceza ayrı kayıt olur. Ödeme ekleyerek kalan/ödendi durumunu takip edin.
            </p>
          </div>
        </div>

        <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary">
          <IconPlus className="h-[18px] w-[18px]" />
          Trafik Cezası Ekle
        </button>
      </header>

      <div className="card">
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tf_employee" className="form-label">Çalışan</label>
              <select
                id="tf_employee"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="field"
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

      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="card-title flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500 ring-1 ring-rose-100">
              <IconAlertTriangle className="h-[18px] w-[18px]" />
            </span>
            Kayıtlar
            <span className="badge badge-neutral">{fines.length}</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="empty-state text-sm text-ink-500">Yükleniyor...</div>
        ) : fines.length === 0 ? (
          <div className="empty-state">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
              <IconInbox className="h-7 w-7" />
            </span>
            <p className="font-display text-base font-semibold text-ink-800">Henüz kayıt yok</p>
            <p className="max-w-sm text-sm text-ink-500">
              Yeni bir ceza eklemek için sağ üstteki butonu kullanın.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-200/60">
                <thead className="thead">
                  <tr>
                    <th className="th">
                      Çalışan
                    </th>
                    <th className="th">
                      Ceza Tarihi
                    </th>
                    <th className="th-right">
                      Ceza
                    </th>
                    <th className="th-right">
                      Ödenen
                    </th>
                    <th className="th-right">
                      Kalan
                    </th>
                    <th className="th-right">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200/60">
                  {fines.map((fine) => {
                    const paid = sumPayments(fine.payments);
                    const remaining = Math.max(0, fine.amount - paid);
                    const isPaid = remaining === 0 && fine.amount > 0;
                    return (
                      <tr key={fine.id} className="hover:bg-ink-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900">
                          {fine.employee.fullName}
                          {fine.description ? (
                            <div className="text-xs text-ink-500 mt-0.5">{fine.description}</div>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-700">
                          {formatDate(fine.fineDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-700 text-right">
                          {formatCurrency(fine.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-700 text-right">
                          {formatCurrency(paid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-900 font-medium text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPaid ? (
                              <span className="badge badge-success">Ödendi</span>
                            ) : null}
                            <span>{formatCurrency(remaining)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-4">
                            <button
                              onClick={() => {
                                setPayingFine(fine);
                                setPaymentModalOpen(true);
                              }}
                              className={`link-action ${isPaid ? 'pointer-events-none opacity-40' : ''}`}
                            >
                              Ödeme Ekle
                            </button>
                            <button
                              onClick={() => {
                                setDeletingFine(fine);
                                setDeleteModalOpen(true);
                              }}
                              className="link-danger"
                            >
                              <IconTrash className="h-4 w-4" />
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-ink-200/70 bg-ink-50/70 px-5 py-5 sm:px-6">
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-500">
                <IconWallet className="h-4 w-4" />
                Kullanıcı Toplamları (Kalan)
              </h3>
              <div className="space-y-1">
                {totalsByEmployee.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white"
                  >
                    <span className="font-medium text-ink-700">{item.name}</span>
                    <span className="font-semibold tabular-nums text-ink-900">
                      {formatCurrency(item.totalRemaining)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-ink-200/70 bg-white px-3.5 py-3">
                <span className="font-display font-bold text-ink-900">Genel Kalan Toplamı</span>
                <span className="font-display text-lg font-bold tabular-nums text-ink-900">
                  {formatCurrency(grandRemainingTotal)}
                </span>
              </div>
            </div>
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

      {/* Delete confirm modal */}
      {deleteModalOpen && deletingFine ? (
        <div className="modal-backdrop">
          <div className="modal-panel max-w-sm">
            <div className="p-6">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <IconTrash className="h-7 w-7" />
              </div>
              <h3 className="modal-title text-center">Trafik Cezasını Sil</h3>
              <p className="mt-2 text-center text-sm text-ink-500">
                <strong>{deletingFine.employee.fullName}</strong> için bu trafik cezasını silmek istediğinizden emin misiniz?
                Bu cezanın ödemeleri de silinir.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    if (isDeleting) return;
                    setDeleteModalOpen(false);
                    setDeletingFine(null);
                  }}
                  className="btn btn-secondary flex-1"
                  disabled={isDeleting}
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteFine}
                  className="btn btn-danger flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

