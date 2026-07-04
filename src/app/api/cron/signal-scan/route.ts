// GET /api/cron/signal-scan
// Vercel Cron Job: 盘中每5分钟扫描核心池，触发阈值告警
// 只接受 GET（Vercel Cron 限制）

import { NextResponse } from 'next/server';
import { tencentQuote, eastmoneyFundFlow } from '@/lib/data-sources';
import { pushIASAlert, pushFundAlert } from '@/lib/notify';

const CRON_SECRET = process.env.CRON_SECRET || 'ias-cron-secret';

// 核心监控池
const WATCHLIST = [
  '600519', '000858', '601318', '300750', '002475',
  '600036', '000333', '300059', '688981', '601012',
  '600900', '002415', '603501', '000002', '600030',
];

// 阈值
const IAS_HIGH = 75;
const IAS_LOW = 30;
const FUND_INFLOW = 1e8;
const FUND_OUTFLOW = -1e8;
const FUND_RATIO = 10;
const COOLDOWN_MS = 5 * 60 * 1000;

const cooldowns = new Map<string, number>();

function shouldAlert(key: string): boolean {
  const last = cooldowns.get(key);
  if (last && Date.now() - last < COOLDOWN_MS) return false;
  cooldowns.set(key, Date.now());
  return true;
}

export async function GET(req: Request) {
  // 支持 query param (?cronSecret=...) 和 Authorization header
  const url = new URL(req.url);
  const qsSecret = url.searchParams.get('cronSecret');
  const auth = req.headers.get('Authorization');
  const isValid = qsSecret === CRON_SECRET || auth === `Bearer ${CRON_SECRET}`;
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alerts: string[] = [];

  try {
    const quotes = await tencentQuote(WATCHLIST);

    for (const code of WATCHLIST) {
      const q = quotes[code];
      if (!q) continue;

      // 估值评分
      const peScore = q.pe > 0 && q.pe < 15 ? 80 : q.pe < 30 ? 60 : 40;
      const pbScore = q.pb > 0 && q.pb < 2 ? 75 : 55;
      const estScore = Math.round((peScore + pbScore) / 2);

      if (estScore >= IAS_HIGH && shouldAlert(`${code}:ias_high`)) {
        await pushIASAlert({
          name: q.name, code, totalScore: estScore,
          reason: `PE=${q.pe.toFixed(1)} PB=${q.pb.toFixed(1)}`,
        });
        alerts.push(`HIGH:${q.name}(${code})=${estScore}`);
        continue;
      }

      if (estScore <= IAS_LOW && shouldAlert(`${code}:ias_low`)) {
        await pushIASAlert({
          name: q.name, code, totalScore: estScore,
          reason: `PE=${q.pe.toFixed(1)} PB=${q.pb.toFixed(1)}`,
        });
        alerts.push(`LOW:${q.name}(${code})=${estScore}`);
      }

      // 资金流检查
      try {
        const ff = await eastmoneyFundFlow(code);
        if (ff.mainNetInflow > FUND_INFLOW && ff.mainRatio > FUND_RATIO && shouldAlert(`${code}:inflow`)) {
          await pushFundAlert({
            name: q.name, code, mainNetInflow: ff.mainNetInflow,
            mainRatio: ff.mainRatio, direction: 'inflow',
          });
          alerts.push(`IN:${q.name}(${code}) ${(ff.mainNetInflow/1e8).toFixed(1)}亿`);
        }
        if (ff.mainNetInflow < FUND_OUTFLOW && Math.abs(ff.mainRatio) > FUND_RATIO && shouldAlert(`${code}:outflow`)) {
          await pushFundAlert({
            name: q.name, code, mainNetInflow: ff.mainNetInflow,
            mainRatio: ff.mainRatio, direction: 'outflow',
          });
          alerts.push(`OUT:${q.name}(${code}) ${(ff.mainNetInflow/1e8).toFixed(1)}亿`);
        }
      } catch {
        // 跳过资金流异常
      }
    }

    return NextResponse.json({
      success: true,
      alerts,
      scanned: WATCHLIST.length,
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
