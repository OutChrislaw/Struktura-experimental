"use client";

import { getAuditLogins, type ApiLoginToken } from "@/lib/api";
import { SaPage, SaPanel, SaTable, formatDate, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function LoginHistoryPage() {
  const { data, loading, error } = useApiData(getAuditLogins);

  const columns: SaColumn<ApiLoginToken>[] = [
    { key: "user", label: "Account", render: (row) => row.id_number ? `${row.id_number} - ${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() : "-" },
    { key: "token", label: "Token", render: (row) => row.token_name },
    { key: "created", label: "Issued", render: (row) => formatDate(row.created_at) },
    { key: "used", label: "Last Used", render: (row) => formatDate(row.last_used_at) },
  ];

  return (
    <SaPage kicker="Audit Logs" title="Login History" subtitle="Issued API tokens and their last use">
      <SaPanel title="Login Sessions">
        <SaTable columns={columns} rows={data ?? []} loading={loading} error={error} rowKey={(row) => row.id} />
      </SaPanel>
    </SaPage>
  );
}