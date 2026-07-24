import { useEffect, useState } from 'react';
import {
  listProductsByCategory,
  type MonetizationProduct,
  type ProductCategory,
} from '@/lib/monetization/products';

export function useMonetizationProducts(category: ProductCategory) {
  const [products, setProducts] = useState<MonetizationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listProductsByCategory(category)
      .then((data) => {
        if (!alive) return;
        setProducts(data);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [category]);

  return { products, loading, error };
}
