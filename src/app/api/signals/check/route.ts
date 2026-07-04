// POST /api/signals/check
// 检查阈值触发：IAS 评分突破 + 主力资金异动
// 由前端在每次数据刷新时调用，或通过 Cron 定时检查

import { NextRequest, NextResponse } from 'next/server';
import { tencentQuote, eastmoneyFundFlow } from '@/lib/data-sources';
import { pushIASAlert, pushFundAlert } from '@/lib/notify';

// 阈值配置
const IAS_HIGH_THRESHOLD = 75;   // IAS >= 75 触发高分提醒
const IAS_LOW_THRESHOLD = 30;    // IAS <= 30 触发低分预警
const FUND_INFLOW_THRESHOLD = 1e8;     // 主力净流入 > 1亿
const FUND_OUTFLOW_THRESHOLD = -1e8;   // 主力净流出 > 1亿
const FUND_RATIO_THRESHOLD = 10;        // 主力占比 > 10%

// 防止同一只股票短时间内重复推送（5分钟冷却）
const alertCooldown = new Map<string, number>();
const COOLDOWN_MS = 5 * 60 * 1000;

function shouldAlert(code: string, type: string): boolean {
  const key = `${code}:${type}`;
  const last = alertCooldown.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) return false;
  alertCooldown.set(key, Date.now());
  return true;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const codes: string[] = body.codes || [];
  const alerts: string[] = [];

  if (codes.length === 0) {
    return NextResponse.json({ alerts: [], message: '无股票列表' });
  }

  try {
    const [quotes] = await Promise.all([
      tencentQuote(codes.slice(0, 10)), // 限频：最多检查10只
    ]);

    for (const code of codes.slice(0, 10)) {
      const quote = quotes[code];
      if (!quote) continue;

      let fundFlow;
      try {
        fundFlow = await eastmoneyFundFlow(code);
      } catch {
        continue; // 资金流获取失败，跳过
      }

      // === 检查 IAS 阈值（简化版：用 PE/PB 估算） ===
      const peScore = quote.pe > 0 && quote.pe < 15 ? 80 : quote.pe < 30 ? 60 : 40;
      const pbScore = quote.pb > 0 && quote.pb < 2 ? 75 : 55;
      const estScore = Math.round((peScore + pbScore) / 2);

      if (estScore >= IAS_HIGH_THRESHOLD && shouldAlert(code, 'ias_high')) {
        const reason = `PE=${quote.pe.toFixed(1)} PB=${quote.pb.toFixed(1)}，估值具备安全边际`;
        await pushIASAlert({
          name: quote.name, code,
          totalScore: estScore, reason,
        });
        alerts.push(`IAS高分: ${quote.name}(${code}) IAS≈${estScore}`);
      }

      if (estScore <= IAS_LOW_THRESHOLD && shouldAlert(code, 'ias_low')) {
        const reason = `PE=${quote.pe.toFixed(1)} PB=${quote.pb.toFixed(1)}，估值偏高或盈利异常`;
        await pushIASAlert({
          name: quote.name, code,
          totalScore: estScore, reason,
        });
        alerts.push(`IAS低分: ${quote.name}(${code}) IAS≈${estScore}`);
      }

      // === 检查资金异动 ===
      if (fundFlow.mainNetInflow > FUND_INFLOW_THRESHOLD &&
          fundFlow.mainRatio > FUND_RATIO_THRESHOLD &&
          shouldAlert(code, 'fund_inflow')) {
        await pushFundAlert({
          name: quote.name, code,
          mainNetInflow: fundFlow.mainNetInflow,
          mainRatio: fundFlow.mainRatio,
          direction: 'inflow',
        });
        alerts.push(`资金流入: ${quote.name}(${code}) ${(fundFlow.mainNetInflow/1e8).toFixed(1)}亿`);
      }

      if (fundFlow.mainNetInflow < FUND_OUTFLOW_THRESHOLD &&
          Math.abs(fundFlow.mainRatio) > FUND_RATIO_THRESHOLD &&
          shouldAlert(code, 'fund_outflow')) {
        await pushFundAlert({
          name: quote.name, code,
          mainNetInflow: fundFlow.mainNetInflow,
          mainRatio: fundFlow.mainRatio,
          direction: 'outflow',
        });
        alerts.push(`资金流出: ${quote.name}(${code}) ${(fundFlow.mainNetInflow/1e8).toFixed(1)}亿`);
      }
    }

    return NextResponse.json({
      success: true,
      alerts,
      checked: codes.slice(0, 10),
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      time: new Date().toISOString(),
    }, { status: 500 });
  }
}
