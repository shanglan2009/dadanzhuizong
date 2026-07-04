# IAS Platform — A股机构Alpha系统 V1.0

> **数据驱动 + 因子计算 + AI评分 + 可视化决策系统**

---

## 🚀 快速启动

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 📦 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 16 + React 19 + TypeScript |
| UI | TailwindCSS 4 |
| 图表 | ECharts 6 |
| 数据 | SWR（自动刷新） |
| 数据源 | 腾讯财经 · 东方财富 push2 · 新浪财报 |

## 📊 页面

| 路由 | 说明 |
|------|------|
| `/` | 仪表盘 — IAS TOP 30 榜单 + 行业热力图 |
| `/stock/600519` | 个股详情 — 5维雷达图 + 资金流 + 财务 |
| `/industry` | 行业分析 — 排名表 + 涨跌对比图 |
| `/fund-flow` | 资金流向 — 主力/大单/中单/小单监控 |

## 🔌 API 路由

| 端点 | 说明 |
|------|------|
| `GET /api/stock/list?count=30` | IAS 排名榜 |
| `GET /api/stock/score?code=600519` | 单股 IAS 评分 |
| `GET /api/industry` | 行业评分 |
| `GET /api/fund?code=600519` | 资金流 |
| `GET /api/ias/rank` | IAS 排名 |

## 🌐 部署

已配置 Vercel 一键部署（`vercel.json`，hkg1 亚太区域）：

1. 在 [vercel.com](https://vercel.com) 导入此仓库
2. Vercel 自动识别 Next.js，零配置
3. 设置自动刷新 Interval 已在 SWR 中（60-300s）

## 📈 数据源优先级

1. **腾讯财经**（HTTP，不封IP）— 实时行情、PE/PB、市值
2. **新浪财经**（HTTP）— 财报三表
3. **东方财富**（HTTP，限流）— 资金流、行业排名

## 🗺️ 路线图

- [x] MVP: Dashboard + 4 页面 + 5 API Route
- [ ] ICS 机构一致性模型
- [ ] AI 财报分析（LLM 层）
- [ ] 回测系统
- [ ] QQ 机器人推送
