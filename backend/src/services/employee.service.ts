import prisma from "../lib/prisma.js";
import {
  EmployeePosition,
  EmployeeStatus,
} from "../generated/prisma/client.js";

type CreateEmployeeData = {
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  position: EmployeePosition;
  status?: EmployeeStatus;
  dateHired: Date;
  notes?: string | null;
};

type UpdateEmployeeData = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  address?: string | null;
  position?: EmployeePosition;
  status?: EmployeeStatus;
  dateHired?: Date;
  notes?: string | null;
};

export const employeeService = {
  createEmployee: async (
    data: CreateEmployeeData
  ) => {
    return prisma.employee.create({
      data,
    });
  },

  getAllEmployees: async () => {
    return prisma.employee.findMany({
      orderBy: [
        {
          status: "asc",
        },
        {
          lastName: "asc",
        },
        {
          firstName: "asc",
        },
      ],
    });
  },

  getEmployeeById: async (id: number) => {
    return prisma.employee.findUnique({
      where: {
        id,
      },
    });
  },

  updateEmployee: async (
    id: number,
    data: UpdateEmployeeData
  ) => {
    return prisma.employee.update({
      where: {
        id,
      },
      data,
    });
  },

  deleteEmployee: async (id: number) => {
    return prisma.employee.delete({
      where: {
        id,
      },
    });
  },
};