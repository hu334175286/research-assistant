export const metadata = {
  title: 'Personal Research Assistant',
  description: '智能物联科研助手',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#f6f7fb' }}>
        {children}
      </body>
    </html>
  );
}
