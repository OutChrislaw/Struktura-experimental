"use client";

import { getSsSite, type SsPhase } from "@/lib/api";
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

const phaseColumns: SaColumn<SsPhase>[] = [
  { key: "sequence", label: "#", render: (row) => String(row.sequence) },
  { key: "name", label: "Phase", render: (row) => row.name },
  { key: "start", label: "Planned Start", render: (row) => row.plannedStart ?? "-" },
  { key: "end", label: "Planned End", render: (row) => row.plannedEnd ?? "-" },
  { key: "progress", label: "Progress", render: (row) => <ProgressBar value={row.progress} /> },
  { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
];

export default function SsSitePage() {
  const { data, loading, error } = useSsResource(getSsSite);
  const site = data?.site ?? null;
  const metrics = data?.metrics;

  return (
    <SaPage kicker="System Supervisor" title="My Site" subtitle="Everything about the project you are assigned to.">
      {loading ? (
        <SaPanel title="Loading">
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>Loading site summary...</p>
        </SaPanel>
      ) : null}

      {error !== "" ? (
        <SaPanel title="Could not load">
          <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.86rem" }}>{error}</p>
        </SaPanel>
      ) : null}

      {!loading && error === "" && !site ? (
        <SaPanel title="No site assigned">
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>No project is assigned to this account yet.</p>
        </SaPanel>
      ) : null}

      {site ? (
        <>
          <section
            style={{
              background: "linear-gradient(135deg, #0a1440 0%, #14245c 100%)",
              borderRadius: "10px",
              padding: "1.5rem",
              color: "#ffffff",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#ca8a04" }}>
              Assigned Site
            </p>
            <h2 style={{ margin: "0.35rem 0 0", fontSize: "1.45rem", fontWeight: 800 }}>{site.project}</h2>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "#c7d2fe" }}>
              {site.location ?? "-"} &middot; Client: {site.client ?? "-"}
            </p>
          </section>

          <MetricGrid>
            <MetricCard label="Overall Progress" value={`${metrics?.overall_progress ?? 0}%`} note="Average across phases" />
            <MetricCard label="Phases Complete" value={`${metrics?.completed_phases ?? 0}/${metrics?.total_phases ?? 0}`} note="Completed phases" />
            <MetricCard label="Days Remaining" value={String(metrics?.days_remaining ?? 0)} note={`Until ${site.endDate ?? "-"}`} />
            <MetricCard label="Active Workers" value={String(metrics?.active_workers ?? 0)} note={`${metrics?.total_workers ?? 0} on roster`} />
          </MetricGrid>

          <SaPanel title="Phase timeline">
            <SaTable columns={phaseColumns} rows={data?.phases ?? []} rowKey={(row) => row.id} emptyText="No phases defined yet." />
          </SaPanel>
        </>
      ) : null}
    </SaPage>
  );
}
