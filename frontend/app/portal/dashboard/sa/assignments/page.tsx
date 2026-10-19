"use client";

import { getAdminAssignments, type ApiAssignment } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, formatDate, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function AssignmentsPage() {
  const { data, loading, error } = useApiData(getAdminAssignments);

  const columns: SaColumn<ApiAssignment>[] = [
    { key: "laborer", label: "Laborer", render: (row) => `${row.first_name} ${row.last_name}` },
    { key: "project", label: "Project", render: (row) => row.project },
    { key: "phase", label: "Phase", render: (row) => row.phase },
    { key: "role", label: "Role on Task", render: (row) => row.role_on_task ?? "-" },
    { key: "assigned", label: "Assigned", render: (row) => formatDate(row.assigned_at) },
    { key: "released", label: "Released", render: (row) => formatDate(row.released_at) },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="Operations" title="Assignments" subtitle="Laborers assigned to project phases">
      <SaPanel title="Workforce Assignments">
        <SaTable columns={columns} rows={data ?? []} loading={loading} error={error} rowKey={(row) => row.assignment_id} />
      </SaPanel>
    </SaPage>
  );
}