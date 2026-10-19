"use client";

import { useState } from "react";
import { listPmPhases, type PmPhase } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function AllPhasesPage() {
  const { data: phases, loading, error } = useApiData(listPmPhases);
  const [project, setProject] = useState("all");

  const list = phases ?? [];
  const projectNames = Array.from(new Set(list.map((phase) => phase.project)));
  const rows = list.filter((phase) => project === "all" || phase.project === project);

  const columns: SaColumn<PmPhase>[] = [
    { key: "project", label: "Project", render: (row) => row.project },
    { key: "name", label: "Phase", render: (row) => row.phase_name ?? "-" },
    { key: "seq", label: "Seq", render: (row) => row.sequence_no ?? "-" },
    { key: "skill", label: "Required Skill", render: (row) => row.required_skill ?? "-" },
    { key: "cost", label: "Cost", render: (row) => money(row.project_cost) },
    { key: "start", label: "Planned Start", render: (row) => row.planned_start ?? "-" },
    { key: "end", label: "Planned End", render: (row) => row.planned_end ?? "-" },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="Project Phases" title="All Phases" subtitle="Every phase across your projects">
      <SaPanel title="Phases" filters={<select value={project} onChange={(event) => setProject(event.target.value)}>
        <option value="all">All Projects</option>
        {projectNames.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>}>
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No phases yet." rowKey={(row) => row.phase_id} />
      </SaPanel>
    </SaPage>
  );
}