"use client";

import { useState } from "react";
import { listPmProjects, type PmProject } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, MetricCard, MetricGrid, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function AllProjectsPage() {
  const { data: projects, loading, error } = useApiData(listPmProjects);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const list = projects ?? [];
  const rows = list.filter((project) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || project.project_name.toLowerCase().includes(term) || (project.client_name ?? "").toLowerCase().includes(term) || (project.location ?? "").toLowerCase().includes(term);
    const matchesStatus = status === "all" || project.status === status;
    return matchesSearch && matchesStatus;
  });

  const totalApproved = list.reduce((sum, project) => sum + project.approved_budget, 0);
  const totalRemaining = list.reduce((sum, project) => sum + project.remaining_budget, 0);
  const totalSpent = list.reduce((sum, project) => sum + project.spent_budget, 0);

  const columns: SaColumn<PmProject>[] = [
    { key: "code", label: "Project ID", render: (row) => row.code },
    { key: "name", label: "Project", render: (row) => row.project_name },
    { key: "client", label: "Client", render: (row) => row.client_name ?? "-" },
    { key: "location", label: "Location", render: (row) => row.location ?? "-" },
    { key: "start", label: "Start", render: (row) => row.start_date ?? "-" },
    { key: "end", label: "Target End", render: (row) => row.end_date ?? "-" },
    { key: "phases", label: "Phases", render: (row) => row.phase_count },
    { key: "budget", label: "Approved Budget", render: (row) => money(row.approved_budget) },
    { key: "remaining", label: "Remaining", render: (row) => money(row.remaining_budget) },
    { key: "progress", label: "Progress", render: (row) => `${row.progress}%` },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="My Projects" title="All Projects" subtitle="Projects assigned to you as Project Manager">
      <MetricGrid>
        <MetricCard label="Projects" value={list.length} note="Assigned to you" />
        <MetricCard label="Approved Budget" value={money(totalApproved)} note="Across all projects" />
        <MetricCard label="Spent" value={money(totalSpent)} note="Logged costs" />
        <MetricCard label="Remaining" value={money(totalRemaining)} note="Available budget" />
      </MetricGrid>

      <SaPanel title="Projects" filters={<>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project" />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All Statuses</option>
          <option value="On Track">On Track</option>
          <option value="Delayed">Delayed</option>
          <option value="Completed">Completed</option>
        </select>
      </>}>
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No projects assigned to you." rowKey={(row) => row.project_id} />
      </SaPanel>
    </SaPage>
  );
}