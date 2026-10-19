"use client";

import { getAuditEvents, type ApiAuditEvent } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, formatDate, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function AuditEventsPage() {
  const { data, loading, error } = useApiData(getAuditEvents);

  const columns: SaColumn<ApiAuditEvent>[] = [
    { key: "time", label: "Timestamp", render: (row) => formatDate(row.charge_at) },
    { key: "project", label: "Project", render: (row) => row.project_name ?? `#${row.project_id}` },
    { key: "table", label: "Table", render: (row) => row.table_name },
    { key: "record", label: "Record", render: (row) => `#${row.record_id}` },
    { key: "action", label: "Action", status: true, render: (row) => <StatusBadge status={row.action_type} /> },
    { key: "user", label: "Changed By", render: (row) => row.id_number ? `${row.id_number} - ${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() : "-" },
  ];

  return (
    <SaPage kicker="Audit Logs" title="System Events" subtitle="Every recorded change across audited tables">
      <SaPanel title="Audit Trail">
        <SaTable columns={columns} rows={data ?? []} loading={loading} error={error} rowKey={(row) => row.audit_log_id} />
      </SaPanel>
    </SaPage>
  );
}