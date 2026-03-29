import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { LanguageProvider } from '@/hooks/useLanguage';

export const metadata: Metadata = {
  title: 'Firmyx — Financial Risk Detection',
  description:
    'Detect financial risk and prevent bankruptcy early with Firmyx.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('firmyx-theme');
            const d = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (d) document.documentElement.classList.add('dark');
            var l = localStorage.getItem('firmyx-language');
            if (l === 'bg') document.documentElement.lang = 'bg';
          } catch(e) {}
        `}} />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>{children}</AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
