"use client";

import { getPmCostReport } from "@/lib/api";
import { SaPage, SaPanel, SaTable, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";
import { KpiStrip, BarChart } from "@/app/portal/dashboard/pm/_components/PmReport";

type CostRow = { category: string; actual: number; share: number };

export default function CostReportsPage() {
  const { data, loading, error } = useApiData(getPmCostReport);
  const totals = data?.totals;
  const totalActual = totals?.actual ?? 0;

  const rows: CostRow[] = (data?.categories ?? []).map((category) => ({
    category: category.category,
    actual: category.actual,
    share: totalActual > 0 ? Math.round((category.actual / totalActual) * 100) : 0,
  }));

  const columns: SaColumn<CostRow>[] = [
    { key: "category", label: "Cost Category", render: (row) => row.category },
    { key: "actual", label: "Actual Cost", render: (row) => money(row.actual) },
    { key: "share", label: "Share of Total", render: (row) => `${row.share}%` },
  ];

  return (
    <SaPage kicker="Finance" title="Cost Reports" subtitle="Actual cost by category against your project budgets">
      <SaPanel title="Cost Summary">
        {loading ? (
          <p style={{ color: "#64748b" }}>Loading...</p>
        ) : error ? (
          <p style={{ color: "#b91c1c" }}>{error}</p>
        ) : (
          <>
            <KpiStrip items={[
              { label: "Approved Budget", value: money(totals?.approved ?? 0) },
              { label: "Actual Cost", value: money(totals?.actual ?? 0) },
              { label: "Remaining", value: money(totals?.remaining ?? 0) },
              { label: "Variance", value: money(totals?.variance ?? 0), tone: (totals?.variance ?? 0) >= 0 ? "positive" : "negative" },
              { label: "Utilization", value: `${totals?.utilization ?? 0}%` },
            ]} />
            <div style={{ paddingTop: "1.5rem" }}>
              <BarChart data={rows.map((row) => ({ label: row.category, value: row.actual }))} />
            </div>
          </>
        )}
      </SaPanel>
      <SaPanel title="Cost by Category">
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No cost data." rowKey={(row) => row.category} />
      </SaPanel>
    </SaPage>
  );
}