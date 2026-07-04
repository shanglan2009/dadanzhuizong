// GET /api/ias/rank
// 返回 IAS 排名榜

import { NextResponse } from 'next/server';
import type { ApiResponse, IASScore } from '@/lib/types';

// 复用 list 的逻辑但专注于排名展示
export async function GET() {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const res = await fetch(`${base}/api/stock/list?count=50`, {
      next: { revalidate: 300 },
    });
    const json = await res.json();

    if (!json.success) throw new Error(json.error);

    const data = json.data.map((item: any, idx: number) => ({
      stockCode: item.stockCode,
      stockName: item.stockName,
      date: item.date,
      industryScore: item.industryScore,
      companyScore: item.companyScore,
      capitalScore: item.capitalScore,
      momentumScore: item.momentumScore,
      eventScore: item.eventScore,
      totalScore: item.totalScore,
      rank: idx + 1,
    } as IASScore));

    return NextResponse.json({
      success: true,
      data,
      updatedAt: new Date().toISOString(),
    } as ApiResponse<IASScore[]>);

  } catch (err: any) {
    return NextResponse.json({
      success: false, data: null,
      error: err.message || '服务器错误',
      updatedAt: new Date().toISOString(),
    } as ApiResponse<null>, { status: 500 });
  }
}
