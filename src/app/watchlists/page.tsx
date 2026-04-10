"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertBadge } from "@/components/AlertBadge";

interface Watchlist {
  id: number;
  name: string;
  description: string | null;
  wellCount: number;
  alertRuleCount: number;
  unreadAlerts: number;
  createdAt: string;
}

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const loadWatchlists = async () => {
    try {
      const res = await fetch("/api/watchlists");
      const data = await res.json();
      setWatchlists(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlists();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      });
      if (res.ok) {
        setNewName("");
        setNewDesc("");
        setShowCreate(false);
        await loadWatchlists();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete watchlist "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/watchlists/${id}`, { method: "DELETE" });
    setWatchlists((prev) => prev.filter((wl) => wl.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Watchlists</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track wells and get alerts on new permits, status changes, and production.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Watchlist
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Create Watchlist</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Permian Basin Operators"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewDesc("");
                }}
                className="text-gray-600 px-4 py-2 rounded-lg text-sm border border-gray-200 hover:border-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : watchlists.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-gray-600 font-medium mb-1">No watchlists yet</div>
          <div className="text-sm text-gray-400 mb-4">
            Create a watchlist to track wells and receive alerts.
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Create your first watchlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlists.map((wl) => (
            <WatchlistCard
              key={wl.id}
              watchlist={wl}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({
  watchlist,
  onDelete,
}: {
  watchlist: Watchlist;
  onDelete: (id: number, name: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Link
            href={`/watchlists/${watchlist.id}`}
            className="font-semibold text-gray-900 hover:text-blue-600 truncate block"
          >
            {watchlist.name}
          </Link>
          {watchlist.description && (
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {watchlist.description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {watchlist.unreadAlerts > 0 && (
            <AlertBadge count={watchlist.unreadAlerts} />
          )}
          <button
            onClick={() => onDelete(watchlist.id, watchlist.name)}
            className="text-gray-300 hover:text-red-500 transition-colors p-1"
            title="Delete watchlist"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">{watchlist.wellCount}</div>
          <div className="text-xs text-gray-500">Wells</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">{watchlist.alertRuleCount}</div>
          <div className="text-xs text-gray-500">Rules</div>
        </div>
        {watchlist.unreadAlerts > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{watchlist.unreadAlerts}</div>
            <div className="text-xs text-gray-500">Alerts</div>
          </div>
        )}
      </div>

      <Link
        href={`/watchlists/${watchlist.id}`}
        className="block text-center text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg py-1.5 hover:border-blue-400 transition-colors"
      >
        View Details →
      </Link>
    </div>
  );
}
