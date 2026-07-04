// ============================================================
// API Client — SWR hooks with auto-refresh
// ============================================================

import useSWR from 'swr';
import type { ApiResponse, IASScore, IndustryScore, FundFlow } from './types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: ApiResponse<any> = await res.json();
  if (!json.success) throw new Error(json.error || 'Unknown error');
  return json.data;
};

// ---- Stocks ----

export function useStockList(count = 30) {
  return useSWR<(IASScore & { price: number; changePct: number; pe: number; pb: number; marketCap: number })[]>(
    `/api/stock/list?count=${count}`,
    fetcher,
    { refreshInterval: 60_000 }  // 每分钟自动刷新
  );
}

export function useStockScore(code: string) {
  return useSWR<IASScore>(
    code ? `/api/stock/score?code=${code}` : null,
    fetcher,
    { refreshInterval: 120_000 }
  );
}

// ---- Industry ----

export function useIndustryScores() {
  return useSWR<IndustryScore[]>(
    '/api/industry',
    fetcher,
    { refreshInterval: 300_000 }  // 5分钟
  );
}

// ---- Fund Flow ----

export function useFundFlow(code: string) {
  return useSWR<FundFlow>(
    code ? `/api/fund?code=${code}` : null,
    fetcher,
    { refreshInterval: 60_000 }
  );
}

// ---- IAS Rank ----

export function useIASRank() {
  return useSWR<IASScore[]>(
    '/api/ias/rank',
    fetcher,
    { refreshInterval: 300_000 }
  );
}

// ---- Utils ----

export function formatAmount(amount: number): string {
  if (amount >= 1e8) return `${(amount / 1e8).toFixed(2)}亿`;
  if (amount >= 1e4) return `${(amount / 1e4).toFixed(0)}万`;
  return amount.toFixed(0);
}

export function formatMCap(amount: number): string {
  if (amount >= 1e12) return `${(amount / 1e12).toFixed(1)}万亿`;
  if (amount >= 1e8) return `${(amount / 1e8).toFixed(0)}亿`;
  return `${(amount / 1e4).toFixed(0)}万`;
}
