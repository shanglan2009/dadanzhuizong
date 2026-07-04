// GET /api/stock/score?code=600519
// 返回单只股票的 IAS 评分及子项

import { NextRequest, NextResponse } from 'next/server';
import { tencentQuote, eastmoneyFundFlow, sinaFinancialReport, eastmoneyStockNews } from '@/lib/data-sources';
import type { ApiResponse, IASScore } from '@/lib/types';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || '600519';

  try {
    // 🔧 逐个调用，单个数据源失败不影响整体
    let quotes: Record<string, any> = {};
    let fundFlow = { mainNetInflow: 0, superLarge: 0, large: 0, medium: 0, small: 0, mainRatio: 0 };
    let financials: any[] = [];
    let news: any[] = [];

    try { quotes = await tencentQuote([code]); } catch (e) { console.error('tencentQuote failed:', e); }
    try { fundFlow = await eastmoneyFundFlow(code); } catch (e) { console.error('fundFlow failed:', e); }
    try { financials = await sinaFinancialReport(code, 'lrb', 4); } catch (e) { console.error('financials failed:', e); }
    try { news = await eastmoneyStockNews(code, 5); } catch (e) { console.error('news failed:', e); }

    const quote = quotes[code];
    if (!quote) {
      return NextResponse.json({
        success: false,
        data: null,
        error: `未找到股票 ${code}，请检查代码是否正确`,
        updatedAt: new Date().toISOString(),
      } as ApiResponse<null>, { status: 404 });
    }

    const companyScore = calcCompanyScore(quote, financials);
    const capitalScore = calcCapitalScore(fundFlow);
    const momentumScore = calcMomentumScore(quote);
    const industryScore = 50;
    const eventScore = calcEventScore(news);

    const totalScore = Math.round(
      industryScore * 0.20 +
      companyScore * 0.30 +
      capitalScore * 0.25 +
      momentumScore * 0.15 +
      eventScore * 0.10
    );

    const score: IASScore = {
      stockCode: code,
      stockName: quote.name,
      date: new Date().toISOString().slice(0, 10),
      industryScore,
      companyScore,
      capitalScore,
      momentumScore,
      eventScore,
      totalScore,
      rank: 0,
    };

    return NextResponse.json({
      success: true,
      data: score,
      updatedAt: new Date().toISOString(),
    } as ApiResponse<IASScore>);

  } catch (err: any) {
    console.error('[stock/score] 未知错误:', err);
    return NextResponse.json({
      success: false,
      data: null,
      error: err.message || '服务器错误',
      updatedAt: new Date().toISOString(),
    } as ApiResponse<null>, { status: 500 });
  }
}

function calcCompanyScore(quote: any, financials: any[]): number {
  let score = 50;
  if (quote.pe > 0 && quote.pe < 15) score += 15;
  else if (quote.pe >= 15 && quote.pe < 30) score += 5;
  else if (quote.pe >= 50) score -= 10;
  if (quote.pb > 0 && quote.pb < 1.5) score += 10;
  else if (quote.pb >= 5) score -= 5;
  if (financials.length >= 2) {
    try {
      const latest = financials[0];
      const prev = financials[1];
      const pc = parseFloat(String(latest['净利润'] || '0').replace(/,/g, ''));
      const pp = parseFloat(String(prev['净利润'] || '0').replace(/,/g, ''));
      if (pc > 0 && pp > 0) {
        const growth = (pc - pp) / pp;
        if (growth > 0.2) score += 15;
        else if (growth > 0) score += 5;
        else score -= 5;
      }
    } catch { /* ignore */ }
  }
  return Math.max(0, Math.min(100, score));
}

function calcCapitalScore(fundFlow: any): number {
  let score = 50;
  if (fundFlow.mainRatio > 5) score += 20;
  else if (fundFlow.mainRatio > 0) score += 8;
  else if (fundFlow.mainRatio < -5) score -= 15;
  else score -= 5;
  return Math.max(0, Math.min(100, score));
}

function calcMomentumScore(quote: any): number {
  let score = 50;
  if (quote.changePct > 3) score += 15;
  else if (quote.changePct > 0) score += 5;
  else if (quote.changePct < -3) score -= 15;
  else score -= 5;
  if (quote.turnover > 1 && quote.turnover < 5) score += 10;
  else if (quote.turnover > 10) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function calcEventScore(news: any[]): number {
  if (!news.length) return 50;
  const recent = news.filter((n: any) => {
    try { return Date.now() - new Date(n.time).getTime() < 7 * 86400000; } catch { return false; }
  });
  return 50 + Math.min(recent.length * 3, 20);
}
