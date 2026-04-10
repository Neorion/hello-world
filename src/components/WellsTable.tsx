"use client";

import Link from "next/link";
import { StatusBadge } from "./StatusBadge";

export interface WellRow {
  id: number;
  apiNumber: string;
  wellName: string;
  operatorName: string;
  county: string;
  state: string;
  status: string;
  wellType: string;
  spudDate: string | null;
}

interface WellsTableProps {
  wells: WellRow[];
  watchlists?: Array<{ id: number; name: string }>;
  onAddToWatchlist?: (wellId: number, watchlistId: number) => void;
  showAddButton?: boolean;
}

export function WellsTable({
  wells,
  watchlists = [],
  onAddToWatchlist,
  showAddButton = false,
}: WellsTableProps) {
  if (wells.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No wells found. Try adjusting your search.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">API Number</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Well Name</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Operator</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">County</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">State</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Spud Date</th>
            {showAddButton && (
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Watchlist</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {wells.map((well) => (
            <tr key={well.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs">
                <Link
                  href={`/wells/${encodeURIComponent(well.apiNumber)}`}
                  className="text-blue-600 hover:underline"
                >
                  {well.apiNumber}
                </Link>
              </td>
              <td className="px-4 py-3 font-medium">
                <Link
                  href={`/wells/${encodeURIComponent(well.apiNumber)}`}
                  className="hover:text-blue-600"
                >
                  {well.wellName}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700">{well.operatorName}</td>
              <td className="px-4 py-3 text-gray-700">{well.county}</td>
              <td className="px-4 py-3 text-gray-500">{well.state}</td>
              <td className="px-4 py-3">
                <StatusBadge status={well.status} />
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{well.spudDate ?? "—"}</td>
              {showAddButton && onAddToWatchlist && (
                <td className="px-4 py-3">
                  <AddToWatchlistDropdown
                    wellId={well.id}
                    watchlists={watchlists}
                    onAdd={onAddToWatchlist}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddToWatchlistDropdown({
  wellId,
  watchlists,
  onAdd,
}: {
  wellId: number;
  watchlists: Array<{ id: number; name: string }>;
  onAdd: (wellId: number, watchlistId: number) => void;
}) {
  if (watchlists.length === 0) {
    return (
      <Link href="/watchlists" className="text-xs text-gray-400 hover:text-blue-600">
        Create watchlist
      </Link>
    );
  }

  return (
    <select
      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:border-blue-300 cursor-pointer"
      defaultValue=""
      onChange={(e) => {
        if (e.target.value) {
          onAdd(wellId, parseInt(e.target.value));
          e.target.value = "";
        }
      }}
    >
      <option value="">+ Add to...</option>
      {watchlists.map((wl) => (
        <option key={wl.id} value={wl.id}>
          {wl.name}
        </option>
      ))}
    </select>
  );
}
