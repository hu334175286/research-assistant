export const ui = {
  page: {
    maxWidth: 1200,
    margin: '24px auto',
    padding: 24,
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  cardSoft: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 16,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 10,
    fontSize: 18,
  },
  hero: {
    background: 'linear-gradient(135deg, #0f172a, #1d4ed8)',
    color: '#fff',
    borderRadius: 16,
    padding: 18,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  buttonPrimary: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  buttonGhost: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#1e293b',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 14,
    background: '#fff',
  },
  empty: {
    background: '#f8fafc',
    border: '1px dashed #94a3b8',
    borderRadius: 12,
    padding: 14,
    color: '#334155',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: 14,
    color: '#991b1b',
  },
};

export const statusPalette = {
  success: { bg: '#dcfce7', fg: '#166534', border: '#86efac' },
  warning: { bg: '#fef3c7', fg: '#92400e', border: '#fde68a' },
  info: { bg: '#dbeafe', fg: '#1e3a8a', border: '#93c5fd' },
  danger: { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5' },
};

export function statusPill(kind = 'info') {
  const palette = statusPalette[kind] || statusPalette.info;
  return {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    background: palette.bg,
    color: palette.fg,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 700,
  };
}
