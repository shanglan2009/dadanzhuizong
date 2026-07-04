// GET /api/stock/score?code=600519
// 返回单只股票的 IAS 评分及子项

import { NextRequest, NextResponse } from 'next/server';
import { tencentQuote, eastmoneyFundFlow, sinaFinancialReport, eastmoneyStockNews } from '@/lib/data-sources';
import type { ApiResponse, IASScore } from '@/lib/types';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || '600519';

  try {
    const [quotes, fundFlow, financials, news] = await Promise.all([
      tencentQuote([code]),
      eastmoneyFundFlow(code),
      sinaFinancialReport(code, 'lrb', 4),
      eastmoneyStockNews(code, 5),
    ]);

    const quote = quotes[code];
    if (!quote) {
      return NextResponse.json({
        success: false,
        data: null,
        error: `未找到股票 ${code}`,
        updatedAt: new Date().toISOString(),
      } as ApiResponse<null>, { status: 404 });
    }

    // 简单因子计算（MVP 版本）
    const companyScore = calcCompanyScore(quote, financials);
    const capitalScore = calcCapitalScore(fundFlow);
    const momentumScore = calcMomentumScore(quote);
    const industryScore = 50; // 需行业对比，MVP 用默认值
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
    return NextResponse.json({
      success: false,
      data: null,
      error: err.message || '服务器错误',
      updatedAt: new Date().toISOString(),
    } as ApiResponse<null>, { status: 500 });
  }
}

// ===== 评分子函数 =====

function calcCompanyScore(quote: any, financials: any[]): number {
  let score = 50;

  // PE 估值（低 PE 得分高）
  if (quote.pe > 0 && quote.pe < 15) score += 15;
  else if (quote.pe >= 15 && quote.pe < 30) score += 5;
  else if (quote.pe >= 50) score -= 10;

  // PB 估值
  if (quote.pb > 0 && quote.pb < 1.5) score += 10;
  else if (quote.pb >= 5) score -= 5;

  // 从财报提取利润增长率
  if (financials.length >= 2) {
    const latest = financials[0];
    const prev = financials[1];
    const profitCur = parseFloat(String(latest['净利润'] || '0').replace(/,/g, ''));
    const profitPrev = parseFloat(String(prev['净利润'] || '0').replace(/,/g, ''));
    if (profitCur > 0 && profitPrev > 0) {
      const growth = (profitCur - profitPrev) / profitPrev;
      if (growth > 0.2) score += 15;
      else if (growth > 0) score += 5;
      else score -= 5;
    }
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

  // 换手率适中更好
  if (quote.turnover > 1 && quote.turnover < 5) score += 10;
  else if (quote.turnover > 10) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function calcEventScore(news: any[]): number {
  if (news.length === 0) return 50;
  const recentNews = news.filter((n: any) => {
    const d = new Date(n.time);
    const now = new Date();
    return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  });
  return 50 + Math.min(recentNews.length * 3, 20);
}
