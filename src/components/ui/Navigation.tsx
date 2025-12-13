'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UniversalConnectButton } from '@/components/wallet';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-black/80 backdrop-blur-md border-b border-gray-800 py-4 sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-white font-bold text-lg">
            Imperfect Form
          </Link>

          <div className="hidden md:flex space-x-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md ${
                pathname === '/'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              href="/sub-accounts"
              className={`px-3 py-2 rounded-md ${
                pathname === '/sub-accounts'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Sub Accounts
            </Link>
          </div>
        </div>

        <div>
          <UniversalConnectButton size="sm" showProfileWhenConnected={true} />
        </div>
      </div>
    </nav>
  );
}
