"use client";

export interface ProductionRow {
  reportMonth: string;
  oilBbl: number;
  gasMcf: number;
  waterBbl: number;
  daysProduced: number | null;
}

export function ProductionTable({ rows }: { rows: ProductionRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No production data available.
      </div>
    );
  }

  const totalOil = rows.reduce((s, r) => s + r.oilBbl, 0);
  const totalGas = rows.reduce((s, r) => s + r.gasMcf, 0);

  return (
    <div>
      <div className="flex gap-6 mb-4 text-sm">
        <div className="bg-green-50 rounded-lg px-4 py-3">
          <div className="text-xs text-green-700 font-medium uppercase tracking-wide">
            Cumulative Oil
          </div>
          <div className="text-xl font-bold text-green-800">
            {totalOil.toLocaleString()} bbl
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-3">
          <div className="text-xs text-blue-700 font-medium uppercase tracking-wide">
            Cumulative Gas
          </div>
          <div className="text-xl font-bold text-blue-800">
            {totalGas.toLocaleString()} mcf
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Month</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Oil (bbl)</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Gas (mcf)</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Water (bbl)</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.reportMonth} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">
                  {row.reportMonth.slice(0, 7)}
                </td>
                <td className="px-4 py-2 text-right text-green-700 font-medium">
                  {row.oilBbl.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right text-blue-700">
                  {row.gasMcf.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right text-gray-500">
                  {row.waterBbl.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right text-gray-500">
                  {row.daysProduced ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
