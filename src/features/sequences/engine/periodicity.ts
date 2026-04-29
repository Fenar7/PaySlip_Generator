import type { SequencePeriodicity } from "@/generated/prisma/client";

export interface PeriodBoundaries {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate period boundaries for a given document date and periodicity.
 *
 * NONE:      Eternal period (1970-01-01 to 2999-12-31)
 * MONTHLY:   Start = 1st of month, End = last day of month
 * YEARLY:    Start = Jan 1, End = Dec 31
 * FINANCIAL_YEAR: Start = fiscal year start, End = fiscal year end
 */
export function calculatePeriodBoundaries(
  documentDate: Date,
  periodicity: SequencePeriodicity,
  fiscalYearStartMonth: number = 4
): PeriodBoundaries {
  const year = documentDate.getFullYear();
  const month = documentDate.getMonth(); // 0-11

  switch (periodicity) {
    case "NONE":
      return {
        startDate: new Date(Date.UTC(1970, 0, 1)),
        endDate: new Date(Date.UTC(2999, 11, 31)),
      };

    case "MONTHLY": {
      const startDate = new Date(Date.UTC(year, month, 1));
      const endDate = new Date(Date.UTC(year, month + 1, 0)); // day 0 of next month = last day of current
      return { startDate, endDate };
    }

    case "YEARLY": {
      const startDate = new Date(Date.UTC(year, 0, 1));
      const endDate = new Date(Date.UTC(year, 11, 31));
      return { startDate, endDate };
    }

    case "FINANCIAL_YEAR": {
      const fyStartMonth = fiscalYearStartMonth - 1; // convert to 0-11
      const isAfterStart = month >= fyStartMonth;
      const startYear = isAfterStart ? year : year - 1;
      const startDate = new Date(Date.UTC(startYear, fyStartMonth, 1));
      const endDate = new Date(Date.UTC(startYear + 1, fyStartMonth, 0));
      return { startDate, endDate };
    }

    default:
      throw new Error(`Unsupported periodicity: ${periodicity}`);
  }
}

/**
 * Check if a document date falls within a given period.
 */
export function isDateInPeriod(
  documentDate: Date,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const date = stripTime(documentDate);
  const start = stripTime(periodStart);
  const end = stripTime(periodEnd);
  return date >= start && date <= end;
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
