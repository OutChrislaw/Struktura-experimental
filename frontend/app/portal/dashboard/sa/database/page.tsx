"use client";

import { getDatabaseTables, type ApiDatabaseTable } from "@/lib/api";
import { SaPage, SaPanel, SaTable, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function DatabasePage() {
  const { data, loading, error } = useApiData(getDatabaseTables);

  const columns: SaColumn<ApiDatabaseTable>[] = [
    { key: "table", label: "Table", render: (row) => row.table },
    { key: "rows", label: "Rows", render: (row) => row.rows.toLocaleString() },
  ];

  return (
    <SaPage kicker="System" title="Database" subtitle="All tables in the Aiven MySQL instance with live row counts">
      <SaPanel title="Schema Tables">
        <SaTable columns={columns} rows={data ?? []} loading={loading} error={error} rowKey={(row) => row.table} />
      </SaPanel>
    </SaPage>
  );
}