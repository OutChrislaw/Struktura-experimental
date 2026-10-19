"use client";

import { ScheduleView } from "../../_components/ScheduleView";

export default function TodayTasksPage() {
  return (
    <ScheduleView
      mode="today"
      title="Today's Tasks"
      subtitle="Everything scheduled on site for today."
    />
  );
}