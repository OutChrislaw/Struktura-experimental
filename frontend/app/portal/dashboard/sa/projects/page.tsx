"use client";

import { getAdminProjects, type ApiProject } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function ProjectsPage() {
  const { data, loading, error } = useApiData(getAdminProjects);

  const columns: SaColumn<ApiProject>[] = [
    { key: "name", label: "Project", render: (row) => row.project_name },
    { key: "client", label: "Client", render: (row) => row.client_name ?? "-" },
    { key: "location", label: "Location", render: (row) => row.location ?? "-" },
    { key: "manager", label: "Manager", render: (row) => row.manager_id ? `${row.manager_id} - ${row.manager_first_name ?? ""} ${row.manager_last_name ?? ""}`.trim() : "-" },
    { key: "phases", label: "Phases", render: (row) => row.phase_count },
    { key: "budget", label: "Approved Budget", render: (row) => money(row.approved_budget) },
    { key: "remaining", label: "Remaining", render: (row) => money(row.remaining_budget) },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="Operations" title="All Projects" subtitle="Every project with its manager, budget and phase count">
      <SaPanel title="Projects">
        <SaTable columns={columns} rows={data ?? []} loading={loading} error={error} rowKey={(row) => row.project_id} />
      </SaPanel>
    </SaPage>
  );
}