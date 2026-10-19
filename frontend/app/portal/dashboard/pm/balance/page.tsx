"use client";

import { listPmBalance, type PmBudget } from "@/lib/api";
import { SaPage, SaPanel, SaTable, MetricCard, MetricGrid, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function BalancePage() {
  const { data, loading, error } = useApiData(listPmBalance);
  const rows = data ?? [];

  const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const highUtilization = rows.filter((row) => row.utilization > 80).length;

  const columns: SaColumn<PmBudget>[] = [
    { key: "project", label: "Project", render: (row) => row.project },
    { key: "approved", label: "Approved", render: (row) => money(row.approved) },
    { key: "spent", label: "Spent", render: (row) => money(row.spent) },
    { key: "remaining", label: "Remaining Balance", render: (row) => <strong>{money(row.remaining)}</strong> },
    { key: "bar", label: "Utilization", render: (row) => (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div style={{ flex: 1, height: "8px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
          <span style={{ display: "block", width: `${Math.min(100, row.utilization)}%`, height: "100%", background: row.utilization > 80 ? "#b91c1c" : "#1e3a8a" }} />
        </div>
        <span style={{ fontSize: "0.72rem" }}>{row.utilization}%</span>
      </div>
    ) },
  ];

  return (
    <SaPage kicker="Finance" title="Remaining Balance" subtitle="Budget left after logged costs">
      <MetricGrid>
        <MetricCard label="Remaining" value={money(totalRemaining)} note="Across projects" />
        <MetricCard label="Spent" value={money(totalSpent)} note="Logged costs" />
        <MetricCard label="Projects" value={rows.length} note="In portfolio" />
        <MetricCard label="High Utilization" value={highUtilization} note="Above 80%" />
      </MetricGrid>
      <SaPanel title="Balance by Project">
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No balance data." rowKey={(row) => row.project_id} />
      </SaPanel>
    </SaPage>
  );
}