'use client';

import { useIndustryScores } from '@/lib/api';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { formatAmount } from '@/lib/api';

echarts.use([BarChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

export default function IndustryPage() {
  const { data: industries, error, isValidating } = useIndustryScores();

  if (error) {
    return (
      <div className="p-12 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2">数据加载失败</h2>
        <p className="text-[#9ca3af]">{String(error)}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#3b82f6] rounded-lg">
          重新加载
        </button>
      </div>
    );
  }

  if (!industries) {
    return (
      <div className="p-12 flex justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full" />
      </div>
    );
  }

  const top15 = industries.slice(0, 15);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🏭 行业分析</h1>
        <p className="text-[#9ca3af] text-sm">
          {new Date().toLocaleString('zh-CN')} · 共 {industries.length} 个行业 ·
          {isValidating ? ' 🔄 刷新中' : ' ✅ 最新数据'}
        </p>
      </header>

      {/* 行业排行榜 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 表格 */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold mb-4">行业评分排名</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#6b7280] border-b border-[#1f2937]">
                  <th className="text-left py-3 px-2">排名</th>
                  <th className="text-left py-3 px-2">行业</th>
                  <th className="text-right py-3 px-2">涨跌幅</th>
                  <th className="text-right py-3 px-2">上涨家数</th>
                  <th className="text-right py-3 px-2">下跌家数</th>
                  <th className="text-right py-3 px-2">资金流</th>
                  <th className="text-right py-3 px-2">领涨股</th>
                  <th className="text-right py-3 px-2">评分</th>
                </tr>
              </thead>
              <tbody>
                {industries.map((ind, i) => (
                  <tr key={ind.industry} className="border-b border-[#1f2937] hover:bg-[#1a2236]/50">
                    <td className="py-3 px-2 font-mono text-[#6b7280]">#{i + 1}</td>
                    <td className="py-3 px-2 font-medium">{ind.industry}</td>
                    <td className={`py-3 px-2 text-right font-mono ${ind.changePct >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      {ind.changePct >= 0 ? '+' : ''}{ind.changePct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-2 text-right text-[#ef4444]">{ind.upCount}</td>
                    <td className="py-3 px-2 text-right text-[#10b981]">{ind.downCount}</td>
                    <td className={`py-3 px-2 text-right font-mono ${ind.fundFlow >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                      {formatAmount(ind.fundFlow)}
                    </td>
                    <td className="py-3 px-2 text-right">{ind.leadStock}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`font-mono font-bold ${ind.score >= 60 ? 'text-[#10b981]' : ind.score >= 40 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                        {ind.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 图表 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">行业涨跌对比</h2>
          <ReactEChartsCore
            echarts={echarts}
            option={{
              backgroundColor: 'transparent',
              tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
              grid: { left: 80, right: 20, top: 10, bottom: 30 },
              xAxis: {
                type: 'value',
                axisLabel: { color: '#9ca3af', formatter: '{value}%' },
                splitLine: { lineStyle: { color: '#1f2937' } },
              },
              yAxis: {
                type: 'category',
                data: top15.map(i => i.industry).reverse(),
                axisLabel: { color: '#9ca3af', fontSize: 11 },
                axisLine: { lineStyle: { color: '#1f2937' } },
              },
              series: [{
                type: 'bar',
                data: top15.map(i => ({
                  value: i.changePct,
                  itemStyle: { color: i.changePct >= 0 ? '#ef4444' : '#10b981' },
                })).reverse(),
                barWidth: '60%',
              }],
            }}
            style={{ height: 450 }}
            notMerge
          />
        </div>
      </div>

      {/* 行业轮动提示 */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-3">📈 行业轮动信号</h2>
        <p className="text-[#9ca3af] text-sm">
          当前强势行业：<span className="text-[#ef4444] font-medium">{top15.slice(0, 3).map(i => i.industry).join('、')}</span> ·
          资金流入前三：暂缺（需接入东财120日资金流数据）·
          行业轮动模型（AI评分）将在后续版本中上线。
        </p>
      </div>
    </div>
  );
}
