"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useToast } from "@/components/ui";

export async function api<T = any>(
  path: string,
  opts?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(path, {
    method: opts?.method ?? "GET",
    headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error(msg);
  }
  return res.json();
}

export function useList<T = any[]>(key: QueryKey, path: string) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => api<T>(path),
    staleTime: 20_000,
  });
}

/** Generic create / update / delete with optimistic updates against a list cache. */
export function useCrud<T extends { id: number | string } = any>(
  key: string,
  path: string
) {
  const qc = useQueryClient();
  const toast = useToast();
  const qk = [key];

  const invalidate = () => qc.invalidateQueries({ queryKey: qk });

  const snapshot = async () => {
    await qc.cancelQueries({ queryKey: qk });
    const prev = qc.getQueryData<T[]>(qk);
    return { prev };
  };
  const rollback = (ctx?: { prev?: T[] }) => {
    if (ctx?.prev) qc.setQueryData(qk, ctx.prev);
  };

  const create = useMutation({
    mutationFn: (body: Partial<T>) =>
      api(path, { method: "POST", body }),
    onMutate: async (body) => {
      const ctx = await snapshot();
      qc.setQueryData<T[]>(qk, (old = []) => [
        { ...body, id: -Date.now() } as T,
        ...old,
      ]);
      return ctx;
    },
    onError: (e: Error, _v, ctx) => {
      rollback(ctx);
      toast.error(e.message);
    },
    onSuccess: (row: any) => toast.success(`${row?.name || row?.title || "Record"} saved`),
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, ...body }: Partial<T> & { id: number | string }) =>
      api(`${path}/${id}`, { method: "PATCH", body }),
    onMutate: async (vars) => {
      const ctx = await snapshot();
      qc.setQueryData<T[]>(qk, (old = []) =>
        old.map((r) => (r.id === vars.id ? ({ ...r, ...vars } as T) : r))
      );
      return ctx;
    },
    onError: (e: Error, _v, ctx) => {
      rollback(ctx);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Changes saved"),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number | string) =>
      api(`${path}/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      const ctx = await snapshot();
      qc.setQueryData<T[]>(qk, (old = []) => old.filter((r) => r.id !== id));
      return ctx;
    },
    onError: (e: Error, _v, ctx) => {
      rollback(ctx);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Deleted"),
    onSettled: invalidate,
  });

  return { create, update, remove, invalidate };
}

/** One-off actions (pay invoice, checkout, generate bills…) */
export function useAction(
  fn: (vars: any) => Promise<any>,
  opts?: { invalidateKeys?: QueryKey[]; success?: string; silent?: boolean }
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      opts?.invalidateKeys?.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      if (!opts?.silent && opts?.success !== "") toast.success(opts?.success || data?.message || "Done");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
