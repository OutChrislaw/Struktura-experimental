"use client";

import { getAdminPhases, type ApiPhase } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function PhasesPage() {
  const { data, loading, error } = useApiData(getAdminPhases);

  const columns: SaColumn<ApiPhase>[] = [
    { key: "project", label: "Project", render: (row) => row.project },
    { key: "phase", label: "Phase", render: (row) => row.project_name ?? "-" },
    { key: "seq", label: "Seq", render: (row) => row.sequence_no ?? "-" },
    { key: "cost", label: "Cost", render: (row) => money(row.project_cost) },
    { key: "start", label: "Planned Start", render: (row) => row.planned_start ?? "-" },
    { key: "end", label: "Planned End", render: (row) => row.planned_end ?? "-" },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="Operations" title="Phases" subtitle="Sequenced stages across all projects">
      <SaPanel title="Project Phases">
        <SaTable columns={columns} rows={data ?? []} loading={loading} error={error} rowKey={(row) => row.phase_id} />
      </SaPanel>
    </SaPage>
  );
}