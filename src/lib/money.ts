const MONEY_SCALE = 100;

export function toMinorUnits(value: number | string | null | undefined): number {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : 0;

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round((parsed + Number.EPSILON) * MONEY_SCALE);
}

export function fromMinorUnits(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value / MONEY_SCALE;
}

export function normalizeMoney(value: number | string | null | undefined): number {
  return fromMinorUnits(toMinorUnits(value));
}

export function sumMinorUnits(values: Array<number | string | null | undefined>): number {
  return values.reduce<number>((sum, value) => sum + toMinorUnits(value), 0);
}

export function multiplyMoneyToMinorUnits(quantity: number, unitPrice: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 0;
  }

  return Math.max(0, Math.round(quantity * toMinorUnits(unitPrice)));
}

export function percentageOfMinorUnits(amountMinor: number, rate: number): number {
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
    return 0;
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    return 0;
  }

  return Math.round((amountMinor * rate) / 100);
}
