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
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          Kategoriler
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
            {categories.length} kategori
          </span>
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Çalışan eklerken seçilen çalışma alanları. Sıralama; Puantaj, Çalışanlar ve Mesailer
          sayfalarındaki grup sırasını belirler.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Yeni Kategori Ekle</h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={isCreating}
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !newLabel.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreating ? 'Ekleniyor...' : '+ Kategori Ekle'}
          </button>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Tanımlı Kategoriler</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Satırları sürükleyerek sırayı değiştirebilirsin.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Henüz kategori tanımlanmamış.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    draggable={editingId !== category.id}
                    onDragStart={() => setDraggingId(category.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(category.id)}
                    className={`hover:bg-gray-50 ${draggingId === category.id ? 'opacity-50' : ''} ${
                      editingId === category.id ? '' : 'cursor-grab'
                    }`}
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
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={isSaving}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(category)}
                            disabled={isSaving}
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                          >
                            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={isSaving}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Vazgeç
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">{category.label}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                        {category.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-700">
                      {category.employeeCount}
                    </td>
                    <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                      {confirmingDeleteId === category.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-gray-600">Silinsin mi?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            disabled={deletingId === category.id}
                            className="font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {deletingId === category.id ? 'Siliniyor...' : 'Evet, Sil'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            disabled={deletingId === category.id}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Vazgeç
                          </button>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
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
                            className="text-red-600 hover:text-red-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                          >
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

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-gray-500">
          Kategori adını değiştirmek mevcut çalışanları etkilemez; kod sabit kalır. İçinde çalışan
          bulunan kategori silinemez.
        </div>
      </div>
    </div>
  );
}
