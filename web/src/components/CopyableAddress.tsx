'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatAddress } from '@/lib/utils';

interface CopyableAddressProps {
  address: string;
  chars?: number;
  className?: string;
  showCopyIcon?: boolean;
}

export default function CopyableAddress({
  address,
  chars = 4,
  className = '',
  showCopyIcon = true,
}: CopyableAddressProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied to clipboard!');

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 font-mono text-sm hover:text-primary-600 transition-colors ${className}`}
      title="Click to copy full address"
    >
      <span>{formatAddress(address, chars)}</span>
      {showCopyIcon && (
        <svg
          className={`h-4 w-4 transition-all ${copied ? 'text-green-600' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {copied ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          )}
        </svg>
      )}
    </button>
  );
}
