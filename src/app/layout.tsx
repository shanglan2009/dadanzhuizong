import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IAS Platform — A股机构Alpha系统',
  description: '数据驱动 + 因子计算 + AI评分 + 可视化决策',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1321] border-b border-[#1f2937] px-6 py-3 flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-[#3b82f6]">IAS</span>
            <span className="text-[#e5e7eb] ml-1">Platform</span>
          </Link>
          <div className="flex gap-4 text-sm">
            <NavLink href="/">📊 仪表盘</NavLink>
            <NavLink href="/stock/600519">🔍 个股</NavLink>
            <NavLink href="/industry">🏭 行业</NavLink>
            <NavLink href="/fund-flow">💰 资金流</NavLink>
          </div>
          <div className="ml-auto text-xs text-[#6b7280] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            实时数据
          </div>
        </nav>
        <main className="pt-16 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[#9ca3af] hover:text-[#e5e7eb] transition-colors px-2 py-1 rounded hover:bg-[#1a2236]"
    >
      {children}
    </Link>
  );
}
