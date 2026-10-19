"use client";

import { listPmProjects, type PmProject } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function ActiveProjectsPage() {
  const { data, loading, error } = useApiData(listPmProjects);
  const rows = (data ?? []).filter((project) => project.status !== "Completed");

  const columns: SaColumn<PmProject>[] = [
    { key: "name", label: "Project", render: (row) => row.project_name },
    { key: "location", label: "Location", render: (row) => row.location ?? "-" },
    { key: "end", label: "Target End", render: (row) => row.end_date ?? "-" },
    { key: "workers", label: "Workers", render: (row) => row.worker_count },
    { key: "remaining", label: "Remaining", render: (row) => money(row.remaining_budget) },
    { key: "progress", label: "Progress", render: (row) => `${row.progress}%` },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="My Projects" title="Active Projects" subtitle="Projects currently in progress">
      <SaPanel title={`Active (${rows.length})`}>
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No active projects." rowKey={(row) => row.project_id} />
      </SaPanel>
    </SaPage>
  );
}