// Thin REST client for the Struktura ERP Laravel API (Sanctum bearer tokens).
// Base URL is configurable via NEXT_PUBLIC_API_BASE_URL (see frontend/.env.local).

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export type ApiRole = {
  role_id: number | null;
  role_name: string | null;
};

// Shape returned by POST /login, GET /me (user object).
export type ApiUser = {
  user_id: number;
  id_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  is_active: boolean;
  role: ApiRole;
};

// Frontend role codes used for routing and sidebar selection.
export type RoleCode = "SA" | "PM" | "SS";

// Backend role_name -> frontend role code.
export function roleCodeFromName(roleName?: string | null): RoleCode | null {
  switch (roleName) {
    case "Admin":
      return "SA";
    case "Project Manager":
      return "PM";
    case "Site Supervisor":
      return "SS";
    default:
      return null;
  }
}

export const ROLE_DASHBOARD_PATHS: Record<RoleCode, string> = {
  SA: "/portal/dashboard/sa",
  PM: "/portal/dashboard/pm",
  SS: "/portal/dashboard/ss",
};

// Normalized user persisted in localStorage under "struktura_user".
export type SessionUser = {
  /** Formatted account ID, e.g. SYS010001 (shown across the UI). */
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: RoleCode;
  role_name: string;
};

export function toSessionUser(user: ApiUser): SessionUser | null {
  const role = roleCodeFromName(user.role?.role_name);
  if (!role) return null;

  return {
    user_id: user.id_number,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role,
    role_name: user.role?.role_name ?? "",
  };
}

export const TOKEN_KEY = "struktura_token";
export const USER_KEY = "struktura_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

// --- low-level fetch --------------------------------------------------------

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Please make sure the backend is running.",
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
  };

  if (!response.ok) {
    throw new ApiError(
      data.message ?? "Something went wrong. Please try again.",
      response.status,
      data.errors,
    );
  }

  return data as T;
}

// --- endpoints --------------------------------------------------------------

export async function login(idNumber: string, password: string): Promise<{
  message: string;
  token: string;
  user: ApiUser;
}> {
  return request("/login", {
    method: "POST",
    body: { id_number: idNumber, password },
    auth: false,
  });
}

export async function me(): Promise<ApiUser> {
  const data = await request<{ user: ApiUser }>("/me");
  return data.user;
}

// --- users ------------------------------------------------------------------

