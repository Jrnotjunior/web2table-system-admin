export type AuditDatePreset = 'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM';

export type AuditDateRange = {
  startDate: string | null;
  endDate: string | null;
};

/** Convert the selected audit date preset into inclusive-start, exclusive-end ISO bounds. */
export function getAuditDateRange(
  preset: AuditDatePreset,
  customStartDate: string,
  customEndDate: string,
  now = new Date(),
): AuditDateRange {
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (preset === 'TODAY') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else if (preset === '7_DAYS') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else if (preset === '30_DAYS') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    startDate = start.toISOString();
    endDate = end.toISOString();
  } else if (preset === 'CUSTOM') {
    if (customStartDate) startDate = new Date(customStartDate + 'T00:00:00').toISOString();
    if (customEndDate) {
      const end = new Date(customEndDate + 'T00:00:00');
      end.setDate(end.getDate() + 1);
      endDate = end.toISOString();
    }
  }

  return { startDate, endDate };
}
