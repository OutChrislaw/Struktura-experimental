"use client";

import { getSsPhases, type SsPhase } from "@/lib/api";
import {
  MetricCard,
  MetricGrid,
  SaPage,
  SaPanel,
  SaTable,
  StatusBadge,
  type SaColumn,
} from "@/app/portal/dashboard/sa/_components/SaPage";
import { ProgressBar } from "../_components/SsReport";
import { useSsResource } from "../_components/useSsResource";

const columns: SaColumn<SsPhase>[] = [
  { key: "sequence", label: "#", render: (row) => String(row.sequence) },
  { key: "name", label: "Phase", render: (row) => row.name },
  { key: "start", label: "Planned Start", render: (row) => row.plannedStart ?? "-" },
  { key: "end", label: "Planned End", render: (row) => row.plannedEnd ?? "-" },
  { key: "progress", label: "Progress", render: (row) => <ProgressBar value={row.progress} /> },
  { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
];

export default function ActivePhasesPage() {
  const { data, loading, error } = useSsResource(getSsPhases);

  return (
    <SaPage kicker="System Supervisor" title="Active Phases" subtitle="View-only phase status for your assigned site.">
      <MetricGrid>
        <MetricCard label="Total Phases" value={String(data?.metrics.total ?? 0)} note="In the project plan" />
        <MetricCard label="Completed" value={String(data?.metrics.completed ?? 0)} note="Finished phases" />
        <MetricCard label="In Progress" value={String(data?.metrics.in_progress ?? 0)} note="Ongoing phases" />
        <MetricCard label="Average Progress" value={`${data?.metrics.average_progress ?? 0}%`} note="Across all phases" />
      </MetricGrid>

      <SaPanel title="Phase list">
        <SaTable
          columns={columns}
          rows={data?.data ?? []}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyText="No phases defined for this site yet."
        />
      </SaPanel>
    </SaPage>
  );
}
