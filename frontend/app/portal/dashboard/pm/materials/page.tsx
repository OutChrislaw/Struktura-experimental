"use client";

import { listPmMaterials, type PmMaterial } from "@/lib/api";
import { SaPage, SaPanel, SaTable, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function MaterialsPage() {
  const { data, loading, error } = useApiData(listPmMaterials);
  const rows = data ?? [];

  const columns: SaColumn<PmMaterial>[] = [
    { key: "id", label: "Material ID", render: (row) => `MAT-${String(row.material_id).padStart(3, "0")}` },
    { key: "name", label: "Material", render: (row) => row.material_name },
    { key: "unit", label: "Unit", render: (row) => row.unit_of_measure ?? "-" },
    { key: "cost", label: "Unit Cost", render: (row) => money(row.unit_cost) },
    { key: "supplier", label: "Supplier", render: (row) => row.supplier_name ?? "-" },
    { key: "stock", label: "Stock on Hand", render: (row) => row.stock_quantity.toLocaleString() },
  ];

  return (
    <SaPage kicker="Resources" title="Materials" subtitle="Material master records and current stock">
      <SaPanel title={`Materials (${rows.length})`}>
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No materials found." rowKey={(row) => row.material_id} />
      </SaPanel>
    </SaPage>
  );
}