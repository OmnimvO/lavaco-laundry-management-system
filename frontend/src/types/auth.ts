export type AuthEmployee = {
  id?: number;

  firstName?: string;
  lastName?: string;

  phone?: string | null;

  position?: string;
  status?: string;
};

export type AuthUser = {
  id: number;

  name: string;
  email: string;

  role: "ADMIN" | "STAFF";

  status: "ACTIVE" | "INACTIVE";

  employeeId: number | null;

  employee?: AuthEmployee | null;

  createdAt: string;
  updatedAt: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;

  employeeId?: number | null;
};

export type AuthResponse = {
  message: string;

  token: string;

  user: AuthUser;
};