// GET /api/cron/daily-push
// Vercel Cron Job: 交易日 9:25 AM (UTC+8) = 01:25 UTC
// 推送 IAS TOP 10 到 QQ 机器人

import { NextResponse } from 'next/server';
import { pushDailyTop10 } from '@/lib/notify';

// Vercel Cron 密钥保护
const CRON_SECRET = process.env.CRON_SECRET || 'ias-cron-secret';

// 简易交易日判断（周一到周五，排除中国长假需后续完善）
function isTradingDay(): boolean {
  const now = new Date();
  const day = now.getDay();
  // 周六(6) 周日(0) 不交易
  return day !== 0 && day !== 6;
}

export async function GET(req: Request) {
  // 验证 Cron Secret（支持 query param 和 Authorization header）
  const url = new URL(req.url);
  const qsSecret = url.searchParams.get('cronSecret');
  const authHeader = req.headers.get('Authorization');
  const isValid = qsSecret === CRON_SECRET || authHeader === `Bearer ${CRON_SECRET}`;
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isTradingDay()) {
    return NextResponse.json({ message: '非交易日，跳过推送', date: new Date().toISOString() });
  }

  try {
    // 获取 IAS 排名数据
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const res = await fetch(`${base}/api/stock/list?count=10`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });

    if (!res.ok) {
      throw new Error(`API 错误: ${res.status}`);
    }

    const json = await res.json();
    if (!json.success) throw new Error(json.error || '未知错误');

    const top10 = json.data.slice(0, 10).map((s: any) => ({
      rank: s.rank,
      name: s.stockName,
      code: s.stockCode,
      totalScore: s.totalScore,
      changePct: s.changePct || 0,
    }));

    const sent = await pushDailyTop10(top10);

    return NextResponse.json({
      success: sent,
      message: sent ? 'QQ 推送成功' : 'QQ 推送失败（检查 QQ_ENABLE 和 API 地址）',
      top10,
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Cron] 推送异常:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      time: new Date().toISOString(),
    }, { status: 500 });
  }
}
