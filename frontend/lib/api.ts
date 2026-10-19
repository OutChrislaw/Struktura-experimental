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
