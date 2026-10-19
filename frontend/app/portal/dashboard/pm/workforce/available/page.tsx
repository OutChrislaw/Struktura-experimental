"use client";

import { getPmWorkforce, type PmLaborer } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function AvailableWorkforcePage() {
  const { data, loading, error } = useApiData(getPmWorkforce);
  const rows = data?.available ?? [];
  const skillOf = (id: number) => (data?.skills?.[String(id)] ?? []).join(", ") || "-";

  const columns: SaColumn<PmLaborer>[] = [
    { key: "id", label: "Laborer ID", render: (row) => `LAB-${String(row.laborer_id).padStart(4, "0")}` },
    { key: "name", label: "Name", render: (row) => `${row.first_name} ${row.last_name}` },
    { key: "skills", label: "Skills", render: (row) => skillOf(row.laborer_id) },
    { key: "rate", label: "Hourly Rate", render: (row) => money(row.hourly_rate) },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.employment_status} /> },
  ];

  return (
    <SaPage kicker="Workforce" title="Available Laborers" subtitle="Workers ready to be assigned to a phase">
      <SaPanel title={`Available (${rows.length})`}>
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No available laborers." rowKey={(row) => row.laborer_id} />
      </SaPanel>
    </SaPage>
  );
}