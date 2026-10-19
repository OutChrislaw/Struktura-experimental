"use client";

import { getAdminResources, type ApiEquipment, type ApiMaterial, type ApiSupplier } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function ResourcesPage() {
  const { data, loading, error } = useApiData(getAdminResources);

  const equipmentColumns: SaColumn<ApiEquipment>[] = [
    { key: "name", label: "Equipment", render: (row) => row.equipment_name },
    { key: "type", label: "Type", render: (row) => row.equipment_type ?? "-" },
    { key: "rate", label: "Hourly Rate", render: (row) => money(row.hourly_rental_rate) },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.equipment_status} /> },
  ];

  const materialColumns: SaColumn<ApiMaterial>[] = [
    { key: "name", label: "Material", render: (row) => row.material_name },
    { key: "unit", label: "Unit", render: (row) => row.unit_of_measure ?? "-" },
    { key: "cost", label: "Unit Cost", render: (row) => money(row.unit_cost) },
  ];

  const supplierColumns: SaColumn<ApiSupplier>[] = [
    { key: "name", label: "Supplier", render: (row) => row.supplier_name },
    { key: "contact", label: "Contact", render: (row) => [row.contact_name, row.contact_num].filter(Boolean).join(" - ") || "-" },
    { key: "location", label: "Location", render: (row) => [row.city, row.state_province, row.country].filter(Boolean).join(", ") },
  ];

  return (
    <SaPage kicker="Operations" title="Resources" subtitle="Equipment, materials and suppliers">
      <SaPanel title={`Equipment (${data?.equipment.length ?? 0})`}>
        <SaTable columns={equipmentColumns} rows={data?.equipment ?? []} loading={loading} error={error} rowKey={(row) => row.equipment_id} />
      </SaPanel>
      <SaPanel title={`Materials (${data?.materials.length ?? 0})`}>
        <SaTable columns={materialColumns} rows={data?.materials ?? []} loading={loading} error={error} rowKey={(row) => row.material_id} />
      </SaPanel>
      <SaPanel title={`Suppliers (${data?.suppliers.length ?? 0})`}>
        <SaTable columns={supplierColumns} rows={data?.suppliers ?? []} loading={loading} error={error} rowKey={(row) => row.supplier_id} />
      </SaPanel>
    </SaPage>
  );
}