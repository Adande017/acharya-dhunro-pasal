import { useCallback, useEffect, useState } from "react";
import type { PackId } from "./shop";
import { supabase } from "./supabase";

export type InventoryStatus = "unavailable" | "low_stock" | "in_stock";
export type AvailabilityByProduct = Partial<Record<PackId, InventoryStatus>>;

const AVAILABILITY_ERROR =
  "Live availability could not be loaded. Please contact us to confirm stock.";

export function useInventoryAvailability() {
  const [availability, setAvailability] = useState<AvailabilityByProduct>({});
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState("");

  const refresh = useCallback(async (showLoading = false) => {
    if (!supabase) {
      setLoading(false);
      setError(AVAILABILITY_ERROR);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from("inventory_availability")
        .select("product_id, status");
      if (queryError) throw queryError;

      const next: AvailabilityByProduct = {};
      for (const item of data) {
        next[item.product_id as PackId] = item.status;
      }
      setAvailability(next);
      setError("");
    } catch {
      setAvailability({});
      setError(AVAILABILITY_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    const handleFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refresh]);

  return { availability, loading, error, refresh };
}
