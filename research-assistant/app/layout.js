import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Personal Research Assistant',
  description: '智能物联科研助手',
};

// 主导航（一级入口）
const mainNavs = [
  ['首页', '/'],
  ['指挥台', '/dashboard'],
  ['文献', '/papers'],
  ['实验', '/experiments'],
  ['数据', '/datasets'],
];

// 下拉菜单分组
const dropdownGroups = [
  {
    label: '报告',
    icon: '📊',
    items: [
      ['日报', '/reports/daily'],
      ['周报', '/reports/weekly'],
    ]
  },
  {
    label: '工具',
    icon: '🛠️',
    items: [
      ['搜索', '/search'],
      ['可视化', '/visual-insights'],
      ['快捷页', '/quick'],
      ['落地清单', '/delivery'],
    ]
  }
];

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 20, borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Logo */}
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ 
                  width: 36, height: 36, borderRadius: 10, 
                  background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20
                }}>
                  🔬
                </div>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>研究助手</span>
              </Link>

              {/* Main Nav */}
              <nav style={{ display: 'flex', gap: 4, fontSize: 14 }}>
                {mainNavs.map(([name, href]) => (
                  <NavLink key={href} href={href}>{name}</NavLink>
                ))}
                
                {/* Dropdown Groups */}
                {dropdownGroups.map((group) => (
                  <DropdownNav key={group.label} group={group} />
                ))}
              </nav>
            </div>

            {/* Right Side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <a 
                  href="/api/papers/auto-fetch?run=1" 
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'var(--primary)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  ⚡ 抓取文献
                </a>
              </div>
              
              {/* System Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="status-dot active"></span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>正常</span>
              </div>
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

function DropdownNav({ group }) {
  return (
    <div className="dropdown" style={{ position: 'relative' }}>
      <button 
        className="dropdown-trigger"
        style={{ 
          padding: '6px 10px 6px 12px', 
          borderRadius: 8,
          color: 'var(--text-secondary)', 
          background: 'transparent',
          border: 'none',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span>{group.icon}</span>
        <span>{group.label}</span>
        <span style={{ fontSize: 10, marginLeft: 2 }}>▼</span>
      </button>
      
      <div 
        className="dropdown-menu"
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          minWidth: 140,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          padding: '6px',
          opacity: 0,
          visibility: 'hidden',
          transform: 'translateY(-8px)',
          transition: 'all 0.2s ease',
          zIndex: 100,
        }}
      >
        {group.items.map(([name, href]) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'block',
              padding: '8px 12px',
              borderRadius: 8,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: 13,
              transition: 'all 0.15s',
            }}
            className="dropdown-item"
          >
            {name}
          </Link>
        ))}
      </div>
    </div>
  );
}
