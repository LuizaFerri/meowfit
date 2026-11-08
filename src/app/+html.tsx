import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { ReactNode } from 'react';

const background = `
html, body { background-color: #F6F1FB; }
@media (prefers-color-scheme: dark) {
  html, body { background-color: #16121E; }
}
body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
`;

export default function Root({ children }: { children: ReactNode }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html lang="pt-BR" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <meta name="application-name" content="MeowFit" />
        <meta name="apple-mobile-web-app-title" content="MeowFit" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F6F1FB" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#16121E" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: background }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
