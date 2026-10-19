"use client";

import { useEffect, useState } from "react";
import { getPmSkillMatch, listPmPhases, type PmLaborer } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function SkillMatchPage() {
  const { data: phases } = useApiData(listPmPhases);
  const [phaseId, setPhaseId] = useState("");
  const [result, setResult] = useState<{ required_skill: string | null; data: PmLaborer[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!phaseId && phases && phases.length > 0) {
      setPhaseId(String(phases[0].phase_id));
    }
  }, [phases, phaseId]);

  useEffect(() => {
    if (!phaseId) return;
    let active = true;
    setLoading(true);

    getPmSkillMatch(Number(phaseId))
      .then((response) => {
        if (!active) return;
        setResult({ required_skill: response.required_skill, data: response.data });
        setError("");
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load matches.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [phaseId]);

  const rows = result?.data ?? [];

  const columns: SaColumn<PmLaborer>[] = [
    { key: "id", label: "Laborer ID", render: (row) => `LAB-${String(row.laborer_id).padStart(4, "0")}` },
    { key: "name", label: "Name", render: (row) => `${row.first_name} ${row.last_name}` },
    { key: "rate", label: "Hourly Rate", render: (row) => money(row.hourly_rate) },
    { key: "status", label: "Employment", status: true, render: (row) => <StatusBadge status={row.employment_status} /> },
  ];

  return (
    <SaPage kicker="Workforce" title="Skill Match" subtitle="Qualified laborers for a phase's required skill">
      <SaPanel title="Match Laborers" filters={<select value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>
        {(phases ?? []).map((phase) => <option key={phase.phase_id} value={phase.phase_id}>{phase.project} - {phase.phase_name}</option>)}
      </select>}>
        {result?.required_skill ? <p style={{ margin: "0 0 1rem", color: "#64748b", fontSize: "0.82rem" }}>Required skill: <strong>{result.required_skill}</strong></p> : null}
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No laborers match this phase's required skill." rowKey={(row) => row.laborer_id} />
      </SaPanel>
    </SaPage>
  );
}