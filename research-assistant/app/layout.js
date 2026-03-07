import Link from 'next/link';

export const metadata = {
  title: 'Personal Research Assistant',
  description: '智能物联科研助手',
};

const navs = [
  ['首页', '/'],
  ['指挥台', '/dashboard'],
  ['文献库', '/papers'],
  ['搜索', '/search'],
  ['实验', '/experiments'],
  ['日报', '/reports/daily'],
  ['周报', '/reports/weekly'],
];

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#f6f7fb', color: '#111' }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', borderBottom: '1px solid #eaecef' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <strong>个人研究助手</strong>
            <nav style={{ display: 'flex', gap: 14, fontSize: 14 }}>
              {navs.map(([name, href]) => (
                <Link key={href} href={href} style={{ color: '#2563eb', textDecoration: 'none' }}>{name}</Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
