"use client";

import { useState } from "react";
import { getSsWorkers, type SsWorker } from "@/lib/api";
import {
  MetricCard,
  MetricGrid,
  SaPage,
  SaPanel,
  SaTable,
  StatusBadge,
  type SaColumn,
} from "@/app/portal/dashboard/sa/_components/SaPage";
import { useSsResource } from "../_components/useSsResource";

const columns: SaColumn<SsWorker>[] = [
  { key: "id", label: "Worker ID", render: (row) => row.id },
  { key: "name", label: "Name", render: (row) => row.name },
  { key: "skill", label: "Skill", render: (row) => row.skill },
  { key: "rate", label: "Hourly Rate", render: (row) => `₱ ${row.rate.toFixed(2)}` },
  { key: "contact", label: "Contact", render: (row) => row.contact ?? "-" },
  { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
];

export default function WorkerRosterPage() {
  const { data, loading, error } = useSsResource(getSsWorkers);
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("all");

  const workers = data?.data ?? [];
  const skills = Array.from(new Set(workers.map((row) => row.skill))).sort();
  const q = query.trim().toLowerCase();
  const rows = workers.filter((row) => {
    const matchesSkill = skill === "all" || row.skill === skill;
    const matchesQuery =
      q === "" || [row.id, row.name, row.skill, row.contact ?? ""].some((value) => value.toLowerCase().includes(q));
    return matchesSkill && matchesQuery;
  });

  return (
    <SaPage kicker="System Supervisor" title="Worker Roster" subtitle="View-only list of workers assigned to your site.">
      <MetricGrid>
        <MetricCard label="Total Workers" value={String(data?.metrics.total ?? 0)} note="On this site" />
        <MetricCard label="Active" value={String(data?.metrics.active ?? 0)} note="Currently reporting" />
        <MetricCard label="Inactive" value={String(data?.metrics.inactive ?? 0)} note="Not on site" />
        <MetricCard label="Skills" value={String(data?.metrics.skills ?? 0)} note="Distinct trades" />
      </MetricGrid>

      <SaPanel
        title="Roster"
        filters={
          <>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workers..." />
            <select value={skill} onChange={(event) => setSkill(event.target.value)}>
              <option value="all">All skills</option>
              {skills.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </>
        }
      >
        <SaTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyText="No workers match the current filters."
        />
      </SaPanel>
    </SaPage>
  );
}
