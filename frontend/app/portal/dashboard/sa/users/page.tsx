"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listUsers, setUserActive, roleCodeFromName, type ApiUserRow } from "@/lib/api";
import { SaPage, SaPanel, SaTable, StatusBadge, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";
import styles from "../page.module.css";

type Row = ApiUserRow & { roleLabel: string; roleCode: string };

const ROLE_LABELS: Record<string, string> = {
  Admin: "System Administrator",
  "Project Manager": "Project Manager",
  "Site Supervisor": "Site Supervisor",
};

export default function AllUsersPage() {
  const [users, setUsers] = useState<ApiUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const load = () => {
    setLoading(true);
    listUsers()
      .then((data) => { setUsers(data); setError(""); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo<Row[]>(
    () => users.map((user) => ({
      ...user,
      roleLabel: ROLE_LABELS[user.role_name ?? ""] ?? (user.role_name ?? "-"),
      roleCode: roleCodeFromName(user.role_name) ?? "SA",
    })),
    [users],
  );

  const filtered = rows.filter((row) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || row.full_name.toLowerCase().includes(term) || row.id_number.toLowerCase().includes(term) || row.email.toLowerCase().includes(term);
    const matchesRole = roleFilter === "all" || row.roleCode === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggle = async (row: Row) => {
    setBusyId(row.user_id);
    setNotice("");
    try {
      await setUserActive(row.user_id, !row.is_active);
      setNotice(`${row.id_number} ${row.is_active ? "deactivated" : "activated"}.`);
      load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const columns: SaColumn<Row>[] = [
    { key: "id", label: "User ID", render: (row) => row.id_number },
    { key: "name", label: "Full Name", render: (row) => row.full_name },
    { key: "email", label: "Email", render: (row) => row.email },
    { key: "role", label: "Role", render: (row) => row.roleLabel },
    { key: "status", label: "Status", status: true, render: (row) => <StatusBadge status={row.is_active ? "Active" : "Inactive"} /> },
    { key: "actions", label: "Actions", render: (row) => (
      <div className={styles.actionCell}>
        <button type="button" className={styles.linkButton} onClick={() => toggle(row)} disabled={busyId === row.user_id}>
          {row.is_active ? "Disable" : "Enable"}
        </button>
      </div>
    ) },
  ];

  return (
    <SaPage kicker="User Management" title="All Users" subtitle="Every account in the system" actions={<Link className={styles.primaryButton} href="/portal/dashboard/sa/users/create">+ Create User</Link>}>
      {notice ? <p className={styles.muted}>{notice}</p> : null}
      <SaPanel title="User Directory" filters={<>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search user" />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">All Roles</option>
          <option value="SA">System Administrator</option>
          <option value="PM">Project Manager</option>
          <option value="SS">Site Supervisor</option>
        </select>
      </>}>
        <SaTable columns={columns} rows={filtered} loading={loading} error={error} rowKey={(row) => row.user_id} />
      </SaPanel>
    </SaPage>
  );
}