"use client";

import { listPmBudgets, type PmBudget } from "@/lib/api";
import { SaPage, SaPanel, SaTable, MetricCard, MetricGrid, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function BudgetsPage() {
  const { data, loading, error } = useApiData(listPmBudgets);
  const rows = data ?? [];

  const totalApproved = rows.reduce((sum, row) => sum + row.approved, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0);

  const columns: SaColumn<PmBudget>[] = [
    { key: "project", label: "Project", render: (row) => row.project },
    { key: "approved", label: "Approved", render: (row) => money(row.approved) },
    { key: "spent", label: "Spent", render: (row) => money(row.spent) },
    { key: "remaining", label: "Remaining", render: (row) => money(row.remaining) },
    { key: "utilization", label: "Utilization", render: (row) => `${row.utilization}%` },
  ];

  return (
    <SaPage kicker="Finance" title="Budgets" subtitle="Approved budgets and utilization per project">
      <MetricGrid>
        <MetricCard label="Total Approved" value={money(totalApproved)} note="Across projects" />
        <MetricCard label="Total Spent" value={money(totalSpent)} note="Logged costs" />
        <MetricCard label="Total Remaining" value={money(totalRemaining)} note="Available budget" />
        <MetricCard label="Utilization" value={totalApproved > 0 ? `${Math.round((totalSpent / totalApproved) * 100)}%` : "0%"} note="Overall" />
      </MetricGrid>
      <SaPanel title="Budget by Project">
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No budgets found." rowKey={(row) => row.project_id} />
      </SaPanel>
    </SaPage>
  );
}