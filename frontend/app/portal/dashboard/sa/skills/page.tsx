"use client";

import { useEffect, useState, type FormEvent } from "react";
import { listSkills, createSkill, updateSkill, deleteSkill, type ApiSkill } from "@/lib/api";
import { SaPage, SaPanel, SaTable, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";
import styles from "../page.module.css";

export default function SkillsPage() {
  const [skills, setSkills] = useState<ApiSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listSkills()
      .then((data) => { setSkills(data); setError(""); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load skills."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const reset = () => { setName(""); setDescription(""); setEditingId(null); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");

    try {
      if (editingId) {
        await updateSkill(editingId, { skill_name: name, description });
        setNotice("Skill updated.");
      } else {
        await createSkill({ skill_name: name, description });
        setNotice("Skill created.");
      }
      reset();
      load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (skill: ApiSkill) => {
    setEditingId(skill.skill_id);
    setName(skill.skill_name);
    setDescription(skill.description ?? "");
  };

  const remove = async (skill: ApiSkill) => {
    if (!window.confirm(`Delete skill "${skill.skill_name}"?`)) return;
    setNotice("");
    try {
      await deleteSkill(skill.skill_id);
      setNotice("Skill deleted.");
      load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const columns: SaColumn<ApiSkill>[] = [
    { key: "name", label: "Skill", render: (row) => row.skill_name },
    { key: "desc", label: "Description", render: (row) => row.description ?? "-" },
    { key: "laborers", label: "Qualified Laborers", render: (row) => row.laborer_count ?? 0 },
    { key: "actions", label: "Actions", render: (row) => (
      <div className={styles.actionCell}>
        <button type="button" className={styles.linkButton} onClick={() => edit(row)}>Edit</button>
        <button type="button" className={styles.linkButtonAlt} onClick={() => remove(row)}>Delete</button>
      </div>
    ) },
  ];

  return (
    <SaPage kicker="Reference Data" title="Skill Catalog" subtitle="Trades and qualifications used across projects">
      {notice ? <p className={styles.muted}>{notice}</p> : null}

      <SaPanel title={editingId ? "Edit Skill" : "Add Skill"}>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.field}>
            <label htmlFor="skill_name">Skill Name</label>
            <input id="skill_name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="skill_description">Description</label>
            <input id="skill_description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Skill" : "Add Skill"}
            </button>
            {editingId ? <button type="button" className={styles.linkButton} onClick={reset}>Cancel</button> : null}
          </div>
        </form>
      </SaPanel>

      <SaPanel title="All Skills">
        <SaTable columns={columns} rows={skills} loading={loading} error={error} rowKey={(row) => row.skill_id} />
      </SaPanel>
    </SaPage>
  );
}