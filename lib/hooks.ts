"use client";
import { useState, useEffect, useCallback } from "react";

export function useData<T>(url: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [url]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = async (item: any) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
    const d = await r.json();
    refresh();
    return d;
  };

  const update = async (item: any) => {
    await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
    refresh();
  };

  const remove = async (id: string) => {
    await fetch(`${url}?id=${id}`, { method: "DELETE" });
    refresh();
  };

  return { data, loading, refresh, add, update, remove, setData };
}
