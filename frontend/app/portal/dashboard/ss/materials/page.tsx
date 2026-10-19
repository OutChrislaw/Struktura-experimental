"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSsMaterialUsage, getSsMaterials, type SsMaterialLog } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";
import { ErrorNote, Field, FormActions, FormShell, KpiStrip, SuccessNote, SubmitButton } from "../_components/SsReport";
import { useSsResource } from "../_components/useSsResource";

const columns: SaColumn<SsMaterialLog>[] = [
  { key: "date", label: "Date", render: (row) => row.date },
  { key: "material", label: "Material", render: (row) => row.material },
  { key: "quantity", label: "Quantity", render: (row) => `${row.quantity} ${row.unit ?? ""}`.trim() },
  { key: "cost", label: "Cost", render: (row) => money(row.cost) },
  { key: "phase", label: "Phase", render: (row) => row.phase ?? "-" },
  { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
];

export default function MaterialsUsedPage() {
  const { data, loading, error, reload } = useSsResource(getSsMaterials);
  const [materialId, setMaterialId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.server_date && date === "") {
      setDate(data.server_date);
    }
  }, [data?.server_date, date]);

  useEffect(() => {
    if (!data || phaseId !== "") return;
    const active = data.phases.find((phase) => phase.status === "In Progress") ?? data.phases[0];
    if (active) setPhaseId(String(active.phase_id));
  }, [data, phaseId]);

  const materials = data?.materials ?? [];
  const phases = data?.phases ?? [];
  const selected = materials.find((row) => String(row.material_id) === materialId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    setFormError("");

    const qty = Number(quantity);

    if (materialId === "") {
      setFormError("Select the material that was used.");
      return;
    }
    if (phaseId === "") {
      setFormError("Select the phase this material was used on.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }
    if (date === "") {
      setFormError("Choose the usage date.");
      return;
    }

    setSaving(true);
    try {
      const result = await createSsMaterialUsage({
        material_id: Number(materialId),
        phase_id: Number(phaseId),
        usage_date: date,
        quantity_used: qty,
      });
      setSuccess(`${result.message} Computed cost: ${money(Number(result.data.computed_cost))}`);
      setQuantity("");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the material usage.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <SaPage kicker="System Supervisor" title="Materials Used" subtitle="Record the materials consumed on your site.">
      <SaPanel title="New material usage">
        {loading ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>Loading materials...</p>
        ) : phases.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>No phases are defined for this site yet.</p>
        ) : (
          <FormShell onSubmit={handleSubmit}>
            <Field label="Material">
              <select value={materialId} onChange={(event) => setMaterialId(event.target.value)} required>
                <option value="">Select material</option>
                {materials.map((row) => (
                  <option key={row.material_id} value={row.material_id}>
                    {row.name} ({row.unit ?? "unit"}) - {money(row.unit_cost)}/{row.unit ?? "unit"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phase">
              <select value={phaseId} onChange={(event) => setPhaseId(event.target.value)} required>
                <option value="">Select phase</option>
                {phases.map((phase) => (
                  <option key={phase.phase_id} value={phase.phase_id}>
                    {phase.sequence}. {phase.name} ({phase.status ?? "-"})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Usage Date">
              <input type="date" value={date} max={data?.server_date} onChange={(event) => setDate(event.target.value)} required />
            </Field>
            <Field label="Quantity">
              <input type="number" min="0.01" step="0.5" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </Field>
            <Field label="Unit">
              <input type="text" value={selected?.unit ?? ""} readOnly />
            </Field>
            {selected ? (
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                Stock on hand: {selected.stock} {selected.unit ?? "unit"}
              </p>
            ) : null}
            {formError !== "" ? <ErrorNote>{formError}</ErrorNote> : null}
            {success !== "" ? <SuccessNote>{success}</SuccessNote> : null}
            <FormActions>
              <SubmitButton>{saving ? "Saving..." : "Record material usage"}</SubmitButton>
            </FormActions>
          </FormShell>
        )}
      </SaPanel>

      <KpiStrip
        items={[
          { label: "Entries Today", value: String(data?.metrics.entries_today ?? 0) },
          { label: "Distinct Materials", value: String(data?.metrics.distinct_today ?? 0) },
          { label: "Catalog Items", value: String(materials.length) },
          { label: "Total Logs", value: String(data?.metrics.total_logs ?? 0) },
        ]}
      />

      <SaPanel title="Recent material usage">
        <SaTable
          columns={columns}
          rows={data?.logs ?? []}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyText="No material usage recorded yet."
        />
      </SaPanel>
    </SaPage>
  );
}
