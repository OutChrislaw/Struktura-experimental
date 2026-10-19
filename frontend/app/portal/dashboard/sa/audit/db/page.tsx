"use client";

import { getAuditDb, type ApiDbTable } from "@/lib/api";
import { SaPage, SaPanel, SaTable, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function DbPerformancePage() {
  const { data, loading, error } = useApiData(getAuditDb);

  const columns: SaColumn<ApiDbTable>[] = [
    { key: "table", label: "Table", render: (row) => row.name },
    { key: "rows", label: "Approx. Rows", render: (row) => (row.approx_rows ?? 0).toLocaleString() },
    { key: "data", label: "Data (KB)", render: (row) => String(row.data_kb ?? 0) },
    { key: "index", label: "Index (KB)", render: (row) => String(row.index_kb ?? 0) },
  ];

  return (
    <SaPage kicker="Audit Logs" title="DB Performance" subtitle={data?.server_version ? `MySQL ${data.server_version} - table storage statistics` : "Table storage statistics"}>
      <SaPanel title="Table Statistics">
        <SaTable columns={columns} rows={data?.data ?? []} loading={loading} error={error} rowKey={(row) => row.name} />
      </SaPanel>
    </SaPage>
  );
}