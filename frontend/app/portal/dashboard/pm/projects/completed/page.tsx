"use client";

import { listPmProjects, type PmProject } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function CompletedProjectsPage() {
  const { data, loading, error } = useApiData(listPmProjects);
  const rows = (data ?? []).filter((project) => project.status === "Completed");

  const columns: SaColumn<PmProject>[] = [
    { key: "name", label: "Project", render: (row) => row.project_name },
    { key: "client", label: "Client", render: (row) => row.client_name ?? "-" },
    { key: "end", label: "Completed", render: (row) => row.end_date ?? "-" },
    { key: "budget", label: "Approved Budget", render: (row) => money(row.approved_budget) },
    { key: "remaining", label: "Remaining", render: (row) => money(row.remaining_budget) },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="My Projects" title="Completed Projects" subtitle="Projects delivered and closed">
      <SaPanel title={`Completed (${rows.length})`}>
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No completed projects yet." rowKey={(row) => row.project_id} />
      </SaPanel>
    </SaPage>
  );
}