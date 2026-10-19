"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createUser, listRoles } from "@/lib/api";
import { SaPage, SaPanel, useApiData } from "@/app/portal/dashboard/sa/_components/SaPage";
import styles from "../../page.module.css";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  password_confirmation: "",
  role_id: "",
  is_active: true,
};

export default function CreateUserPage() {
  const { data: roles } = useApiData(listRoles);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | ""; message: string }>({ type: "", message: "" });

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const result = await createUser({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        role_id: Number(form.role_id),
        is_active: form.is_active,
      });

      setStatus({ type: "success", message: `${result.data.id_number} was created successfully.` });
      setForm(EMPTY);
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to create the account." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SaPage kicker="User Management" title="Create User" subtitle="Provision a new account; the ID number is generated from the role." actions={<Link className={styles.primaryButton} href="/portal/dashboard/sa/users">Back to Users</Link>}>
      {status.message ? (
        <p className={status.type === "error" ? styles.alert : styles.success}>{status.message}</p>
      ) : null}

      <SaPanel title="Account Details">
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="first_name">First Name</label>
            <input id="first_name" value={form.first_name} onChange={(event) => update("first_name", event.target.value)} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="last_name">Last Name</label>
            <input id="last_name" value={form.last_name} onChange={(event) => update("last_name", event.target.value)} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="role_id">Role</label>
            <select id="role_id" value={form.role_id} onChange={(event) => update("role_id", event.target.value)} required>
              <option value="">Select a role</option>
              {(roles ?? []).map((role) => (
                <option key={role.role_id} value={role.role_id}>{role.role_name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" minLength={8} value={form.password} onChange={(event) => update("password", event.target.value)} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="password_confirmation">Confirm Password</label>
            <input id="password_confirmation" type="password" minLength={8} value={form.password_confirmation} onChange={(event) => update("password_confirmation", event.target.value)} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="is_active">
              <input id="is_active" type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} />{" "}
              Active account
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </SaPanel>
    </SaPage>
  );
}