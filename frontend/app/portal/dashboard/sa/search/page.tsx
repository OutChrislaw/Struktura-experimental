"use client";

import { useState, type FormEvent } from "react";
import { searchAll, type ApiSearchResults } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";
import styles from "../page.module.css";

type UserHit = ApiSearchResults["users"][number];
type SkillHit = ApiSearchResults["skills"][number];
type ProjectHit = ApiSearchResults["projects"][number];

export default function SearchPage() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ApiSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!term.trim()) { setResults(null); return; }
    setLoading(true);
    setError("");
    try { setResults(await searchAll(term.trim())); }
    catch (err) { setError(err instanceof Error ? err.message : "Search failed."); }
    finally { setLoading(false); }
  };

  const userColumns: SaColumn<UserHit>[] = [
    { key: "id", label: "User ID", render: (row) => row.id_number },
    { key: "name", label: "Name", render: (row) => `${row.first_name} ${row.last_name}` },
    { key: "email", label: "Email", render: (row) => row.email },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.is_active ? "Active" : "Inactive"} /> },
  ];

  const skillColumns: SaColumn<SkillHit>[] = [
    { key: "name", label: "Skill", render: (row) => row.skill_name },
    { key: "desc", label: "Description", render: (row) => row.description ?? "-" },
  ];

  const projectColumns: SaColumn<ProjectHit>[] = [
    { key: "name", label: "Project", render: (row) => row.project_name },
    { key: "client", label: "Client", render: (row) => row.client_name ?? "-" },
    { key: "location", label: "Location", render: (row) => row.location ?? "-" },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <SaPage kicker="Search" title="Search" subtitle="Find users, skills and projects across the system">
      <SaPanel title="Global Search" filters={<form onSubmit={submit} style={{ display: "flex", gap: "0.5rem" }}>
        <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search users, skills, projects" />
        <button type="submit" className={styles.linkButton}>Search</button>
      </form>}>
        {loading ? <p className={styles.muted}>Searching...</p> : error ? <p className={styles.alert}>{error}</p> : results ? <p className={styles.muted}>Results for &quot;{term}&quot;.</p> : <p className={styles.muted}>Enter a term and press Search.</p>}
      </SaPanel>

      {results ? (
        <>
          <SaPanel title={`Users (${results.users.length})`}>
            <SaTable columns={userColumns} rows={results.users} emptyText="No matching users." rowKey={(row) => row.user_id} />
          </SaPanel>
          <SaPanel title={`Skills (${results.skills.length})`}>
            <SaTable columns={skillColumns} rows={results.skills} emptyText="No matching skills." rowKey={(row) => row.skill_id} />
          </SaPanel>
          <SaPanel title={`Projects (${results.projects.length})`}>
            <SaTable columns={projectColumns} rows={results.projects} emptyText="No matching projects." rowKey={(row) => row.project_id} />
          </SaPanel>
        </>
      ) : null}
    </SaPage>
  );
}