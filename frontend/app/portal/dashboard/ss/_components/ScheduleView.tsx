"use client";

import { useState } from "react";
import { getSsSchedule, type SsTask } from "@/lib/api";
import {
  MetricCard,
  MetricGrid,
  SaPage,
  SaPanel,
  SaTable,
  StatusBadge,
  type SaColumn,
} from "@/app/portal/dashboard/sa/_components/SaPage";
import { useSsResource } from "./useSsResource";

const columns: SaColumn<SsTask>[] = [
  { key: "date", label: "Date", render: (row) => row.date },
  { key: "time", label: "Time", render: (row) => row.time || "-" },
  { key: "title", label: "Task", render: (row) => row.title },
  { key: "phase", label: "Phase", render: (row) => row.phase },
  { key: "assignee", label: "Assignee", render: (row) => row.assignee },
  { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
];

export function ScheduleView({
  mode,
  title,
  subtitle,
}: {
  mode: "today" | "week" | "all";
  title: string;
  subtitle: string;
}) {
  const { data, loading, error } = useSsResource(() => getSsSchedule(mode));
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = (data?.data ?? []).filter((task) => {
    const matchesStatus = status === "all" || task.status === status;
    const matchesQuery =
      q === "" || [task.title, task.phase, task.assignee, task.date].some((value) => value.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  return (
    <SaPage kicker="System Supervisor" title={title} subtitle={subtitle}>
      <MetricGrid>
        <MetricCard label="Tasks" value={String(data?.counts.total ?? 0)} note={`As of ${data?.server_date ?? "-"}`} />
        <MetricCard label="Done" value={String(data?.counts.done ?? 0)} note="Completed" />
        <MetricCard label="In Progress" value={String(data?.counts.in_progress ?? 0)} note="Ongoing now" />
        <MetricCard label="Pending" value={String(data?.counts.pending ?? 0)} note="Not started" />
      </MetricGrid>

      <SaPanel
        title="Task list"
        filters={
          <>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks..." />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="Done">Done</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
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
          emptyText="No tasks match the current filters."
        />
      </SaPanel>
    </SaPage>
  );
}
