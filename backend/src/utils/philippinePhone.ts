const PHILIPPINE_MOBILE_PATTERN =
  /^639\d{9}$/;

export function normalizePhilippinePhone(
  value: unknown
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  let digits = value.replace(/\D/g, "");

  if (
    digits.startsWith("09") &&
    digits.length === 11
  ) {
    digits = `63${digits.slice(1)}`;
  } else if (
    digits.startsWith("9") &&
    digits.length === 10
  ) {
    digits = `63${digits}`;
  }

  if (
    !PHILIPPINE_MOBILE_PATTERN.test(
      digits
    )
  ) {
    return null;
  }

  return digits;
}

export function formatPhilippinePhone(
  value: string | null | undefined
) {
  const normalized =
    normalizePhilippinePhone(value);

  if (!normalized) {
    return value ?? "";
  }

  const localNumber =
    `0${normalized.slice(2)}`;

  return `${localNumber.slice(
    0,
    4
  )} ${localNumber.slice(
    4,
    7
  )} ${localNumber.slice(7)}`;
}

export function normalizeSearchText(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return normalized || null;
}