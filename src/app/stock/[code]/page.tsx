'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useStockScore, useFundFlow } from '@/lib/api';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

export default function StockDetailPage() {
  const params = useParams();
  const code = params.code as string;
  const { data: score, error, isValidating } = useStockScore(code);
  const { data: fundFlow } = useFundFlow(code);
  const [tab, setTab] = useState<'overview' | 'fund' | 'financial'>('overview');

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

  if (!score) {
    return (
      <div className="p-12 flex justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#3b82f6] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* 标题 */}
      <header className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold">
          {score.stockName} <span className="text-[#6b7280] font-mono">{score.stockCode}</span>
        </h1>
        <span className="text-sm text-[#6b7280]">{isValidating ? '🔄 刷新中...' : '✅ 实时'}</span>
      </header>

      {/* 评分卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <ScoreCard label="IAS 综合" score={score.totalScore} color="#3b82f6" />
        <ScoreCard label="行业" score={score.industryScore} color="#8b5cf6" />
        <ScoreCard label="公司质量" score={score.companyScore} color="#10b981" />
        <ScoreCard label="资金面" score={score.capitalScore} color="#f59e0b" />
        <ScoreCard label="动量" score={score.momentumScore} color="#ef4444" />
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        {(['overview', 'fund', 'financial'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === t ? 'bg-[#3b82f6] text-white' : 'bg-[#1a2236] text-[#9ca3af] hover:text-white'
            }`}
          >
            {t === 'overview' && '📋 概览'}
            {t === 'fund' && '💰 资金流'}
            {t === 'financial' && '📊 财务'}
          </button>
        ))}
      </div>

      {/* 概览 */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-[#9ca3af] mb-3">评分构成</h3>
            <ReactEChartsCore
              echarts={echarts}
              option={getScoreRadarOption(score)}
              style={{ height: 300 }}
              notMerge
            />
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-[#9ca3af] mb-3">资金流向</h3>
            {fundFlow ? (
              <ReactEChartsCore
                echarts={echarts}
                option={getFundBarOption(fundFlow)}
                style={{ height: 300 }}
                notMerge
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[#6b7280]">加载中...</div>
            )}
          </div>
        </div>
      )}

      {/* 资金流详情 */}
      {tab === 'fund' && fundFlow && (
        <FundFlowDetail fundFlow={fundFlow} />
      )}

      {/* 财务 */}
      {tab === 'financial' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-[#9ca3af] mb-3">财务数据</h3>
          <p className="text-[#6b7280] text-sm">
            财务数据来自新浪财报 API（利润表），每季度更新。
            完整财务报表接入将在后续版本中上线。
          </p>
        </div>
      )}
    </div>
  );
}

// ===== 子组件 =====

function ScoreCard({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="card text-center">
      <div className="text-xs text-[#6b7280] mb-2">{label}</div>
      <div className="text-3xl font-bold" style={{ color }}>{score}</div>
      <div className="mt-2 h-1.5 rounded-full bg-[#1f2937] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ECharts 配置
function getScoreRadarOption(score: any) {
  return {
    backgroundColor: 'transparent',
    radar: {
      center: ['50%', '50%'],
      radius: '75%',
      indicator: [
        { name: '行业', max: 100 },
        { name: '公司质量', max: 100 },
        { name: '资金面', max: 100 },
        { name: '动量', max: 100 },
        { name: '事件', max: 100 },
      ],
      axisName: { color: '#9ca3af', fontSize: 11 },
      splitArea: { areaStyle: { color: ['#111827', '#111827'] } },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: [score.industryScore, score.companyScore, score.capitalScore, score.momentumScore, score.eventScore],
        name: score.stockName,
        areaStyle: { color: 'rgba(59,130,246,0.15)' },
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
      }],
    }],
  };
}

function getFundBarOption(flow: any) {
  const cats = ['超大单', '大单', '中单', '小单'];
  const vals = [
    flow.superLargeInflow || 0,
    flow.largeInflow || 0,
    flow.mediumInflow || 0,
    flow.smallInflow || 0,
  ];
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: cats,
      axisLabel: { color: '#9ca3af' },
      axisLine: { lineStyle: { color: '#1f2937' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', formatter: (v: number) => (v / 1e8).toFixed(1) + '亿' },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    series: [{
      type: 'bar',
      data: vals.map(v => ({
        value: v,
        itemStyle: { color: v >= 0 ? '#ef4444' : '#10b981' },
      })),
      barWidth: '50%',
    }],
  };
}

function FundFlowDetail({ fundFlow }: { fundFlow: any }) {
  const items = [
    { label: '主力净流入', value: fundFlow.mainNetInflow },
    { label: '超大单净流入', value: fundFlow.superLargeInflow },
    { label: '大单净流入', value: fundFlow.largeInflow },
    { label: '中单净流入', value: fundFlow.mediumInflow },
    { label: '小单净流入', value: fundFlow.smallInflow },
    { label: '主力流入占比', value: fundFlow.mainInflowRatio, isRatio: true },
  ];

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-[#9ca3af] mb-4">资金流明细</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm">{item.label}</span>
            <span className={`font-mono font-semibold ${item.isRatio ? '' : (item.value >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]')}`}>
              {item.isRatio ? `${item.value.toFixed(2)}%` : `${(item.value / 1e8).toFixed(2)}亿`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
