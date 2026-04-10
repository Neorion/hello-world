"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WellsTable, WellRow } from "@/components/WellsTable";

interface SearchResult {
  wells: WellRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Watchlist {
  id: number;
  name: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load watchlists on mount
  useEffect(() => {
    fetch("/api/watchlists")
      .then((r) => r.json())
      .then((data) => setWatchlists(data))
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (q: string, st: string, sts: string, pg: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (st) params.set("state", st);
        if (sts) params.set("status", sts);
        params.set("page", String(pg));
        params.set("pageSize", "25");

        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        setResults(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query, stateFilter, statusFilter, 1);
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, stateFilter, statusFilter, doSearch]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    doSearch(query, stateFilter, statusFilter, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddToWatchlist = async (wellId: number, watchlistId: number) => {
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/wells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wellId }),
      });
      if (res.ok) {
        showToast("Well added to watchlist");
      } else {
        const data = await res.json();
        showToast(data.error ?? "Failed to add well");
      }
    } catch {
      showToast("Failed to add well");
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
    const params = new URLSearchParams({ type: "wells" });
    if (query) params.set("q", query);
    if (stateFilter) params.set("state", stateFilter);
    if (statusFilter) params.set("status", statusFilter);
    window.location.href = `/api/export?${params}`;
  };

  return (
    <div className="space-y-6">
      {/* Hero search bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">
          Search Wells, Permits &amp; Production
        </h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="API number, well name, operator, or county..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="sm:w-28 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All States</option>
            <option value="TX">Texas</option>
            <option value="ND">North Dakota</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sm:w-36 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PERMITTED">Permitted</option>
            <option value="DRILLING">Drilling</option>
            <option value="COMPLETED">Completed</option>
            <option value="PRODUCING">Producing</option>
            <option value="SHUT_IN">Shut In</option>
            <option value="ABANDONED">Abandoned</option>
            <option value="PLUGGED">Plugged</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">
            {loading ? (
              <span className="text-gray-400">Searching...</span>
            ) : results ? (
              <span>
                <strong>{results.total.toLocaleString()}</strong> wells found
                {results.totalPages > 1 && (
                  <span className="text-gray-400 ml-1">
                    (page {results.page} of {results.totalPages})
                  </span>
                )}
              </span>
            ) : null}
          </div>
          {results && results.total > 0 && (
            <button
              onClick={handleExport}
              className="text-xs flex items-center gap-1.5 text-gray-600 hover:text-blue-600 border border-gray-200 rounded px-3 py-1.5 hover:border-blue-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          )}
        </div>

        {loading && !results && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">⛽</div>
            <div>Loading wells...</div>
          </div>
        )}

        {results && (
          <WellsTable
            wells={results.wells}
            watchlists={watchlists}
            onAddToWatchlist={handleAddToWatchlist}
            showAddButton
          />
        )}

        {/* Pagination */}
        {results && results.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              {page} / {results.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= results.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
