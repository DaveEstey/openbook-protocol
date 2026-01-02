'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { formatAddress } from '@/lib/utils';
import SearchBar from './SearchBar';

export default function Navigation() {
  const { publicKey } = useWallet();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center space-x-4 md:space-x-8">
            <Link href="/" className="text-2xl font-bold text-primary-600 whitespace-nowrap">
              OpenBook
            </Link>
            <div className="hidden lg:flex space-x-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
              >
                Discover
              </Link>
              <Link
                href="/campaigns"
                className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
              >
                Campaigns
              </Link>
              {publicKey && (
                <>
                  <Link
                    href="/create/campaign"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                  >
                    Create
                  </Link>
                  <Link
                    href={`/wallet/${publicKey.toBase58()}`}
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                  >
                    Wallet
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 max-w-2xl hidden md:block">
            <SearchBar />
          </div>

          <div className="flex items-center">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
