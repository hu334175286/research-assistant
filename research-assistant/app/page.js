import Link from 'next/link';

const links = [
  ['Dashboard', '/dashboard'],
  ['Papers', '/papers'],
  ['Experiments', '/experiments'],
  ['Weekly Reports', '/reports/weekly'],
  ['Daily Reports', '/reports/daily'],
];

export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: '40px auto', padding: 24 }}>
      <h1>个人研究助手 V1</h1>
      <p>当前阶段：D1 骨架完成，后续逐步接入真实数据流。</p>
      <ul>
        {links.map(([name, href]) => (
          <li key={href} style={{ margin: '8px 0' }}>
            <Link href={href}>{name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
