'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UniversalConnectButton } from '@/components/wallet';

export default function Navigation() {
  const pathname = usePathname();

  const linkClass = (isActive: boolean) =>
    `px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-white/5 text-teal-200'
        : 'text-studio-muted hover:text-teal-100 hover:bg-white/5'
    }`;

  return (
    <nav
      className="py-4"
      style={{
        background: 'rgba(6, 16, 19, 0.72)',
        borderBottom: '1px solid rgba(139, 227, 212, 0.12)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="font-extrabold tracking-[0.12em] text-sm"
            style={{ color: '#e9fffa' }}
          >
            IMPERFECT FORM
          </Link>

          <div className="hidden md:flex space-x-1">
            <Link href="/" className={linkClass(pathname === '/')}>
              Home
            </Link>
            <Link href="/sub-accounts" className={linkClass(pathname === '/sub-accounts')}>
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
