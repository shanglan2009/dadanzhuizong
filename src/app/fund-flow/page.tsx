'use client';

import { useState } from 'react';
import { useFundFlow, useStockList, formatAmount } from '@/lib/api';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const WATCH_CODES = [
  '600519', '000858', '601318', '300750', '002475',
  '600036', '000333', '600900', '688981', '300059',
];

export default function FundFlowPage() {
  const [selected, setSelected] = useState('600519');
  const { data: flow, isValidating } = useFundFlow(selected);
  const { data: stocks } = useStockList(10);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">💰 资金流向监控</h1>
        <p className="text-[#9ca3af] text-sm">
          {new Date().toLocaleString('zh-CN')} · 东财实时资金流 ·
          {isValidating ? ' 🔄 刷新中' : ' ✅ 最新'}
        </p>
      </header>

      {/* 股票选择器 */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-[#9ca3af] mb-3">快速查看</h2>
        <div className="flex flex-wrap gap-2">
          {WATCH_CODES.map(code => {
            const stock = stocks?.find(s => s.stockCode === code);
            return (
              <button
                key={code}
                onClick={() => setSelected(code)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selected === code
                    ? 'bg-[#3b82f6] text-white'
                    : 'bg-[#0d1321] text-[#9ca3af] hover:bg-[#1a2236] hover:text-white'
                }`}
              >
                {stock?.stockName || code}
                <span className="ml-1 text-xs font-mono opacity-60">{code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 资金流展示 */}
      {flow && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 数据卡片 */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">
              {flow.stockName} <span className="text-[#6b7280] font-mono text-sm">{flow.stockCode}</span>
            </h3>
            <div className="space-y-3">
              <FundRow label="主力净流入" value={flow.mainNetInflow} highlight />
              <FundRow label="超大单净流入" value={flow.superLargeInflow} />
              <FundRow label="大单净流入" value={flow.largeInflow} />
              <FundRow label="中单净流入" value={flow.mediumInflow} />
              <FundRow label="小单净流入" value={flow.smallInflow} />
              <div className="pt-3 border-t border-[#1f2937]">
                <FundRow label="主力流入占比" value={flow.mainInflowRatio} isRatio />
              </div>
            </div>
          </div>

          {/* 图表 */}
          <div className="card">
            <h3 className="text-sm font-semibold text-[#9ca3af] mb-3">资金分布</h3>
            <ReactEChartsCore
              echarts={echarts}
              option={getFundBarOption(flow)}
              style={{ height: 320 }}
              notMerge
            />
          </div>
        </div>
      )}

      {!flow && (
        <div className="card text-center py-12 text-[#6b7280]">加载中...</div>
      )}

      {/* 主力动向说明 */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-3">📖 资金流解读</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-[#0d1321]">
            <div className="text-[#ef4444] font-semibold mb-1">🔴 主力净流入</div>
            <p className="text-[#9ca3af]">超大单+大单净买入，表示机构/游资在买入，通常看涨信号</p>
          </div>
          <div className="p-3 rounded-lg bg-[#0d1321]">
            <div className="text-[#10b981] font-semibold mb-1">🟢 主力净流出</div>
            <p className="text-[#9ca3af]">超大单+大单净卖出，表示机构/游资在出货，短期谨慎</p>
          </div>
          <div className="p-3 rounded-lg bg-[#0d1321]">
            <div className="text-[#f59e0b] font-semibold mb-1">🟡 小单逆势</div>
            <p className="text-[#9ca3af]">主力流出但小单流入，可能是散户接盘，需警惕</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FundRow({ label, value, highlight, isRatio }: {
  label: string; value: number; highlight?: boolean; isRatio?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${highlight ? 'bg-[#1a2236]/50 -mx-2 px-2 rounded' : ''}`}>
      <span className={`text-sm ${highlight ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`font-mono font-bold text-sm ${
        isRatio ? '' : (value >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]')
      }`}>
        {isRatio ? `${value.toFixed(2)}%` : `${(value / 1e8).toFixed(2)}亿`}
      </span>
    </div>
  );
}

function getFundBarOption(flow: any) {
  const data = [
    { name: '超大单', value: flow.superLargeInflow || 0 },
    { name: '大单', value: flow.largeInflow || 0 },
    { name: '中单', value: flow.mediumInflow || 0 },
    { name: '小单', value: flow.smallInflow || 0 },
  ];

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const v = params[0].value;
        return `${params[0].name}<br/>净流入：${(v / 1e8).toFixed(2)}亿`;
      },
    },
    grid: { left: 50, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: { color: '#9ca3af', fontSize: 12 },
      axisLine: { lineStyle: { color: '#1f2937' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', formatter: (v: number) => (v / 1e8).toFixed(1) + '亿' },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    series: [{
      type: 'bar',
      data: data.map(d => ({
        value: d.value,
        itemStyle: {
          color: d.value >= 0 ? '#ef4444' : '#10b981',
          borderRadius: [4, 4, 0, 0],
        },
      })),
      barWidth: '50%',
    }],
  };
}
