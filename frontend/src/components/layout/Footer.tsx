import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-4 px-6">
      <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>&copy; {new Date().getFullYear()} Firmyx. All rights reserved.</span>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Terms of Service
          </Link>
          <Link href="/cookies" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Cookie Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
