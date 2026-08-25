import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Category, getCategories } from '../api/category';
import { useAuth } from './AuthContext';

/**
 * Çalışma alanı kategorileri tüm sayfalarda gerekiyor (Puantaj grupları,
 * Çalışanlar listesi, Mesai tablosu). Her sayfanın ayrı ayrı çekmesi yerine
 * burada bir kez yüklenip paylaşılır.
 */
interface CategoryContextValue {
  categories: Category[];
  /** sortOrder'a göre sıralı kod listesi - grup sıralamasında kullanılır */
  orderedCodes: string[];
  /** Kod -> görünen ad. Tanımsız kod gelirse kodun kendisini döndürür. */
  labelOf: (code: string) => string;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextValue | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCategories([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setCategories(await getCategories());
    } catch {
      // Kategoriler alınamazsa sayfalar kodları ham haliyle gösterir;
      // burada hata fırlatmak tüm uygulamayı bloke ederdi.
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<CategoryContextValue>(() => {
    const labelMap = new Map(categories.map((c) => [c.code, c.label]));
    return {
      categories,
      orderedCodes: categories.map((c) => c.code),
      labelOf: (code: string) => labelMap.get(code) ?? code,
      isLoading,
      refresh,
    };
  }, [categories, isLoading, refresh]);

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCategories(): CategoryContextValue {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories, CategoryProvider içinde kullanılmalıdır');
  }
  return context;
}
