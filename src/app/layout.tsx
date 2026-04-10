import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "WellWire Lite",
  description: "Oil & gas well search, watchlists, and alerts for small operators and mineral owners",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 font-sans">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 hover:text-blue-700">
                  <span className="text-blue-600 text-xl">⛽</span>
                  <span>WellWire</span>
                  <span className="text-xs font-normal text-gray-400 ml-0.5">Lite</span>
                </Link>
                <nav className="hidden sm:flex items-center gap-4 text-sm">
                  <Link
                    href="/"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Search
                  </Link>
                  <Link
                    href="/watchlists"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Watchlists
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  Demo Mode
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
          WellWire Lite — Data: Texas RRC &amp; North Dakota NDIC (public datasets)
        </footer>
      </body>
    </html>
  );
}
