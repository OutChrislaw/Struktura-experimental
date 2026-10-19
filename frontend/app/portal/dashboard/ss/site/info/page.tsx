"use client";

import { getSsSiteInfo } from "@/lib/api";
import { SaPage, SaPanel } from "@/app/portal/dashboard/sa/_components/SaPage";
import { useSsResource } from "../../_components/useSsResource";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>{label}</div>
      <div style={{ marginTop: "0.25rem", fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

const notes = [
  "All material deliveries must be recorded on the day they arrive.",
  "Labor hours must be submitted before the end of each shift.",
  "Report equipment breakdowns to the Project Manager immediately.",
  "Keep the site access log updated for every visitor.",
];

export default function SsSiteInfoPage() {
  const { data, loading, error } = useSsResource(getSsSiteInfo);
  const site = data?.site ?? null;

  return (
    <SaPage kicker="System Supervisor" title="Site Information" subtitle="Reference details for your assigned project.">
      <SaPanel title="Project details">
        {site ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1.25rem 2rem" }}>
            <Row label="Project" value={site.project} />
            <Row label="Project Code" value={site.code} />
            <Row label="Client" value={site.client ?? "-"} />
            <Row label="Location" value={site.location ?? "-"} />
            <Row label="Site Supervisor" value={site.supervisor || "-"} />
            <Row label="Project Manager" value={site.manager || "-"} />
            <Row label="Start Date" value={site.startDate ?? "-"} />
            <Row label="Target Completion" value={site.endDate ?? "-"} />
            <Row label="Current Phase" value={site.currentPhase ?? "Not started"} />
            <Row
              label="Coordinates"
              value={
                site.coordinates.lat !== null && site.coordinates.lng !== null
                  ? `${site.coordinates.lat}, ${site.coordinates.lng}`
                  : "Not set"
              }
            />
          </div>
        ) : (
          <p style={{ margin: 0, color: loading ? "#64748b" : "#b91c1c", fontSize: "0.86rem" }}>
            {loading ? "Loading site information..." : error !== "" ? error : "No project is assigned to this account yet."}
          </p>
        )}
      </SaPanel>

      <SaPanel title="Site notes">
        <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.6rem", fontSize: "0.86rem", color: "#334155" }}>
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </SaPanel>

      <SaPanel title="Access limitations">
        <p style={{ margin: 0, fontSize: "0.86rem", color: "#334155" }}>
          As a System Supervisor you can record daily labor, material, and equipment usage for this site. Budgets, master
          records, and system configuration are read-only and managed by the System Administrator and Project Manager.
        </p>
      </SaPanel>
    </SaPage>
  );
}
