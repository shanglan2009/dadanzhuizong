// GET /api/stock/list?count=50
// 返回 IAS 排名前 N 的股票列表

import { NextRequest, NextResponse } from 'next/server';
import { tencentQuote } from '@/lib/data-sources';
import type { ApiResponse, IASScore } from '@/lib/types';

// 沪深300 核心池（MVP 先用固定池）
const CORE_POOL = [
  '600519', '000858', '000568', '600809', '002415', // 消费
  '601318', '600036', '601398', '000002', '600030', // 金融
  '600276', '300760', '000661', '688981', '300015', // 医药
  '002475', '601012', '300750', '688012', '603501', // 科技制造
  '600900', '601857', '601088', '600585', '601899', // 能源
  '000333', '002271', '600031', '601668', '601390', // 工业
  '300059', '002230', '600570', '300124', '002594', // 信息技术
  '601688', '600837', '000001', '002142', '600016', // 金融2
  '601919', '600346', '002493', '601985', '600028', // 周期
  '688017', '300274', '688111', '300498', '603288', // 科技
];

export async function GET(req: NextRequest) {
  const count = Math.min(parseInt(req.nextUrl.searchParams.get('count') || '30'), 50);

  try {
    const quotes = await tencentQuote(CORE_POOL);

    const scores: IASScore[] = CORE_POOL
      .filter(code => quotes[code])
      .map((code, idx) => {
        const q = quotes[code];
        // MVP 简化评分
        const peScore = q.pe > 0 && q.pe < 20 ? 80 : q.pe < 40 ? 60 : 40;
        const pbScore = q.pb > 0 && q.pb < 2 ? 75 : q.pb < 4 ? 55 : 35;
        const momentum = q.changePct > 0 ? 60 + Math.min(q.changePct * 2, 30) : 50 + Math.max(q.changePct, -20);

        return {
          stockCode: code,
          stockName: q.name,
          date: new Date().toISOString().slice(0, 10),
          industryScore: 50 + Math.floor(Math.random() * 30),
          companyScore: Math.round((peScore + pbScore) / 2),
          capitalScore: 50,
          momentumScore: Math.round(momentum),
          eventScore: 50,
          totalScore: Math.round((peScore + pbScore) / 2 * 0.4 + momentum * 0.3 + 50 * 0.3),
          rank: idx + 1,
          price: q.price,
          changePct: q.changePct,
          pe: q.pe,
          pb: q.pb,
          marketCap: q.marketCap,
        } as IASScore & { price: number; changePct: number; pe: number; pb: number; marketCap: number };
      })
      .sort((a, b) => (b as any).totalScore - (a as any).totalScore)
      .slice(0, count)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return NextResponse.json({
      success: true,
      data: scores,
      updatedAt: new Date().toISOString(),
    } as ApiResponse<(IASScore & { price: number; changePct: number; pe: number; pb: number; marketCap: number })[]>);

  } catch (err: any) {
    return NextResponse.json({
      success: false, data: null,
      error: err.message || '服务器错误',
      updatedAt: new Date().toISOString(),
    } as ApiResponse<null>, { status: 500 });
  }
}
