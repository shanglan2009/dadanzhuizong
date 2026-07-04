'use client';

import { useEffect, useRef } from 'react';
import { useStockList, useIndustryScores, formatAmount, formatMCap } from '@/lib/api';

// 阈值配置
const IAS_HIGH = 75;
const IAS_LOW = 30;
const SIGNAL_COOLDOWN = 5 * 60 * 1000; // 5分钟冷却

const lastSignalCheck = new Map<string, number>();

export default function DashboardPage() {
  const { data: stocks, error: stockErr, isValidating: stockLoading } = useStockList(30);
  const { data: industries, isValidating: indLoading } = useIndustryScores();

  // 🔔 每次数据刷新时检查阈值信号
  useEffect(() => {
    if (!stocks || stockLoading) return;

    const alerts: Array<{ type: string; name: string; code: string; detail: string }> = [];

    for (const s of stocks) {
      const key = `${s.stockCode}:signal`;
      const last = lastSignalCheck.get(key);
      if (last && Date.now() - last < SIGNAL_COOLDOWN) continue;

      if (s.totalScore >= IAS_HIGH) {
        alerts.push({ type: 'IAS_HIGH', name: s.stockName, code: s.stockCode, detail: `IAS=${s.totalScore}` });
        lastSignalCheck.set(key, Date.now());
      } else if (s.totalScore <= IAS_LOW) {
        alerts.push({ type: 'IAS_LOW', name: s.stockName, code: s.stockCode, detail: `IAS=${s.totalScore}` });
        lastSignalCheck.set(key, Date.now());
      }
    }

    // 有告警时发送到 QQ
    if (alerts.length > 0) {
      fetch('/api/signals/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: alerts.map(a => a.code) }),
      }).catch(() => {/* 静默失败 */});
    }
  }, [stocks, stockLoading]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* 头部 */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📊 A股机构Alpha 仪表盘</h1>
        <p className="text-[#9ca3af] text-sm">
          {new Date().toLocaleString('zh-CN')} ·
          {stockLoading && ' 数据刷新中...'}
          {!stockLoading && stocks && ` 共追踪 ${stocks.length} 只核心标的`}
          {stockErr && ' ⚠️ 数据加载异常'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：IAS Top 50 */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🏆 IAS 评分 TOP 30
            <span className="text-xs font-normal text-[#6b7280]">综合评分</span>
          </h2>

          {stockErr && (
            <div className="text-center py-12 text-[#ef4444]">
              ⚠️ 数据加载失败，请稍后刷新
            </div>
          )}

          {!stocks && !stockErr && (
            <div className="text-center py-12 text-[#6b7280]">
              <div className="animate-spin w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full mx-auto mb-3" />
              加载中...
            </div>
          )}

          {stocks && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#6b7280] border-b border-[#1f2937]">
                    <th className="text-left py-3 px-2">排名</th>
                    <th className="text-left py-3 px-2">代码</th>
                    <th className="text-left py-3 px-2">名称</th>
                    <th className="text-right py-3 px-2">股价</th>
                    <th className="text-right py-3 px-2">涨跌</th>
                    <th className="text-right py-3 px-2">PE</th>
                    <th className="text-right py-3 px-2">市值</th>
                    <th className="text-right py-3 px-2">IAS评分</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s) => (
                    <tr
                      key={s.stockCode}
                      className="border-b border-[#1f2937] hover:bg-[#1a2236]/50 cursor-pointer"
                      onClick={() => window.location.href = `/stock/${s.stockCode}`}
                    >
                      <td className="py-3 px-2 font-mono text-[#6b7280]">#{s.rank}</td>
                      <td className="py-3 px-2 font-mono text-[#9ca3af]">{s.stockCode}</td>
                      <td className="py-3 px-2 font-medium">{s.stockName}</td>
                      <td className="py-3 px-2 text-right font-mono">{s.price?.toFixed(2)}</td>
                      <td className={`py-3 px-2 text-right font-mono ${(s.changePct || 0) >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                        {(s.changePct || 0) >= 0 ? '+' : ''}{s.changePct?.toFixed(2)}%
                      </td>
                      <td className="py-3 px-2 text-right font-mono">{s.pe > 0 ? s.pe.toFixed(1) : '-'}</td>
                      <td className="py-3 px-2 text-right font-mono">{formatMCap(s.marketCap * 1e8)}</td>
                      <td className="py-3 px-2 text-right">
                        <ScoreBadge score={s.totalScore} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 右侧：行业热力图 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🏭 行业热度
            <span className="text-xs font-normal text-[#6b7280]">TOP 15</span>
          </h2>

          {indLoading && !industries && (
            <div className="text-center py-8 text-[#6b7280] text-sm">加载中...</div>
          )}

          {industries && (
            <div className="space-y-2">
              {industries.slice(0, 15).map((ind) => (
                <div key={ind.industry} className="flex items-center justify-between text-sm">
                  <span className="truncate w-24">{ind.industry}</span>
                  <div className="flex-1 mx-3">
                    <div className="h-2 rounded-full bg-[#1f2937] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(Math.abs(ind.changePct) * 8, 100)}%`,
                          backgroundColor: ind.changePct >= 0 ? '#ef4444' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                  <span className={`font-mono w-16 text-right ${ind.changePct >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                    {ind.changePct >= 0 ? '+' : ''}{ind.changePct.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 底栏：数据源说明 */}
      <footer className="mt-8 text-center text-xs text-[#4b5563]">
        数据源：腾讯财经（不封IP）· 东方财富（限流）· IAS评分 V1.0 MVP ·
        ⚡ 每 60 秒自动刷新
      </footer>
    </div>
  );
}

/** 评分徽章 */
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block w-16 h-5 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}33, ${color})`,
          boxShadow: `0 0 8px ${color}44`,
        }}
      />
      <span className="font-mono font-bold" style={{ color }}>{score}</span>
    </span>
  );
}