export type ApiUserRow = {
  user_id: number;
  id_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  is_active: boolean;
  role_id: number | null;
  role_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** List all user accounts (Admin only). */
export async function listUsers(): Promise<ApiUserRow[]> {
  const data = await request<{ data: ApiUserRow[] }>("/users");
  return data.data;
}

export async function logout(): Promise<void> {
  await request<{ message: string }>("/logout", { method: "POST" });
}

// --- admin console types ----------------------------------------------------

export type ApiSkill = { skill_id: number; skill_name: string; description: string | null; laborer_count?: number };
export type ApiProject = { project_id: number; project_name: string; client_name: string | null; location: string | null; start_date: string | null; end_date: string | null; approved_budget: string | number; remaining_budget: string | number; deadline: string | null; status: string | null; manager_id: string | null; manager_first_name: string | null; manager_last_name: string | null; phase_count: number };
export type ApiPhase = { phase_id: number; project_id: number; project: string; project_name: string | null; description: string | null; sequence_no: number | null; project_cost: string | number | null; planned_start: string | null; planned_end: string | null; status: string | null };
export type ApiAssignment = { assignment_id: number; first_name: string; last_name: string; project: string; phase: string; role_on_task: string | null; status: string | null; assigned_at: string | null; released_at: string | null; hourly_rate_ovveride: string | number | null };
export type ApiEquipment = { equipment_id: number; equipment_name: string; equipment_type: string | null; hourly_rental_rate: string | number | null; equipment_status: string | null };
export type ApiMaterial = { material_id: number; material_name: string; unit_of_measure: string | null; unit_cost: string | number | null };
export type ApiSupplier = { supplier_id: number; supplier_name: string; contact_name: string | null; contact_num: string | null; city: string | null; state_province: string | null; country: string | null };
export type ApiAuditEvent = { audit_log_id: number; project_id: number; project_name: string | null; table_name: string; record_id: number; action_type: string; old_value: unknown; new_value: unknown; charge_at: string | null; id_number: string | null; first_name: string | null; last_name: string | null };
export type ApiLoginToken = { id: number; token_name: string; id_number: string | null; first_name: string | null; last_name: string | null; last_used_at: string | null; created_at: string | null };
export type ApiDbTable = { name: string; approx_rows?: number; data_kb?: number; index_kb?: number };
export type ApiDatabaseTable = { table: string; rows: number };
export type ApiSystemInfo = { app_name: string; environment: string; laravel_version: string; php_version: string; database_driver: string; database_server: string; database_name: string; database_host: string; timezone: string; debug_mode: boolean; cache_driver: string; session_driver: string; queue_driver: string };
export type ApiRoleItem = { role_id: number; role_name: string; description: string | null };
export type ApiDashboardData = { metrics: { total_users: number; active_users: number; skills: number; projects: number; audit_events_today: number; active_sessions: number }; roles: Record<string, number>; activity: { day: string; total: number }[]; recent: { id: number; table_name: string; record_id: number; action_type: string; charge_at: string | null; project_name: string | null; id_number: string | null; first_name: string | null; last_name: string | null }[] };
export type ApiSearchResults = { users: { user_id: number; id_number: string; first_name: string; last_name: string; email: string; is_active: boolean }[]; skills: ApiSkill[]; projects: { project_id: number; project_name: string; client_name: string | null; location: string | null; status: string | null }[] };

// --- admin console endpoints --------------------------------------------------

export const listSkills = async () => (await request<{ data: ApiSkill[] }>("/skills")).data;
export const createSkill = (body: { skill_name: string; description?: string | null }) => request<{ message: string; data: ApiSkill }>("/skills", { method: "POST", body });
export const updateSkill = (id: number, body: { skill_name: string; description?: string | null }) => request<{ message: string; data: ApiSkill }>(`/skills/${id}`, { method: "PUT", body });
export const deleteSkill = (id: number) => request<{ message: string }>(`/skills/${id}`, { method: "DELETE" });
export const listRoles = async () => (await request<{ data: ApiRoleItem[] }>("/roles")).data;
export const setUserActive = (id: number, active: boolean) => request<{ message: string }>(`/users/${id}/${active ? "activate" : "deactivate"}`, { method: "PATCH" });
export const createUser = (body: Record<string, unknown>) => request<{ message: string; data: ApiUserRow }>("/users", { method: "POST", body });
export const getAdminDashboard = () => request<ApiDashboardData>("/admin/dashboard");
export const getAdminProjects = async () => (await request<{ data: ApiProject[] }>("/admin/projects")).data;
export const getAdminPhases = async () => (await request<{ data: ApiPhase[] }>("/admin/phases")).data;
export const getAdminAssignments = async () => (await request<{ data: ApiAssignment[] }>("/admin/assignments")).data;
export const getAdminResources = () => request<{ equipment: ApiEquipment[]; materials: ApiMaterial[]; suppliers: ApiSupplier[] }>("/admin/resources");
export const getAuditEvents = async () => (await request<{ data: ApiAuditEvent[] }>("/admin/audit/events")).data;
export const getAuditLogins = async () => (await request<{ data: ApiLoginToken[] }>("/admin/audit/logins")).data;
export const getAuditDb = () => request<{ data: ApiDbTable[]; server_version: string | null }>("/admin/audit/db");
export const getDatabaseTables = async () => (await request<{ data: ApiDatabaseTable[] }>("/admin/database")).data;
export const getSystemInfo = async () => (await request<{ data: ApiSystemInfo }>("/admin/system")).data;
export const searchAll = (q: string) => request<ApiSearchResults>(`/admin/search?q=${encodeURIComponent(q)}`);