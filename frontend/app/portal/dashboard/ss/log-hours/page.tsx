"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSsLaborLog, getSsLogHours, type SsLaborLog } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";
import { BarChart, ErrorNote, Field, FormActions, FormShell, KpiStrip, SuccessNote, SubmitButton } from "../_components/SsReport";
import { useSsResource } from "../_components/useSsResource";

const columns: SaColumn<SsLaborLog>[] = [
  { key: "date", label: "Date", render: (row) => row.date },
  { key: "worker", label: "Worker", render: (row) => row.worker },
  { key: "regular", label: "Regular", render: (row) => `${row.regular} h` },
  { key: "overtime", label: "Overtime", render: (row) => `${row.overtime} h` },
  { key: "total", label: "Total", render: (row) => `${row.total} h` },
  { key: "cost", label: "Cost", render: (row) => money(row.cost) },
  { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
];

export default function LogHoursPage() {
  const { data, loading, error, reload } = useSsResource(getSsLogHours);
  const [assignmentId, setAssignmentId] = useState("");
  const [date, setDate] = useState("");
  const [regular, setRegular] = useState("8");
  const [overtime, setOvertime] = useState("0");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.server_date && date === "") {
      setDate(data.server_date);
    }
  }, [data?.server_date, date]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    setFormError("");

    const reg = Number(regular);
    const ot = Number(overtime);

    if (assignmentId === "") {
      setFormError("Select the worker this log belongs to.");
      return;
    }
    if (!Number.isFinite(reg) || reg < 0 || !Number.isFinite(ot) || ot < 0) {
      setFormError("Hours must be zero or more.");
      return;
    }
    if (reg + ot <= 0) {
      setFormError("Enter at least one hour.");
      return;
    }
    if (date === "") {
      setFormError("Choose the work date.");
      return;
    }

    setSaving(true);
    try {
      const result = await createSsLaborLog({
        assignment_id: Number(assignmentId),
        log_date: date,
        regular_hours: reg,
        overtime_hours: ot,
      });
      setSuccess(`${result.message} Computed cost: ${money(Number(result.data.computed_cost))}`);
      setOvertime("0");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save the labor log.");
    } finally {
      setSaving(false);
    }
  }

  const assignments = data?.assignments ?? [];

  return (
    <SaPage kicker="System Supervisor" title="Log Labor Hours" subtitle="Record the hours worked by each crew member on your site.">
      <SaPanel title="New labor log">
        {loading ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>Loading workers...</p>
        ) : assignments.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>
            No active worker assignments on this site yet.
          </p>
        ) : (
          <FormShell onSubmit={handleSubmit}>
            <Field label="Worker / Assignment">
              <select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} required>
                <option value="">Select worker</option>
                {assignments.map((row) => (
                  <option key={row.assignment_id} value={row.assignment_id}>
                    {row.worker} - {row.phase ?? "Phase"} ({money(row.rate)}/hr)
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Work Date">
              <input type="date" value={date} max={data?.server_date} onChange={(event) => setDate(event.target.value)} required />
            </Field>
            <Field label="Regular Hours">
              <input type="number" min="0" max="24" step="0.5" value={regular} onChange={(event) => setRegular(event.target.value)} required />
            </Field>
            <Field label="Overtime Hours">
              <input type="number" min="0" max="12" step="0.5" value={overtime} onChange={(event) => setOvertime(event.target.value)} />
            </Field>
            {formError !== "" ? <ErrorNote>{formError}</ErrorNote> : null}
            {success !== "" ? <SuccessNote>{success}</SuccessNote> : null}
            <FormActions>
              <SubmitButton>{saving ? "Saving..." : "Submit labor log"}</SubmitButton>
            </FormActions>
          </FormShell>
        )}
      </SaPanel>

      <KpiStrip
        items={[
          { label: "Hours Today", value: `${data?.metrics.hours_today ?? 0} h` },
          { label: "Logs Today", value: String(data?.metrics.logs_today ?? 0) },
          { label: "Crew On Site", value: String(data?.metrics.crew ?? 0) },
          { label: "Total Logs", value: String(data?.metrics.total_logs ?? 0) },
        ]}
      />

      <SaPanel title="Labor hours - last 7 days">
        <BarChart data={data?.series ?? []} />
      </SaPanel>

      <SaPanel title="Recent labor logs">
        <SaTable
          columns={columns}
          rows={data?.logs ?? []}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyText="No labor hours logged yet."
        />
      </SaPanel>
    </SaPage>
  );
}
