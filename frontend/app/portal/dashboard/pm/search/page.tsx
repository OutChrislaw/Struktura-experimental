"use client";

import { useState, type FormEvent } from "react";
import { searchPm, type PmSearchResults } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, money, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

type ProjectHit = PmSearchResults["projects"][number];
type PhaseHit = PmSearchResults["phases"][number];
type LaborerHit = PmSearchResults["laborers"][number];

export default function PmSearchPage() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PmSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!term.trim()) { setResults(null); return; }
    setLoading(true);
    setError("");

    try {
      setResults(await searchPm(term.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const projectColumns: SaColumn<ProjectHit>[] = [
    { key: "name", label: "Project", render: (row) => row.project_name },
    { key: "client", label: "Client", render: (row) => row.client_name ?? "-" },
    { key: "location", label: "Location", render: (row) => row.location ?? "-" },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  const phaseColumns: SaColumn<PhaseHit>[] = [
    { key: "project", label: "Project", render: (row) => row.project },
    { key: "name", label: "Phase", render: (row) => row.project_name ?? "-" },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  const laborerColumns: SaColumn<LaborerHit>[] = [
    { key: "id", label: "Laborer ID", render: (row) => `LAB-${String(row.laborer_id).padStart(4, "0")}` },
    { key: "name", label: "Name", render: (row) => `${row.first_name} ${row.last_name}` },
    { key: "rate", label: "Hourly Rate", render: (row) => money(row.hourly_rate) },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.employment_status} /> },
  ];

  return (
    <SaPage kicker="Search" title="Search" subtitle="Find projects, phases and laborers">
      <SaPanel title="Search the system" filters={<form onSubmit={submit} style={{ display: "flex", gap: "0.5rem" }}>
        <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search projects, phases, laborers" />
        <button type="submit" style={{ border: "none", background: "#ca8a04", color: "#ffffff", padding: "0.7rem 1rem", borderRadius: "2px", fontWeight: 700, cursor: "pointer" }}>Search</button>
      </form>}>
        {loading ? <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem" }}>Searching...</p> : error ? <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.82rem" }}>{error}</p> : <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem" }}>{results ? `Results for "${term}".` : "Enter a term and press Search."}</p>}
      </SaPanel>

      {results ? (
        <>
          <SaPanel title={`Projects (${results.projects.length})`}>
            <SaTable columns={projectColumns} rows={results.projects} emptyText="No matching projects." rowKey={(row) => row.project_id} />
          </SaPanel>
          <SaPanel title={`Phases (${results.phases.length})`}>
            <SaTable columns={phaseColumns} rows={results.phases} emptyText="No matching phases." rowKey={(row) => row.phase_id} />
          </SaPanel>
          <SaPanel title={`Laborers (${results.laborers.length})`}>
            <SaTable columns={laborerColumns} rows={results.laborers} emptyText="No matching laborers." rowKey={(row) => row.laborer_id} />
          </SaPanel>
        </>
      ) : null}
    </SaPage>
  );
}