"use client";

import { getPmDashboard, type PmProject } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, MetricCard, MetricGrid, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";
import { BarChart } from "@/app/portal/dashboard/pm/_components/PmReport";

export default function ProjectManagerDashboard() {
  const { data, loading, error } = useApiData(getPmDashboard);
  const metrics = data?.metrics;
  const costs = data?.costs;
  const projects = data?.projects ?? [];
  const deadlines = data?.deadlines ?? [];

  const costChart = [
    { label: "Labor", value: costs?.labor ?? 0 },
    { label: "Materials", value: costs?.materials ?? 0 },
    { label: "Equipment", value: costs?.equipment ?? 0 },
  ];

  const projectColumns: SaColumn<PmProject>[] = [
    { key: "name", label: "Project", render: (row) => row.project_name },
    { key: "location", label: "Location", render: (row) => row.location ?? "-" },
    { key: "budget", label: "Approved", render: (row) => money(row.approved_budget) },
    { key: "remaining", label: "Remaining", render: (row) => money(row.remaining_budget) },
    { key: "progress", label: "Progress", render: (row) => `${row.progress}%` },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  const deadlineColumns: SaColumn<PmProject>[] = [
    { key: "name", label: "Project", render: (row) => row.project_name },
    { key: "deadline", label: "Deadline", render: (row) => row.deadline ?? "-" },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="Project Workspace" title="Project Overview" subtitle="Manage your projects, workforce and budgets">
      {error ? <p style={{ color: "#b91c1c", fontSize: "0.82rem" }}>{error}</p> : null}

      <MetricGrid>
        <MetricCard label="My Projects" value={loading ? "..." : metrics?.projects ?? 0} note={`${metrics?.active_projects ?? 0} active`} />
        <MetricCard label="Assigned Workers" value={loading ? "..." : metrics?.assigned_workers ?? 0} note="Across active sites" />
        <MetricCard label="Total Budget" value={loading ? "..." : money(metrics?.approved_budget ?? 0)} note={`${metrics?.utilization ?? 0}% utilized`} />
        <MetricCard label="Open Phases" value={loading ? "..." : metrics?.open_phases ?? 0} note="Needs action" />
      </MetricGrid>

      <SaPanel title="Cost Breakdown">
        <BarChart data={costChart} />
      </SaPanel>

      <SaPanel title="Upcoming Deadlines">
        <SaTable columns={deadlineColumns} rows={deadlines} loading={loading} error={error} emptyText="No deadlines." rowKey={(row) => row.project_id} />
      </SaPanel>

      <SaPanel title="My Projects">
        <SaTable columns={projectColumns} rows={projects} loading={loading} error={error} emptyText="No projects assigned." rowKey={(row) => row.project_id} />
      </SaPanel>
    </SaPage>
  );
}