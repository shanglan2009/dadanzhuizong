// GET /api/fund?code=600519
// 返回个股资金流数据

import { NextRequest, NextResponse } from 'next/server';
import { eastmoneyFundFlow } from '@/lib/data-sources';
import type { ApiResponse, FundFlow } from '@/lib/types';
import { tencentQuote } from '@/lib/data-sources';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || '600519';

  try {
    const [flow, quotes] = await Promise.all([
      eastmoneyFundFlow(code),
      tencentQuote([code]),
    ]);

    const quote = quotes[code];
    const data: FundFlow = {
      stockCode: code,
      stockName: quote?.name || code,
      date: new Date().toISOString().slice(0, 10),
      mainNetInflow: flow.mainNetInflow,
      superLargeInflow: flow.superLarge,
      largeInflow: flow.large,
      mediumInflow: flow.medium,
      smallInflow: flow.small,
      mainInflowRatio: flow.mainRatio,
    };

    return NextResponse.json({
      success: true,
      data,
      updatedAt: new Date().toISOString(),
    } as ApiResponse<FundFlow>);

  } catch (err: any) {
    return NextResponse.json({
      success: false, data: null,
      error: err.message || '服务器错误',
      updatedAt: new Date().toISOString(),
    } as ApiResponse<null>, { status: 500 });
  }
}
