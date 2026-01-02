'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { search } from '@/lib/api';
import Link from 'next/link';
import { formatAddress } from '@/lib/utils';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await search(query, 'all', 5, 0);
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  const hasCampaigns = results?.campaigns && results.campaigns.length > 0;
  const hasTasks = results?.tasks && results.tasks.length > 0;

  return (
    <div className="relative flex-1 max-w-md" ref={searchRef}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search campaigns and tasks..."
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </div>
        </div>
      </form>

      {/* Dropdown results */}
      {isOpen && results && (hasCampaigns || hasTasks) && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {hasCampaigns && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
                Campaigns
              </div>
              {results.campaigns.map((campaign: any) => (
                <Link
                  key={campaign.pubkey}
                  href={`/campaigns/${campaign.campaign_id}`}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 hover:bg-gray-50 rounded"
                >
                  <div className="font-medium text-gray-900">{campaign.title}</div>
                  <div className="text-xs text-gray-500">{campaign.category}</div>
                </Link>
              ))}
            </div>
          )}

          {hasTasks && (
            <div className="p-2 border-t">
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
                Tasks
              </div>
              {results.tasks.map((task: any) => (
                <Link
                  key={task.pubkey}
                  href={`/tasks/${task.task_id}`}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 hover:bg-gray-50 rounded"
                >
                  <div className="font-medium text-gray-900">{task.title}</div>
                  <div className="text-xs text-gray-500">
                    {task.campaign_title || formatAddress(task.campaign_pubkey)}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {query.length >= 2 && (
            <div className="border-t p-2">
              <button
                onClick={handleSubmit}
                className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-gray-50 rounded"
              >
                View all results for "{query}" →
              </button>
            </div>
          )}
        </div>
      )}

      {isOpen && results && !hasCampaigns && !hasTasks && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-center text-gray-500">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
