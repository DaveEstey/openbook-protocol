import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WalletContextProvider } from '@/contexts/WalletContextProvider';
import { Toaster } from 'react-hot-toast';
import Navigation from '@/components/Navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OpenBook Protocol',
  description: 'Decentralized crowdfunding on Solana - Built by Yetse',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletContextProvider>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="border-t mt-16 py-8 text-center text-gray-600">
              <p>Built by Yetse | For the Community | Judge me by my code 🚀</p>
              <p className="text-sm mt-2">
                Open source | MIT License |{' '}
                <a href="https://github.com" className="text-primary-600 hover:underline">
                  GitHub
                </a>
              </p>
            </footer>
          </div>
          <Toaster position="bottom-right" />
        </WalletContextProvider>
      </body>
    </html>
  );
}
