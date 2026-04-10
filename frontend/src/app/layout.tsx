import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { LanguageProvider } from '@/hooks/useLanguage';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { HydrationReveal } from '@/components/ui/HydrationReveal';

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
        <style dangerouslySetInnerHTML={{ __html: `html.no-fouc body{opacity:0}body{transition:opacity .15s ease}` }} />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('firmyx-theme');
            var d = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (d) document.documentElement.classList.add('dark');
            var l = localStorage.getItem('firmyx-language');
            if (l === 'bg') document.documentElement.lang = 'bg';
          } catch(e) {}
          document.documentElement.classList.add('no-fouc');
          window.addEventListener('beforeinstallprompt', function(e) { e.preventDefault(); });
        `}} />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900 antialiased">
        <ErrorBoundary>
          <ThemeProvider>
            <LanguageProvider>
              <ToastProvider>
                <AuthProvider>
                  <HydrationReveal />
                  {children}
                </AuthProvider>
              </ToastProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
