"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface AlertRule {
  id: number;
  ruleType: string;
  threshold: number | null;
  targetStatus: string | null;
  isActive: boolean;
}

interface WatchlistWell {
  id: number;
  apiNumber: string;
  wellName: string;
  operatorName: string;
  county: string;
  state: string;
  status: string;
  wellType: string;
  addedAt: string;
  latestOilBbl: number | null;
  latestGasMcf: number | null;
  latestProdMonth: string | null;
}

interface AlertItem {
  id: number;
  ruleType: string;
  message: string;
  isRead: boolean;
  triggeredAt: string;
  wellName: string | null;
  apiNumber: string | null;
}

interface WatchlistDetail {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  alertRules: AlertRule[];
  wells: WatchlistWell[];
  alerts: AlertItem[];
}

const RULE_TYPE_LABELS: Record<string, string> = {
  NEW_PERMIT: "New Permit",
  STATUS_CHANGE: "Status Change",
  FIRST_PRODUCTION: "First Production",
  PRODUCTION_THRESHOLD: "Production Threshold",
};

export default function WatchlistDetailPage() {
  const params = useParams();
  const watchlistId = params.id as string;
  const [wl, setWl] = useState<WatchlistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"wells" | "alerts" | "rules">("wells");
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleType, setNewRuleType] = useState("NEW_PERMIT");
  const [newThreshold, setNewThreshold] = useState("");
  const [newTargetStatus, setNewTargetStatus] = useState("PRODUCING");
  const [toast, setToast] = useState<string | null>(null);

  const loadWatchlist = async () => {
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setWl(data);
    } catch {
      setError("Watchlist not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlistId]);

  const handleRemoveWell = async (wellId: number, wellName: string) => {
    if (!confirm(`Remove "${wellName}" from this watchlist?`)) return;
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/wells?wellId=${wellId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWl((prev) =>
          prev
            ? { ...prev, wells: prev.wells.filter((w) => w.id !== wellId) }
            : prev
        );
        showToast("Well removed");
      }
    } catch {
      showToast("Failed to remove well");
    }
  };

  const handleAddRule = async () => {
    try {
      const body: Record<string, unknown> = { ruleType: newRuleType };
      if (newRuleType === "PRODUCTION_THRESHOLD" && newThreshold) {
        body.threshold = parseFloat(newThreshold);
      }
      if (newRuleType === "STATUS_CHANGE") {
        body.targetStatus = newTargetStatus;
      }

      const res = await fetch(`/api/watchlists/${watchlistId}/alert-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowAddRule(false);
        setNewRuleType("NEW_PERMIT");
        setNewThreshold("");
        await loadWatchlist();
        showToast("Alert rule added");
      }
    } catch {
      showToast("Failed to add rule");
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    try {
      const res = await fetch(
        `/api/watchlists/${watchlistId}/alert-rules?ruleId=${ruleId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setWl((prev) =>
          prev
            ? { ...prev, alertRules: prev.alertRules.filter((r) => r.id !== ruleId) }
            : prev
        );
        showToast("Rule deleted");
      }
    } catch {
      showToast("Failed to delete rule");
    }
  };

  const handleMarkAlertsRead = async () => {
    try {
      await fetch(`/api/watchlists/${watchlistId}/alerts`, { method: "PATCH" });
      setWl((prev) =>
        prev
          ? { ...prev, alerts: prev.alerts.map((a) => ({ ...a, isRead: true })) }
          : prev
      );
    } catch {
      showToast("Failed to mark alerts read");
    }
  };

  const handleExportWells = () => {
    window.location.href = `/api/export?type=wells&watchlistId=${watchlistId}`;
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-4xl mb-3">📋</div>
        <div>Loading watchlist...</div>
      </div>
    );
  }

  if (error || !wl) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-500 mb-4">{error ?? "Watchlist not found"}</div>
        <Link href="/watchlists" className="text-blue-600 hover:underline text-sm">
          ← Back to watchlists
        </Link>
      </div>
    );
  }

  const unreadCount = wl.alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/watchlists"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to watchlists
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{wl.name}</h1>
            {wl.description && (
              <div className="text-sm text-gray-500 mt-1">{wl.description}</div>
            )}
            <div className="flex gap-4 mt-3 text-sm">
              <span className="text-gray-500">
                <strong className="text-gray-800">{wl.wells.length}</strong> wells
              </span>
              <span className="text-gray-500">
                <strong className="text-gray-800">{wl.alertRules.length}</strong> alert rules
              </span>
              {unreadCount > 0 && (
                <span className="text-red-600 font-medium">
                  {unreadCount} unread alert{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleExportWells}
            className="text-xs flex items-center gap-1.5 text-gray-600 hover:text-blue-600 border border-gray-200 rounded px-3 py-1.5 hover:border-blue-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("wells")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "wells"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Wells ({wl.wells.length})
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "alerts"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Alerts ({wl.alerts.length})
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "rules"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Alert Rules ({wl.alertRules.length})
          </button>
        </div>

        <div className="p-6">
          {/* Wells Tab */}
          {activeTab === "wells" && (
            <div>
              {wl.wells.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <div className="text-3xl mb-2">⛽</div>
                  <div className="font-medium mb-1">No wells in this watchlist</div>
                  <div className="text-sm">
                    Search for wells and click &quot;Add to watchlist&quot; to track them.
                  </div>
                  <Link
                    href="/"
                    className="mt-3 inline-block text-blue-600 hover:underline text-sm"
                  >
                    → Go to search
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">API Number</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Well Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Operator</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">County</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Latest Oil (bbl)</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Added</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {wl.wells.map((well) => (
                        <tr key={well.id} className="hover:bg-gray-50">
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
                          <td className="px-4 py-3 text-gray-700">
                            {well.county}, {well.state}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={well.status} />
                          </td>
                          <td className="px-4 py-3 text-right text-green-700 font-medium">
                            {well.latestOilBbl !== null
                              ? well.latestOilBbl.toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(well.addedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveWell(well.id, well.wellName)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              title="Remove from watchlist"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">
                  {unreadCount > 0 ? (
                    <span className="text-red-600 font-medium">{unreadCount} unread</span>
                  ) : (
                    "All caught up"
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAlertsRead}
                    className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded px-3 py-1"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {wl.alerts.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No alerts yet. Add alert rules to start receiving notifications.
                </div>
              ) : (
                <div className="space-y-2">
                  {wl.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                        alert.isRead
                          ? "bg-gray-50 border-gray-100"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                        alert.isRead ? "bg-gray-300" : "bg-yellow-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{alert.message}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {RULE_TYPE_LABELS[alert.ruleType] ?? alert.ruleType}
                          </span>
                        </div>
                        {alert.apiNumber && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            <Link
                              href={`/wells/${encodeURIComponent(alert.apiNumber)}`}
                              className="text-blue-600 hover:underline"
                            >
                              {alert.apiNumber}
                            </Link>
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alert Rules Tab */}
          {activeTab === "rules" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Rules apply to all wells in this watchlist.
                </p>
                <button
                  onClick={() => setShowAddRule(true)}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                >
                  + Add Rule
                </button>
              </div>

              {/* Add rule form */}
              {showAddRule && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rule Type</label>
                      <select
                        value={newRuleType}
                        onChange={(e) => setNewRuleType(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="NEW_PERMIT">New Permit</option>
                        <option value="STATUS_CHANGE">Status Change</option>
                        <option value="FIRST_PRODUCTION">First Production</option>
                        <option value="PRODUCTION_THRESHOLD">Production Threshold</option>
                      </select>
                    </div>
                    {newRuleType === "PRODUCTION_THRESHOLD" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Threshold (BOE/month)
                        </label>
                        <input
                          type="number"
                          value={newThreshold}
                          onChange={(e) => setNewThreshold(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    {newRuleType === "STATUS_CHANGE" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Target Status
                        </label>
                        <select
                          value={newTargetStatus}
                          onChange={(e) => setNewTargetStatus(e.target.value)}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="PRODUCING">Producing</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="SHUT_IN">Shut In</option>
                          <option value="ABANDONED">Abandoned</option>
                          <option value="PLUGGED">Plugged</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddRule}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddRule(false)}
                      className="text-gray-600 px-3 py-1.5 rounded text-sm border border-gray-200 hover:border-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {wl.alertRules.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No alert rules. Add a rule to receive notifications.
                </div>
              ) : (
                <div className="space-y-2">
                  {wl.alertRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${rule.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}
                          </div>
                          {rule.threshold && (
                            <div className="text-xs text-gray-500">
                              Threshold: {rule.threshold.toLocaleString()} BOE
                            </div>
                          )}
                          {rule.targetStatus && (
                            <div className="text-xs text-gray-500">
                              Target: {rule.targetStatus}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        title="Delete rule"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
