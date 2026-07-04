// ============================================================
// QQ 机器人推送服务
// 通过 HTTP API 发送消息 — go-cqhttp / NapCat 兼容
// ============================================================

/** QQ 消息 payload */
interface QQMessage {
  user_id?: string;
  group_id?: string;
  message: string;
  auto_escape?: boolean;
}

const QQ_API_BASE = process.env.QQ_API_BASE_URL || 'http://127.0.0.1:5700';
const QQ_BOT_ID = process.env.QQ_BOT_ID || '1905018758';
// 目标：支持私聊 + 群聊两种模式，通过环境变量配置
const QQ_TARGET_TYPE = process.env.QQ_TARGET_TYPE || 'group'; // 'group' | 'private'
const QQ_TARGET_ID = process.env.QQ_TARGET_ID || '';          // 群号 或 QQ号

/** 发送消息到 QQ（私聊或群聊） */
async function sendQQMessage(message: string): Promise<boolean> {
  if (!process.env.QQ_ENABLE || process.env.QQ_ENABLE === 'false') {
    console.log('[QQ] 推送已禁用（QQ_ENABLE=false）');
    return false;
  }

  const endpoint = QQ_TARGET_TYPE === 'private'
    ? `${QQ_API_BASE}/send_private_msg`
    : `${QQ_API_BASE}/send_group_msg`;

  const payload: QQMessage = {
    message,
    auto_escape: false,
  };

  if (QQ_TARGET_TYPE === 'private') {
    payload.user_id = QQ_TARGET_ID;
  } else {
    payload.group_id = QQ_TARGET_ID;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[QQ] HTTP ${res.status}: ${await res.text()}`);
      return false;
    }

    const data = await res.json();
    if (data.status === 'ok' || data.retcode === 0) {
      console.log('[QQ] 消息发送成功');
      return true;
    }

    console.error(`[QQ] API 错误: ${JSON.stringify(data)}`);
    return false;
  } catch (err) {
    console.error(`[QQ] 发送失败: ${err}`);
    return false;
  }
}

// ===== 推送模板 =====

/** 9:25 盘前推送 — IAS TOP 10 */
export async function pushDailyTop10(stocks: Array<{
  rank: number; name: string; code: string;
  totalScore: number; changePct: number;
}>) {
  const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  const lines = [
    `📊 【IAS 开盘速报】${date} 09:25`,
    ``,
    `🏆 IAS 评分 TOP 10：`,
    ...stocks.map(s => {
      const arrow = s.changePct >= 0 ? '🔴' : '🟢';
      const pct = s.changePct >= 0 ? `+${s.changePct.toFixed(2)}` : s.changePct.toFixed(2);
      return `${s.rank}. ${s.name}(${s.code}) IAS:${s.totalScore} ${arrow}${pct}%`;
    }),
    ``,
    `—— IAS Platform 自动推送`,
  ];

  return sendQQMessage(lines.join('\n'));
}

/** IAS 评分突破阈值 */
export async function pushIASAlert(stock: {
  name: string; code: string; totalScore: number;
  prevScore?: number; reason: string;
}) {
  const change = stock.prevScore
    ? `（较前次${stock.prevScore >= stock.totalScore ? '↓' : '↑'}${Math.abs(stock.totalScore - (stock.prevScore || 0))}）`
    : '';

  const lines = [
    `🚨 【IAS 评分异动】`,
    ``,
    `${stock.name}(${stock.code}) IAS 评分突破 ${stock.totalScore} ${change}`,
    `触发原因：${stock.reason}`,
    `—— IAS Platform 实时监控`,
  ];

  return sendQQMessage(lines.join('\n'));
}

/** 主力资金异动 */
export async function pushFundAlert(stock: {
  name: string; code: string;
  mainNetInflow: number; mainRatio: number;
  direction: 'inflow' | 'outflow';
}) {
  const emoji = stock.direction === 'inflow' ? '🔴 主力大幅流入' : '🟢 主力大幅流出';
  const amount = (Math.abs(stock.mainNetInflow) / 1e8).toFixed(2);

  const lines = [
    `💰 【资金异动】${emoji}`,
    ``,
    `${stock.name}(${stock.code})`,
    `净额：${stock.mainNetInflow >= 0 ? '+' : ''}${amount}亿`,
    `占比：${stock.mainRatio.toFixed(2)}%`,
    `—— IAS Platform 实时监控`,
  ];

  return sendQQMessage(lines.join('\n'));
}

/** 通用推送 */
export async function pushMessage(message: string) {
  return sendQQMessage(message);
}
