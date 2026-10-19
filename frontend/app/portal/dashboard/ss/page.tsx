"use client";

import { getSsDashboard, type SsSubmission } from "@/lib/api";
import {
  MetricCard,
  MetricGrid,
  SaPage,
  SaPanel,
  SaTable,
  StatusBadge,
  type SaColumn,
} from "@/app/portal/dashboard/sa/_components/SaPage";
import { BarChart, ProgressBar } from "./_components/SsReport";
import { useSsResource } from "./_components/useSsResource";

const submissionColumns: SaColumn<SsSubmission>[] = [
  { key: "date", label: "Date", render: (row) => row.date },
  { key: "labor", label: "Labor (hrs)", render: (row) => row.labor.toFixed(1) },
  { key: "materials", label: "Material Entries", render: (row) => String(row.materials) },
  { key: "equipment", label: "Equipment (hrs)", render: (row) => row.equipment.toFixed(1) },
  { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
];

export default function SiteSupervisorOverview() {
  const { data, loading, error } = useSsResource(getSsDashboard);
  const site = data?.site ?? null;
  const metrics = data?.metrics;

  return (
    <SaPage
      kicker="System Supervisor"
      title="Site Overview"
      subtitle="Record daily site data and monitor your assigned project."
    >
      {loading ? (
        <SaPanel title="Loading">
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>Loading live site data...</p>
        </SaPanel>
      ) : null}

      {error !== "" ? (
        <SaPanel title="Could not load">
          <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.86rem" }}>{error}</p>
        </SaPanel>
      ) : null}

      {!loading && error === "" && !site ? (
        <SaPanel title="No site assigned">
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>
            No project is assigned to this account yet. Ask an Admin to set the site supervisor for a project.
          </p>
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
              {site.location ?? "-"} &middot; Client: {site.client ?? "-"} &middot; Supervisor: {site.supervisor || "-"}
            </p>
            <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "#93c5fd" }}>
              Current phase: {site.currentPhase ?? "Not started"} &middot; {site.startDate ?? "-"} to {site.endDate ?? "-"}
            </p>
          </section>

          <MetricGrid>
            <MetricCard label="Labor Hours Today" value={`${metrics?.labor_hours_today ?? 0} hrs`} note={`As of ${data?.server_date}`} />
            <MetricCard label="Material Entries Today" value={String(metrics?.material_entries_today ?? 0)} note="Usage lines recorded" />
            <MetricCard label="Equipment Hours Today" value={`${metrics?.equipment_hours_today ?? 0} hrs`} note="Machine hours logged" />
            <MetricCard label="Active Phases" value={String(metrics?.active_phases ?? 0)} note={`${metrics?.total_phases ?? 0} phases total`} />
          </MetricGrid>

          <SaPanel title="Labor hours - last 7 days">
            <BarChart data={data?.labor_series ?? []} />
          </SaPanel>

          <SaPanel title="Phase progress">
            <div style={{ display: "grid", gap: "1rem" }}>
              {(data?.phases ?? []).map((phase) => (
                <div key={phase.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.4rem" }}>
                    <strong style={{ fontSize: "0.86rem", color: "#0f172a" }}>
                      {phase.sequence}. {phase.name}
                    </strong>
                    <StatusBadge status={phase.status} />
                  </div>
                  <ProgressBar value={phase.progress} />
                </div>
              ))}
            </div>
          </SaPanel>

          <SaPanel title="Recent daily submissions">
            <SaTable
              columns={submissionColumns}
              rows={data?.submissions ?? []}
              rowKey={(row) => row.date}
              emptyText="No activity logged in the last 7 days."
            />
          </SaPanel>
        </>
      ) : null}
    </SaPage>
  );
}
