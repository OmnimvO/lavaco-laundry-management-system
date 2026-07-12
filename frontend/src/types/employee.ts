export type Employee = {
  id: number;

  firstName: string;
  lastName: string;

  phone?: string | null;
  address?: string | null;

  position: string;
  status: string;

  dateHired: string;
  notes?: string | null;

  createdAt: string;
  updatedAt: string;
};