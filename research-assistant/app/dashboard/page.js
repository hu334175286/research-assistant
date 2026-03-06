export default function DashboardPage() {
  return (
    <main style={{ maxWidth: 1100, margin: '20px auto', padding: 24 }}>
      <h2>研究指挥台</h2>
      <p>今日重点：文献导入、实验记录、日报预览。</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card title="待处理文献" value="0" />
        <Card title="本周实验" value="0" />
        <Card title="周报状态" value="未生成" />
      </div>
    </main>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ color: '#666', fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
