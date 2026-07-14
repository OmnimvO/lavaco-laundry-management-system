import type {
  Prisma,
} from "../generated/prisma/client.js";

import {
  normalizePhilippinePhone,
  normalizeSearchText,
} from "../utils/philippinePhone.js";

type TransactionClient =
  Prisma.TransactionClient;

type WalkInCustomerData = {
  name: string;
  phone?: string | null;
  address?: string | null;
};

export async function findOrCreateWalkInCustomer(
  transaction: TransactionClient,
  data: WalkInCustomerData
) {
  const name = data.name.trim();

  const normalizedPhone =
    normalizePhilippinePhone(
      data.phone
    );

  const normalizedName =
    normalizeSearchText(name);

  const address =
    data.address?.trim() || null;

  const normalizedAddress =
    normalizeSearchText(address);

  if (data.phone && !normalizedPhone) {
    throw new Error(
      "Please enter a valid Philippine mobile number."
    );
  }

  if (normalizedPhone) {
    const existingByPhone =
      await transaction.customer.findFirst({
        where: {
          normalizedPhone,
          isArchived: false,
        },
      });

    if (existingByPhone) {
      return {
        customer:
          existingByPhone,
        wasCreated: false,
        matchedBy: "PHONE" as const,
      };
    }
  }

  if (
    normalizedName &&
    normalizedAddress
  ) {
    const existingByNameAndAddress =
      await transaction.customer.findFirst({
        where: {
          normalizedName,
          normalizedAddress,
          isArchived: false,
        },
      });

    if (
      existingByNameAndAddress
    ) {
      return {
        customer:
          existingByNameAndAddress,
        wasCreated: false,
        matchedBy:
          "NAME_AND_ADDRESS" as const,
      };
    }
  }

  if (normalizedName) {
    const customersWithSameName =
      await transaction.customer.findMany({
        where: {
          normalizedName,
          isArchived: false,
        },

        take: 2,

        orderBy: {
          createdAt: "asc",
        },
      });

    if (
      customersWithSameName.length ===
      1
    ) {
      return {
        customer:
          customersWithSameName[0],
        wasCreated: false,
        matchedBy:
          "UNIQUE_NAME" as const,
      };
    }
  }

  const customer =
    await transaction.customer.create({
      data: {
        name,
        phone:
          normalizedPhone ||
          data.phone?.trim() ||
          null,
        normalizedPhone,
        normalizedName,
        address,
        normalizedAddress,
      },
    });

  return {
    customer,
    wasCreated: true,
    matchedBy: "CREATED" as const,
  };
}