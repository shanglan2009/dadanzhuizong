// ============================================================
// 数据源适配器 — 腾讯财经 / 东方财富 / 新浪 直连
// 运行于 Next.js API Routes（server-side Node.js）
// 优先级：腾讯（不封IP）> 新浪 > 东财（限流）
// ============================================================

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ----------- 腾讯财经（首选，不封 IP）-----------

/** 腾讯实时行情 + PE/PB/市值 */
export async function tencentQuote(codes: string[]): Promise<Record<string, TencentQuote>> {
  const symbols = codes.map(c => `sh${c}`.replace(/^sh[03]/, 'sz$&').replace(/^sh(3|0|2)/, 'sz$&').replace(/^sh(8|4)/, 'sz$&')).join(',');
  const url = `https://qt.gtimg.cn/q=${symbols.replace(/sh/g, 'sh').replace(/sz/g, 'sz')}`;

  // 修正：腾讯用 sz 前缀表示深市
  const fixed = codes.map(c => {
    if (c.startsWith('6')) return `sh${c}`;
    if (c.startsWith('8') || c.startsWith('4')) return `bj${c}`;
    return `sz${c}`;
  });

  const res = await fetch(`https://qt.gtimg.cn/q=${fixed.join(',')}`, {
    headers: { 'User-Agent': UA },
    next: { revalidate: 60 },
  });
  const text = await res.text();

  const result: Record<string, TencentQuote> = {};
  const lines = text.split('\n').filter(l => l.includes('v_'));
  for (const line of lines) {
    const match = line.match(/v_(\w+)="(.+)"/);
    if (!match) continue;
    const fields = match[2].split('~');
    const rawCode = match[1];
    const code = rawCode.replace('sz', '').replace('sh', '').replace('bj', '');
    result[code] = {
      name: fields[1] || '',
      code: fields[2] || code,
      price: parseFloat(fields[3]) || 0,
      prevClose: parseFloat(fields[4]) || 0,
      open: parseFloat(fields[5]) || 0,
      volume: parseFloat(fields[6]) || 0,
      changePct: parseFloat(fields[32]) || 0,
      high: parseFloat(fields[33]) || 0,
      low: parseFloat(fields[34]) || 0,
      pe: parseFloat(fields[39]) || 0,
      pb: parseFloat(fields[46]) || 0,
      marketCap: parseFloat(fields[45]) || 0,   // 总市值（亿）
      floatCap: parseFloat(fields[44]) || 0,    // 流通市值（亿）
      turnover: parseFloat(fields[38]) || 0,
      totalShares: parseFloat(fields[36]) || 0,
    };
  }
  return result;
}

interface TencentQuote {
  name: string;
  code: string;
  price: number;
  prevClose: number;
  open: number;
  volume: number;
  changePct: number;
  high: number;
  low: number;
  pe: number;
  pb: number;
  marketCap: number;
  floatCap: number;
  turnover: number;
  totalShares: number;
}

// ----------- 东财 push2（资金流 / 股票信息）-----------

let lastEmCall = 0;
const EM_MIN_INTERVAL = 600; // 600ms 间隔防封

async function emGet(url: string, params: Record<string, string> = {}): Promise<any> {
  const now = Date.now();
  const wait = Math.max(0, EM_MIN_INTERVAL - (now - lastEmCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastEmCall = Date.now();

  const u = new URL(url);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));

  const res = await fetch(u.toString(), {
    headers: { 'User-Agent': UA, 'Referer': 'https://data.eastmoney.com/' },
    next: { revalidate: 120 },
  });
  return res.json();
}

/** 东财资金流（分钟级） */
export async function eastmoneyFundFlow(code: string): Promise<{
  mainNetInflow: number;
  superLarge: number;
  large: number;
  medium: number;
  small: number;
  mainRatio: number;
}> {
  const marketCode = code.startsWith('6') ? 1 : 0;
  const data = await emGet('https://push2.eastmoney.com/api/qt/stock/get', {
    fltt: '2', invt: '2',
    fields: 'f62,f64,f66,f69,f72,f75,f78,f81,f84,f85,f116,f117,f43,f58',
    secid: `${marketCode}.${code}`,
  });

  const d = data?.data || {};
  return {
    mainNetInflow: d.f62 || 0,
    superLarge: d.f64 || 0,
    large: d.f66 || 0,
    medium: d.f69 || 0,
    small: d.f72 || 0,
    mainRatio: d.f184 !== undefined ? d.f184 : 0,
  };
}

