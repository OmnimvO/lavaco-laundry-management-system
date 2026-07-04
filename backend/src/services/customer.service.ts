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
};