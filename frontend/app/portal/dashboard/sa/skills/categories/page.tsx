"use client";

import { listSkills, type ApiSkill } from "@/lib/api";
import { SaPage, useApiData } from "@/app/portal/dashboard/sa/_components/SaPage";
import styles from "../../page.module.css";

const CATEGORY_MAP: Record<string, string[]> = {
  "Structural & Masonry": ["Mason", "Steel Fixer", "Concrete Worker", "Carpenter"],
  "Finishing": ["Painter", "Roofer"],
  "Mechanical, Electrical & Plumbing": ["Electrician", "Plumber", "Welder"],
  "Equipment Operations": ["Heavy Equipment Operator"],
  "Safety & Survey": ["Safety Officer", "Surveyor"],
};

function categoryFor(skillName: string): string {
  for (const [category, names] of Object.entries(CATEGORY_MAP)) {
    if (names.includes(skillName)) return category;
  }
  return "Other";
}

export default function SkillCategoriesPage() {
  const { data: skills, loading, error } = useApiData(listSkills);

  const groups = (skills ?? []).reduce<Record<string, ApiSkill[]>>((acc, skill) => {
    const category = categoryFor(skill.skill_name);
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {});

  const categories = Object.keys(groups).sort();

  return (
    <SaPage kicker="Reference Data" title="Skill Categories" subtitle="Skills grouped by trade discipline">
      {loading ? (
        <p className={styles.muted}>Loading...</p>
      ) : error ? (
        <p className={styles.alert}>{error}</p>
      ) : (
        <div className={styles.roleGrid}>
          {categories.map((category) => (
            <article className={styles.roleCard} key={category}>
              <h3>{category.toUpperCase()}</h3>
              <p>{groups[category].length} skill{groups[category].length === 1 ? "" : "s"}</p>
              <ul className={styles.activityList}>
                {groups[category].map((skill) => (
                  <li key={skill.skill_id}>
                    <strong>{skill.skill_name}</strong>
                    {skill.laborer_count ? ` - ${skill.laborer_count} qualified` : ""}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </SaPage>
  );
}