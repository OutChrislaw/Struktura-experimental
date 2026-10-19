"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSsEquipmentUsage, getSsEquipment, type SsEquipmentLog } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";
import { ErrorNote, Field, FormActions, FormShell, KpiStrip, SuccessNote, SubmitButton } from "../_components/SsReport";
import { useSsResource } from "../_components/useSsResource";

const columns: SaColumn<SsEquipmentLog>[] = [
  { key: "date", label: "Date", render: (row) => row.date },
  { key: "equipment", label: "Equipment", render: (row) => row.equipment },
  { key: "hours", label: "Hours", render: (row) => `${row.hours} h` },
  { key: "cost", label: "Cost", render: (row) => money(row.cost) },
  { key: "phase", label: "Phase", render: (row) => row.phase ?? "-" },
  { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
];

export default function EquipmentUsedPage() {
  const { data, loading, error, reload } = useSsResource(getSsEquipment);
  const [equipmentId, setEquipmentId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
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

  const machines = data?.equipment ?? [];
  const phases = data?.phases ?? [];
  const selected = machines.find((row) => String(row.equipment_id) === equipmentId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    setFormError("");

    const value = Number(hours);

    if (equipmentId === "") {
      setFormError("Select the equipment that was used.");
      return;
    }
    if (phaseId === "") {
      setFormError("Select the phase this equipment was used on.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setFormError("Operating hours must be greater than zero.");
      return;
    }
    if (date === "") {
      setFormError("Choose the usage date.");
      return;
    }

    setSaving(true);
    try {
      const result = await createSsEquipmentUsage({
        equipment_id: Number(equipmentId),
        phase_id: Number(phaseId),
        usage_date: date,
        hours_used: value,
      });
      setSuccess(`${result.message} Computed cost: ${money(Number(result.data.computed_cost))}`);
      setHours("");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the equipment usage.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <SaPage kicker="System Supervisor" title="Equipment Used" subtitle="Record the machine hours logged on your site.">
      <SaPanel title="New equipment usage">
        {loading ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>Loading equipment...</p>
        ) : phases.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>No phases are defined for this site yet.</p>
        ) : (
          <FormShell onSubmit={handleSubmit}>
            <Field label="Equipment">
              <select value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)} required>
                <option value="">Select equipment</option>
                {machines.map((row) => (
                  <option key={row.equipment_id} value={row.equipment_id}>
                    {row.name} ({row.type ?? "unit"}) - {money(row.rate)}/hr - {row.status ?? "Unknown"}
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
            <Field label="Operating Hours">
              <input type="number" min="0.01" max="24" step="0.5" value={hours} onChange={(event) => setHours(event.target.value)} required />
            </Field>
            {selected ? (
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                Hourly rental rate: {money(selected.rate)} - status: {selected.status ?? "Unknown"}
              </p>
            ) : null}
            {formError !== "" ? <ErrorNote>{formError}</ErrorNote> : null}
            {success !== "" ? <SuccessNote>{success}</SuccessNote> : null}
            <FormActions>
              <SubmitButton>{saving ? "Saving..." : "Record equipment usage"}</SubmitButton>
            </FormActions>
          </FormShell>
        )}
      </SaPanel>

      <KpiStrip
        items={[
          { label: "Hours Today", value: `${data?.metrics.hours_today ?? 0} h` },
          { label: "Logs Today", value: String(data?.metrics.logs_today ?? 0) },
          { label: "Machines Today", value: String(data?.metrics.machines_today ?? 0) },
          { label: "Total Logs", value: String(data?.metrics.total_logs ?? 0) },
        ]}
      />

      <SaPanel title="Recent equipment usage">
        <SaTable
          columns={columns}
          rows={data?.logs ?? []}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyText="No equipment usage recorded yet."
        />
      </SaPanel>
    </SaPage>
  );
}
