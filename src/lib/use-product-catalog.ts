import { useCallback, useEffect, useState } from "react";
import { PACKS } from "./shop";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type CatalogProduct = Database["public"]["Tables"]["inventory_products"]["Row"];

const CATALOG_ERROR = "The live product catalog could not be loaded.";

export function useProductCatalog(includeArchived = false) {
  const [products, setProducts] = useState<CatalogProduct[]>(() =>
    PACKS.map((pack, sort_order) => ({
      product_id: pack.id,
      name: pack.name,
      kicker: pack.kicker,
      description: pack.description,
      image: pack.image,
      image_alt: pack.imageAlt,
      suited: pack.suited,
      active: true,
      sort_order,
      created_at: "",
      updated_at: "",
    })),
  );
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setError(CATALOG_ERROR);
      return;
    }

    try {
      let query = supabase.from("inventory_products").select("*").order("sort_order").order("name");
      if (!includeArchived) query = query.eq("active", true);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setProducts(data);
      setError("");
    } catch {
      setError(CATALOG_ERROR);
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { products, loading, error, refresh };
}
