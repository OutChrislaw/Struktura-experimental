"use client";

import { ScheduleView } from "../../_components/ScheduleView";

export default function WeekTasksPage() {
  return (
    <ScheduleView
      mode="week"
      title="This Week"
      subtitle="Tasks planned for the current work week."
    />
  );
}