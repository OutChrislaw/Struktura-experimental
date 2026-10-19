"use client";

import { listPmPhases } from "@/lib/api";
import { SaPage, SaPanel, StatusBadge, useApiData } from "@/app/portal/dashboard/sa/_components/SaPage";

function toMs(value: string | null): number {
  if (!value) return 0;
  return new Date(value).getTime();
}

export default function TimelinesPage() {
  const { data, loading, error } = useApiData(listPmPhases);
  const phases = data ?? [];
  const starts = phases.map((phase) => toMs(phase.planned_start)).filter((value) => value > 0);
  const ends = phases.map((phase) => toMs(phase.planned_end)).filter((value) => value > 0);
  const min = starts.length ? Math.min(...starts) : 0;
  const max = ends.length ? Math.max(...ends) : 1;
  const span = Math.max(1, max - min);

  return (
    <SaPage kicker="Project Phases" title="Timelines" subtitle="Planned schedule for every phase">
      <SaPanel title="Phase Schedule">
        {loading ? (
          <p style={{ color: "#64748b" }}>Loading...</p>
        ) : error ? (
          <p style={{ color: "#b91c1c" }}>{error}</p>
        ) : phases.length === 0 ? (
          <p style={{ color: "#64748b" }}>No phases to display.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {phases.map((phase) => {
              const start = toMs(phase.planned_start);
              const end = toMs(phase.planned_end);
              const left = start ? ((start - min) / span) * 100 : 0;
              const width = start && end ? Math.max(2, ((end - start) / span) * 100) : 2;
              const color = phase.status === "Completed" ? "#1e3a8a" : phase.status === "In Progress" ? "#ca8a04" : "#94a3b8";

              return (
                <div key={phase.phase_id} style={{ display: "grid", gridTemplateColumns: "260px 1fr 90px", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#0f172a" }}>{phase.project} - {phase.phase_name}</span>
                  <div style={{ position: "relative", height: "14px", background: "#f1f5f9", borderRadius: "999px" }}>
                    <span style={{ position: "absolute", left: `${left}%`, width: `${width}%`, height: "100%", background: color, borderRadius: "999px" }} />
                  </div>
                  <StatusBadge status={phase.status} />
                </div>
              );
            })}
          </div>
        )}
      </SaPanel>
    </SaPage>
  );
}