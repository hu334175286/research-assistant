import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Personal Research Assistant',
  description: '智能物联科研助手',
};

const navs = [
  ['首页', '/'],
  ['指挥台', '/dashboard'],
  ['文献库', '/papers'],
  ['搜索', '/search'],
  ['可视化', '/visual-insights'],
  ['工具', '/tools'],
  ['数据集', '/datasets'],
  ['实验', '/experiments'],
  ['日报', '/reports/daily'],
  ['周报', '/reports/weekly'],
  ['快捷页', '/quick'],
  ['落地清单', '/delivery'],
];

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 20, borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ 
                  width: 36, height: 36, borderRadius: 10, 
                  background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: 'white', fontWeight: 'bold'
                }}>
                  🔬
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>研究助手</span>
              </Link>
              <nav style={{ display: 'flex', gap: 6, fontSize: 14 }}>
                {navs.map(([name, href]) => (
                  <NavLink key={href} href={href}>{name}</NavLink>
                ))}
              </nav>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="status-dot active"></span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>系统正常</span>
            </div>
          </div>
        </header>
        <main style={{ minHeight: 'calc(100vh - 60px)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, children }) {
  return (
    <Link 
      href={href} 
      style={{ 
        padding: '6px 12px', 
        borderRadius: 8,
        color: 'var(--text-secondary)', 
        textDecoration: 'none',
        fontWeight: 500,
        transition: 'all 0.2s ease',
      }}
      className="nav-link"
    >
      {children}
    </Link>
  );
}
