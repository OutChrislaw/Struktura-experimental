"use client";

import { getPmWorkforce, type PmLaborer } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function AssignedWorkforcePage() {
  const { data, loading, error } = useApiData(getPmWorkforce);
  const rows = data?.assigned ?? [];

  const columns: SaColumn<PmLaborer>[] = [
    { key: "id", label: "Laborer ID", render: (row) => `LAB-${String(row.laborer_id).padStart(4, "0")}` },
    { key: "name", label: "Name", render: (row) => `${row.first_name} ${row.last_name}` },
    { key: "project", label: "Project", render: (row) => row.project ?? "-" },
    { key: "phase", label: "Phase", render: (row) => row.phase ?? "-" },
    { key: "role", label: "Role on Task", render: (row) => row.role_on_task ?? "-" },
    { key: "rate", label: "Hourly Rate", render: (row) => money(row.hourly_rate) },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="Workforce" title="Assigned Laborers" subtitle="Workers currently deployed to project phases">
      <SaPanel title={`Assigned (${rows.length})`}>
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No assigned laborers." rowKey={(row) => row.assignment_id ?? row.laborer_id} />
      </SaPanel>
    </SaPage>
  );
}