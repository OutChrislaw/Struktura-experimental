"use client";

import { getSystemInfo } from "@/lib/api";
import { SaPage, SaPanel, SaTable, useApiData, type SaColumn } from "@/app/portal/dashboard/sa/_components/SaPage";

type Setting = { label: string; value: string };

export default function SystemConfigPage() {
  const { data, loading, error } = useApiData(getSystemInfo);

  const rows: Setting[] = data ? [
    { label: "Application", value: data.app_name },
    { label: "Environment", value: data.environment },
    { label: "Laravel Version", value: data.laravel_version },
    { label: "PHP Version", value: data.php_version },
    { label: "Database Driver", value: data.database_driver },
    { label: "Database Server", value: data.database_server },
    { label: "Database Name", value: data.database_name },
    { label: "Database Host", value: data.database_host },
    { label: "Timezone", value: data.timezone },
    { label: "Debug Mode", value: String(data.debug_mode) },
    { label: "Cache Driver", value: data.cache_driver },
    { label: "Session Driver", value: data.session_driver },
    { label: "Queue Driver", value: data.queue_driver },
  ] : [];

  const columns: SaColumn<Setting>[] = [
    { key: "label", label: "Setting", render: (row) => row.label },
    { key: "value", label: "Value", render: (row) => row.value },
  ];

  return (
    <SaPage kicker="System" title="System Configuration" subtitle="Runtime environment and database connection details">
      <SaPanel title="Configuration">
        <SaTable columns={columns} rows={rows} loading={loading} error={error} rowKey={(row) => row.label} />
      </SaPanel>
    </SaPage>
  );
}