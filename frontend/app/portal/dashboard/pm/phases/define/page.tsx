"use client";

import { useState, type FormEvent } from "react";
import { createPmPhase, listPmProjects, listSkills } from "@/lib/api";
import { SaPage, SaPanel, useApiData } from "@/app/portal/dashboard/sa/_components/SaPage";
import { Field, FormShell, FormActions, SuccessNote, ErrorNote } from "@/app/portal/dashboard/pm/_components/PmReport";
import styles from "../../../sa/page.module.css";

export default function DefinePhasePage() {
  const { data: projects } = useApiData(listPmProjects);
  const { data: skills } = useApiData(listSkills);

  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sequence, setSequence] = useState("");
  const [cost, setCost] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [skillId, setSkillId] = useState("");
  const [status, setStatus] = useState("Not Started");
  const [message, setMessage] = useState<{ type: "success" | "error" | ""; text: string }>({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId) { setMessage({ type: "error", text: "Select a project first." }); return; }

    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const result = await createPmPhase({
        project_id: Number(projectId),
        phase_name: name,
        description: description || null,
        sequence_no: sequence ? Number(sequence) : null,
        project_cost: cost ? Number(cost) : null,
        planned_start: start || null,
        planned_end: end || null,
        status,
        required_skill_id: skillId ? Number(skillId) : null,
      });

      setMessage({ type: "success", text: `Phase "${result.data.phase_name}" created successfully.` });
      setName(""); setDescription(""); setSequence(""); setCost(""); setStart(""); setEnd(""); setSkillId(""); setStatus("Not Started");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to create the phase." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SaPage kicker="Project Phases" title="Define Phase" subtitle="Add a sequenced stage to one of your projects">
      {message.text ? (message.type === "error" ? <ErrorNote>{message.text}</ErrorNote> : <SuccessNote>{message.text}</SuccessNote>) : null}

      <SaPanel title="Phase Details">
        <FormShell onSubmit={submit}>
          <Field label="Project">
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
              <option value="">Select a project</option>
              {(projects ?? []).map((project) => <option key={project.project_id} value={project.project_id}>{project.project_name}</option>)}
            </select>
          </Field>
          <Field label="Phase Name"><input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
          <Field label="Description"><input value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
          <Field label="Sequence"><input type="number" min="1" value={sequence} onChange={(event) => setSequence(event.target.value)} /></Field>
          <Field label="Cost"><input type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} /></Field>
          <Field label="Planned Start"><input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></Field>
          <Field label="Planned End"><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
          <Field label="Required Skill">
            <select value={skillId} onChange={(event) => setSkillId(event.target.value)}>
              <option value="">Select a skill</option>
              {(skills ?? []).map((skill) => <option key={skill.skill_id} value={skill.skill_id}>{skill.skill_name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </Field>
          <FormActions>
            <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? "Saving..." : "Define Phase"}</button>
          </FormActions>
        </FormShell>
      </SaPanel>
    </SaPage>
  );
}