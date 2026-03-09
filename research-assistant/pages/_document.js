import { Html, Head, Main, NextScript } from 'next/document';

// Keep a minimal pages-router Document to avoid build-time
// "Cannot find module for page: /_document" in app+pages hybrid projects.
export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