/** 东财行业板块排名 */
export async function eastmoneyIndustryRank(): Promise<{
  name: string; code: string; changePct: number;
  upCount: number; downCount: number; fundFlow: number; leadStock: string;
}[]> {
  const data = await emGet('https://push2.eastmoney.com/api/qt/clist/get', {
    pn: '1', pz: '50', po: '1', np: '1',
    fltt: '2', invt: '2', fid: 'f3',
    fields: 'f2,f3,f12,f14,f104,f105,f128,f140,f9',
    fs: 'm:90+t2',  // 行业板块
  });

  return (data?.data?.diff || []).map((d: any) => ({
    name: d.f14 || '',
    code: d.f12 || '',
    changePct: d.f3 || 0,
    upCount: d.f104 || 0,
    downCount: d.f105 || 0,
    fundFlow: d.f128 || 0,
    leadStock: d.f9 || '',
  }));
}

/** 东财龙虎榜 */
export async function eastmoneyDragonTiger(date: string): Promise<{
  code: string; name: string; netBuy: number; buyAmount: number;
  sellAmount: number; reason: string; changePct: number;
}[]> {
  // date = YYYY-MM-DD
  const data = await emGet('https://datacenter-web.eastmoney.com/api/data/v1/get', {
    sortColumns: 'NET_BUY_AMT',
    sortTypes: '-1',
    pageSize: '50',
    pageNumber: '1',
    reportName: 'RPT_DAILYBILLBOARD_DETAILS',
    columns: 'ALL',
    filter: `(TRADE_DATE='${date.replace(/-/g, '/')}')`,
  });

  return (data?.result?.data || []).map((d: any) => ({
    code: d.SECURITY_CODE || '',
    name: d.SECURITY_NAME_ABBR || '',
    netBuy: d.NET_BUY_AMT || 0,
    buyAmount: d.BUY_AMT || 0,
    sellAmount: d.SELL_AMT || 0,
    reason: d.EXPLANATION || '',
    changePct: d.CHANGE_PCT || 0,
  }));
}

// ----------- 新浪（财报三表）-----------

/** 新浪财报 */
export async function sinaFinancialReport(code: string, type: 'fzb' | 'lrb' | 'llb' = 'lrb', num = 8) {
  const prefix = code.startsWith('6') ? 'sh' : 'sz';
  const url = new URL('https://quotes.sina.cn/cn/api/openapi.php/CompanyFinanceService.getFinanceReport2022');
  url.searchParams.set('paperCode', `${prefix}${code}`);
  url.searchParams.set('source', type);
  url.searchParams.set('type', '0');
  url.searchParams.set('page', '1');
  url.searchParams.set('num', String(num));

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA },
    next: { revalidate: 3600 },
  });
  const json = await res.json();
  const reportList = json?.result?.data?.report_list || {};

  const rows: Record<string, any>[] = [];
  for (const period of Object.keys(reportList).sort().reverse().slice(0, num)) {
    const obj = reportList[period];
    const rec: Record<string, any> = { period: `${period.slice(0,4)}-${period.slice(4,6)}-${period.slice(6,8)}` };
    for (const it of obj?.data || []) {
      if (!it.item_title) continue;
      rec[it.item_title] = it.item_value;
      if (it.item_tongbi != null) rec[`${it.item_title}_同比`] = it.item_tongbi;
    }
    rows.push(rec);
  }
  return rows;
}

/** 东财个股新闻 */
export async function eastmoneyStockNews(code: string, limit = 20) {
  const marketCode = code.startsWith('6') ? 1 : 0;
  const url = `https://search-api-web.eastmoney.com/search/jsonp`;

  const res = await fetch(url + '?' + new URLSearchParams({
    cb: 'cb',
    param: JSON.stringify({
      uid: '', keyword: code, type: ['cmsArticleWebOld'],
      client: 'web', clientType: 'web',
      pageIndex: '1', pageSize: String(limit),
    }),
  }), { headers: { 'User-Agent': UA } });
  const text = await res.text();
  const jsonStr = text.replace(/^cb\(/, '').replace(/\)$/, '');
  const data = JSON.parse(jsonStr);
  const articles = data?.result?.cmsArticleWebOld || [];

  return articles.map((a: any) => ({
    title: a.title || '',
    time: a.date || '',
    source: a.mediaName || '东方财富',
    summary: a.summary || '',
    url: a.url || '',
  }));
}
