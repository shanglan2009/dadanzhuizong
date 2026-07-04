// GET /api/industry
// 返回行业板块评分排名

import { NextResponse } from 'next/server';
import { eastmoneyIndustryRank } from '@/lib/data-sources';
import type { ApiResponse, IndustryScore } from '@/lib/types';

export async function GET() {
  try {
    const raw = await eastmoneyIndustryRank();

    const scores: IndustryScore[] = raw.map((ind: any) => {
      const momentum = ind.changePct > 2 ? 85 : ind.changePct > 0 ? 65 : ind.changePct > -2 ? 45 : 25;
      const fundScore = ind.fundFlow > 100000000 ? 80 : ind.fundFlow > 0 ? 60 : 35;
      const valuation = 50; // MVP 暂用默认
      const total = Math.round(momentum * 0.4 + fundScore * 0.3 + valuation * 0.3);

      return {
        industry: ind.name,
        date: new Date().toISOString().slice(0, 10),
        score: total,
        momentum,
        valuation,
        fundFlow: ind.fundFlow,
        changePct: ind.changePct,
        upCount: ind.upCount,
        downCount: ind.downCount,
        leadStock: ind.leadStock,
        leadStockCode: '',
      } as IndustryScore;
    });

    return NextResponse.json({
      success: true,
      data: scores.sort((a, b) => b.score - a.score),
      updatedAt: new Date().toISOString(),
    } as ApiResponse<IndustryScore[]>);

  } catch (err: any) {
    return NextResponse.json({
      success: false, data: null,
      error: err.message || '服务器错误',
      updatedAt: new Date().toISOString(),
    } as ApiResponse<null>, { status: 500 });
  }
}
