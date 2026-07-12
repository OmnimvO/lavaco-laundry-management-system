export type UserRole =
  | "ADMIN"
  | "STAFF";

export type UserStatus =
  | "ACTIVE"
  | "INACTIVE";

export type LinkedEmployee = {
  id: number;

  firstName: string;
  lastName: string;

  phone?: string | null;

  position: string;
  status: string;
};

export type UserAccount = {
  id: number;

  name: string;
  email: string;

  role: UserRole;
  status: UserStatus;

  employeeId?: number | null;
  employee?: LinkedEmployee | null;

  createdAt: string;
  updatedAt: string;
};

export type CreateUserData = {
  name: string;
  email: string;
  password: string;

  role: UserRole;
  status: UserStatus;

  employeeId?: number | null;
};

export type UpdateUserData = {
  name?: string;
  email?: string;

  role?: UserRole;
  status?: UserStatus;

  employeeId?: number | null;
};

export type ResetPasswordData = {
  newPassword: string;
};