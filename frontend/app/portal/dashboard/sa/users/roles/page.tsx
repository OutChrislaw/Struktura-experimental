"use client";

import { listRoles, listUsers } from "@/lib/api";
import { SaPage, SaPanel, useApiData } from "@/app/portal/dashboard/sa/_components/SaPage";
import styles from "../../page.module.css";

const PERMISSIONS: Record<string, string[]> = {
  Admin: [
    "Create, edit and deactivate user accounts",
    "Reassign roles and manage access permissions",
    "Maintain the skill catalog and system reference data",
    "Full visibility across all projects and audit logs",
    "Oversee database and system configuration",
  ],
  "Project Manager": [
    "Create and own construction projects",
    "Define project phases and budgets",
    "Assign qualified laborers to phases",
    "Manage equipment and material masters",
    "Review cost and budget reports",
  ],
  "Site Supervisor": [
    "Record daily labor hours",
    "Record material usage",
    "Record equipment usage",
    "View assigned workers and phases",
  ],
};

export default function RolesPage() {
  const { data: roles, loading, error } = useApiData(listRoles);
  const { data: users } = useApiData(listUsers);

  const countFor = (roleName: string) => (users ?? []).filter((user) => user.role_name === roleName).length;

  return (
    <SaPage kicker="User Management" title="Roles & Access" subtitle="The three system roles and what each can do">
      <SaPanel title="System Roles">
        {loading ? (
          <p className={styles.muted}>Loading roles...</p>
        ) : error ? (
          <p className={styles.alert}>{error}</p>
        ) : (
          <div className={styles.roleGrid}>
            {(roles ?? []).map((role) => (
              <article className={styles.roleCard} key={role.role_id}>
                <h3>{role.role_name.toUpperCase()}</h3>
                <p>{role.description ?? "No description."}</p>
                <div className={styles.roleMeta}>
                  <span>Users: {countFor(role.role_name)}</span>
                </div>
                <ul className={styles.activityList} style={{ marginTop: "0.75rem" }}>
                  {(PERMISSIONS[role.role_name] ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </SaPanel>
    </SaPage>
  );
}