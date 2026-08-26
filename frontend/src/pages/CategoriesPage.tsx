import { FormEvent, useState } from 'react';
import {
  Category,
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from '../api/category';
import { isApiError } from '../api/employee';
import { useCategories } from '../context/CategoryContext';
import { useToast } from '../context/ToastContext';
import { PanelLoader } from '../components/Loaders';
import {
  IconCheck,
  IconDrag,
  IconInbox,
  IconLayers,
  IconPencil,
  IconPlus,
  IconTrash,
} from '../components/Icons';

export default function CategoriesPage() {
  const { categories, isLoading, refresh } = useCategories();
  const { showToast } = useToast();

  const [newLabel, setNewLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) {
      showToast('Kategori adı zorunludur', 'error');
      return;
    }

    setIsCreating(true);
    try {
      await createCategory(label);
      showToast(`"${label}" kategorisi eklendi`, 'success');
      setNewLabel('');
      await refresh();
    } catch (err) {
      showToast(isApiError(err) ? err.message : 'Kategori eklenemedi', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingLabel(category.label);
    setConfirmingDeleteId(null);
  };

  const handleSaveEdit = async (category: Category) => {
    const label = editingLabel.trim();
    if (!label) {
      showToast('Kategori adı zorunludur', 'error');
      return;
    }
    if (label === category.label) {
      setEditingId(null);
      return;
    }

    setIsSaving(true);
    try {
      await updateCategory(category.id, { label });
      showToast('Kategori güncellendi', 'success');
      setEditingId(null);
      await refresh();
    } catch (err) {
      showToast(isApiError(err) ? err.message : 'Kategori güncellenemedi', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    setDeletingId(category.id);
    try {
      await deleteCategory(category.id);
      showToast(`"${category.label}" kategorisi silindi`, 'success');
      await refresh();
    } catch (err) {
      showToast(isApiError(err) ? err.message : 'Kategori silinemedi', 'error');
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const fromIndex = categories.findIndex((c) => c.id === draggingId);
    const toIndex = categories.findIndex((c) => c.id === targetId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingId(null);
      return;
    }

    const reordered = [...categories];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setDraggingId(null);
    try {
      await reorderCategories(reordered.map((c) => c.id));
      showToast('Sıralama kaydedildi', 'success');
      await refresh();
    } catch (err) {
      showToast(isApiError(err) ? err.message : 'Sıralama kaydedilemedi', 'error');
    }
  };

  if (isLoading) {
    return <PanelLoader label="Kategoriler yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div className="flex items-start gap-4">
          <span className="title-icon">
            <IconLayers className="h-[22px] w-[22px]" />
          </span>
          <div>
            <h1 className="page-title">
              Kategoriler
              <span className="badge badge-neutral">{categories.length} kategori</span>
            </h1>
            <p className="page-desc">
              Çalışan eklerken seçilen çalışma alanları. Sıralama; Puantaj, Çalışanlar ve Mesailer
              sayfalarındaki grup sırasını belirler.
            </p>
          </div>
        </div>
      </header>

      <div className="card px-5 sm:px-6 py-5">
        <h2 className="card-title mb-4 flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <IconPlus className="h-[18px] w-[18px]" />
          </span>
          Yeni Kategori Ekle
        </h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="new_category_label" className="sr-only">
              Kategori adı
            </label>
            <input
              id="new_category_label"
              type="text"
              value={newLabel}
              maxLength={50}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Örn. Bursa Şubesi"
              className="field"
              disabled={isCreating}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !newLabel.trim()}
            className="btn btn-primary"
          >
            {isCreating ? (
              <>
                <span className="spinner h-4 w-4 border-white/40 border-t-white" />
                Ekleniyor...
              </>
            ) : (
              <>
                <IconPlus className="h-[18px] w-[18px]" />
                Kategori Ekle
              </>
            )}
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <div>
            <h2 className="card-title">Tanımlı Kategoriler</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Satırları sürükleyerek sırayı değiştirebilirsin.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-400">
            <IconDrag className="h-4 w-4" />
            Sürükle-bırak sıralama
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
              <IconInbox className="h-7 w-7" />
            </span>
            <p className="font-display text-base font-semibold text-ink-800">
              Henüz kategori tanımlanmamış
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Yukarıdaki formdan ilk çalışma alanını ekleyin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200/60">
              <thead className="thead">
                <tr>
                  <th className="th">Kategori</th>
                  <th className="th">Kod</th>
                  <th className="th-right">Çalışan</th>
                  <th className="th-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200/60">
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    draggable={editingId !== category.id}
                    onDragStart={() => setDraggingId(category.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(category.id)}
                    className={`transition-colors hover:bg-brand-50/40 ${
                      draggingId === category.id ? 'opacity-50' : ''
                    } ${editingId === category.id ? '' : 'cursor-grab'}`}
                  >
                    <td className="px-6 py-4 text-sm">
                      {editingId === category.id ? (
                        <div className="flex items-center gap-2">
                          <label htmlFor={`edit_label_${category.id}`} className="sr-only">
                            Kategori adı
                          </label>
                          <input
                            id={`edit_label_${category.id}`}
                            type="text"
                            value={editingLabel}
                            maxLength={50}
                            autoFocus
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(category);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="field-cell w-auto"
                            disabled={isSaving}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(category)}
                            disabled={isSaving}
                            className="link-action"
                          >
                            <IconCheck className="h-4 w-4" />
                            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={isSaving}
                            className="link-muted"
                          >
                            Vazgeç
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium text-ink-900">{category.label}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <code className="kbd">{category.code}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-ink-700">
                      {category.employeeCount}
                    </td>
                    <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                      {confirmingDeleteId === category.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-ink-600">Silinsin mi?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            disabled={deletingId === category.id}
                            className="link-danger"
                          >
                            {deletingId === category.id ? 'Siliniyor...' : 'Evet, Sil'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            disabled={deletingId === category.id}
                            className="link-muted"
                          >
                            Vazgeç
                          </button>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="link-action mr-1"
                          >
                            <IconPencil className="h-4 w-4" />
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(category.id)}
                            disabled={category.employeeCount > 0}
                            title={
                              category.employeeCount > 0
                                ? 'Bu kategoride çalışan var, önce onları başka kategoriye taşıyın'
                                : undefined
                            }
                            className="link-danger"
                          >
                            <IconTrash className="h-4 w-4" />
                            Sil
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card-footer">
          Kategori adını değiştirmek mevcut çalışanları etkilemez; kod sabit kalır. İçinde çalışan
          bulunan kategori silinemez.
        </div>
      </div>
    </div>
  );
}
