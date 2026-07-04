import prisma from "../lib/prisma.js";

export const customerService = {
  createCustomer: async (data: {
    name: string;
    phone?: string;
    address?: string;
  }) => {
    return prisma.customer.create({
      data,
    });
  },

  getAllCustomers: async () => {
    return prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  getCustomerById: async (id: number) => {
    return prisma.customer.findUnique({
      where: { id },
    });
  },

  updateCustomer: async (
    id: number,
    data: {
      name?: string;
      phone?: string;
      address?: string;
    }
  ) => {
    return prisma.customer.update({
      where: { id },
      data,
    });
  },

  deleteCustomer: async (id: number) => {
    return prisma.customer.delete({
      where: { id },
    });
  },
};