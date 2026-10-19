"use client";

import { listPmEquipment, type PmEquipment } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

export default function EquipmentPage() {
  const { data, loading, error } = useApiData(listPmEquipment);
  const rows = data ?? [];

  const columns: SaColumn<PmEquipment>[] = [
    { key: "id", label: "Equipment ID", render: (row) => `EQ-${String(row.equipment_id).padStart(3, "0")}` },
    { key: "name", label: "Equipment", render: (row) => row.equipment_name },
    { key: "type", label: "Type", render: (row) => row.equipment_type ?? "-" },
    { key: "rate", label: "Hourly Rate", render: (row) => money(row.hourly_rental_rate) },
    { key: "assigned", label: "Assigned Project", render: (row) => row.assigned_project ?? "-" },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.equipment_status} /> },
  ];

  return (
    <SaPage kicker="Resources" title="Equipment" subtitle="Equipment master records and deployment status">
      <SaPanel title={`Equipment (${rows.length})`}>
        <SaTable columns={columns} rows={rows} loading={loading} error={error} emptyText="No equipment found." rowKey={(row) => row.equipment_id} />
      </SaPanel>
    </SaPage>
  );
}