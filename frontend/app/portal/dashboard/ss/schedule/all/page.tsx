"use client";

import { ScheduleView } from "../../_components/ScheduleView";

export default function AllTasksPage() {
  return (
    <ScheduleView
      mode="all"
      title="All Tasks"
      subtitle="Full task list for your assigned site."
    />
  );
}