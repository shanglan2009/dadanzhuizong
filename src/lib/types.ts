// ============================================================
// IAS Platform — 核心类型定义
// ============================================================

/** 股票基础信息 */
export interface StockInfo {
  code: string;
  name: string;
  industry: string;
  marketCap: number;       // 总市值（元）
  floatCap: number;        // 流通市值（元）
  totalShares: number;     // 总股本（股）
  floatShares: number;     // 流通股（股）
  listDate: string;        // 上市日期 YYYYMMDD
  price: number;
  changePct: number;
  pe: number;
  pb: number;
}

/** IAS 评分 */
export interface IASScore {
  stockCode: string;
  stockName: string;
  date: string;
  industryScore: number;    // 行业评分 0-100
  companyScore: number;     // 公司质量评分 0-100
  capitalScore: number;     // 资金面评分 0-100
  momentumScore: number;    // 动量评分 0-100
  eventScore: number;       // 事件驱动评分 0-100
  totalScore: number;       // IAS 综合评分 0-100
  rank: number;             // 排名
}

/** 行业评分 */
export interface IndustryScore {
  industry: string;
  date: string;
  score: number;
  momentum: number;
  valuation: number;
  fundFlow: number;         // 行业资金净流入
  changePct: number;        // 涨跌幅
  upCount: number;          // 上涨家数
  downCount: number;        // 下跌家数
  leadStock: string;        // 领涨股
  leadStockCode: string;
}

/** 资金流数据 */
export interface FundFlow {
  stockCode: string;
  stockName: string;
  date: string;
  mainNetInflow: number;    // 主力净流入（元）
  superLargeInflow: number; // 超大单净流入
  largeInflow: number;      // 大单净流入
  mediumInflow: number;     // 中单净流入
  smallInflow: number;      // 小单净流入
  mainInflowRatio: number;  // 主力净流入占比 %
}

/** 龙虎榜数据 */
export interface DragonTiger {
  stockCode: string;
  stockName: string;
  date: string;
  netBuyAmount: number;     // 净买额
  buyAmount: number;        // 买入总额
  sellAmount: number;       // 卖出总额
  reason: string;           // 上榜原因
  topBuyBrokers: BrokerInfo[];
  topSellBrokers: BrokerInfo[];
}

export interface BrokerInfo {
  name: string;
  type: 'institution' | 'broker' | 'retail';
  buyAmount: number;
  sellAmount: number;
  netAmount: number;
}

/** 新闻 */
export interface NewsItem {
  title: string;
  summary: string;
  time: string;
  source: string;
  url?: string;
}

/** API 响应封装 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  updatedAt: string;
}
