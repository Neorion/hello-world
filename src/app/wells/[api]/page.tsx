"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { ProductionTable } from "@/components/ProductionTable";

interface Permit {
  id: number;
  permitNumber: string | null;
  permitType: string;
  status: string;
  issuedDate: string | null;
  expiresDate: string | null;
  approvedDate: string | null;
  notes: string | null;
}

interface ProductionRow {
  reportMonth: string;
  oilBbl: number;
  gasMcf: number;
  waterBbl: number;
  daysProduced: number | null;
}

interface WellDetail {
  id: number;
  apiNumber: string;
  wellName: string;
  status: string;
  wellType: string;
  operator: {
    id: number;
    name: string;
    phone: string | null;
    address: string | null;
  };
  county: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  spudDate: string | null;
  completionDate: string | null;
  totalDepth: number | null;
  formation: string | null;
  section: string | null;
  township: string | null;
  range: string | null;
  permits: Permit[];
  production: ProductionRow[];
}

interface Watchlist {
  id: number;
  name: string;
}

const PERMIT_TYPE_LABEL: Record<string, string> = {
  ORIGINAL: "Original",
  REENTRY: "Re-entry",
  DEEPENING: "Deepening",
  EXTENSION: "Extension",
  AMENDMENT: "Amendment",
  PLUGGING: "Plugging",
};

export default function WellDetailPage() {
  const params = useParams();
  const api = decodeURIComponent(params.api as string);
  const [well, setWell] = useState<WellDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeTab, setActiveTab] = useState<"permits" | "production">("permits");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/wells/${encodeURIComponent(api)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setWell)
      .catch(() => setError("Well not found"))
      .finally(() => setLoading(false));

    fetch("/api/watchlists")
      .then((r) => r.json())
      .then(setWatchlists)
      .catch(() => {});
  }, [api]);

  const handleAddToWatchlist = async (watchlistId: number) => {
    if (!well) return;
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/wells`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wellId: well.id }),
      });
      if (res.ok) {
        showToast("Added to watchlist");
      } else {
        const data = await res.json();
        showToast(data.error ?? "Failed");
      }
    } catch {
      showToast("Failed to add");
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleExportProduction = () => {
    if (!well) return;
    window.location.href = `/api/export?type=production&wellId=${well.id}`;
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-4xl mb-3">⛽</div>
        <div>Loading well data...</div>
      </div>
    );
  }

  if (error || !well) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-500 mb-4">{error ?? "Well not found"}</div>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </Link>

      {/* Well header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{well.wellName}</h1>
              <StatusBadge status={well.status} />
            </div>
            <div className="font-mono text-sm text-gray-500 mb-3">{well.apiNumber}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500">Operator</span>
                <div className="font-medium text-gray-800">{well.operator.name}</div>
              </div>
              <div>
                <span className="text-gray-500">County</span>
                <div className="font-medium text-gray-800">
                  {well.county}, {well.state}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Well Type</span>
                <div className="font-medium text-gray-800">
                  {well.wellType.replace(/_/g, " ")}
                </div>
              </div>
              {well.spudDate && (
                <div>
                  <span className="text-gray-500">Spud Date</span>
                  <div className="font-medium text-gray-800">{well.spudDate}</div>
                </div>
              )}
              {well.completionDate && (
                <div>
                  <span className="text-gray-500">Completion</span>
                  <div className="font-medium text-gray-800">{well.completionDate}</div>
                </div>
              )}
              {well.totalDepth && (
                <div>
                  <span className="text-gray-500">Total Depth</span>
                  <div className="font-medium text-gray-800">
                    {well.totalDepth.toLocaleString()} ft
                  </div>
                </div>
              )}
              {well.formation && (
                <div>
                  <span className="text-gray-500">Formation</span>
                  <div className="font-medium text-gray-800">{well.formation}</div>
                </div>
              )}
              {well.latitude && well.longitude && (
                <div>
                  <span className="text-gray-500">Coordinates</span>
                  <div className="font-mono text-xs text-gray-700">
                    {Number(well.latitude).toFixed(5)}, {Number(well.longitude).toFixed(5)}
                  </div>
                </div>
              )}
              {(well.section || well.township || well.range) && (
                <div>
                  <span className="text-gray-500">Legal</span>
                  <div className="font-medium text-gray-800 text-xs">
                    Sec {well.section} T{well.township} R{well.range}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Watchlist button */}
          <div className="flex-shrink-0">
            {watchlists.length > 0 ? (
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddToWatchlist(parseInt(e.target.value));
                    e.target.value = "";
                  }
                }}
              >
                <option value="">+ Add to watchlist</option>
                {watchlists.map((wl) => (
                  <option key={wl.id} value={wl.id}>
                    {wl.name}
                  </option>
                ))}
              </select>
            ) : (
              <Link
                href="/watchlists"
                className="inline-flex items-center gap-1.5 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:border-blue-400 text-gray-600"
              >
                + Create watchlist
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Permits | Production */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("permits")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "permits"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Permits ({well.permits.length})
          </button>
          <button
            onClick={() => setActiveTab("production")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "production"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Production ({well.production.length} months)
          </button>
          {activeTab === "production" && well.production.length > 0 && (
            <div className="ml-auto px-4 flex items-center">
              <button
                onClick={handleExportProduction}
                className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {activeTab === "permits" && (
            <PermitTimeline permits={well.permits} />
          )}
          {activeTab === "production" && (
            <ProductionTable rows={well.production} />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function PermitTimeline({ permits }: { permits: Permit[] }) {
  if (permits.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No permit records found.
      </div>
    );
  }

  const PERMIT_STATUS_COLORS: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-800",
    ISSUED: "bg-blue-100 text-blue-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    EXPIRED: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-800",
    REVOKED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-3">
      {permits.map((permit) => (
        <div
          key={permit.id}
          className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 bg-gray-50"
        >
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-2" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-gray-900">
                {PERMIT_TYPE_LABEL[permit.permitType] ?? permit.permitType}
              </span>
              {permit.permitNumber && (
                <span className="text-xs font-mono text-gray-500">
                  #{permit.permitNumber}
                </span>
              )}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  PERMIT_STATUS_COLORS[permit.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {permit.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
              {permit.issuedDate && <span>Issued: {permit.issuedDate}</span>}
              {permit.approvedDate && <span>Approved: {permit.approvedDate}</span>}
              {permit.expiresDate && <span>Expires: {permit.expiresDate}</span>}
            </div>
            {permit.notes && (
              <div className="mt-1 text-xs text-gray-600">{permit.notes}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
