import type { AttendanceRecord } from '~/types/attendance';
import type { EventCategory, Performance } from '~/types';

export const isInPersonCategory = (category: EventCategory) => category === 'live';

export const isInPersonEvent = (performance: Pick<Performance, 'category'> | undefined) =>
  performance?.category === 'live';

export const isWitnessed = (
  record: Pick<AttendanceRecord, 'status' | 'watchType' | 'deleted'> | undefined,
  performance: Pick<Performance, 'category'> | undefined
): boolean =>
  !!record &&
  !record.deleted &&
  record.status === 'attended' &&
  performance?.category === 'live' &&
  (record.watchType ?? 'live') === 'live';

// Watched = you logged it but were not physically there (online/TV, or a live show
// you caught on stream/delay). The remote counterpart of isWitnessed.
export const isWatched = (
  record: Pick<AttendanceRecord, 'status' | 'watchType' | 'deleted'> | undefined,
  performance: Pick<Performance, 'category'> | undefined
): boolean =>
  !!record &&
  !record.deleted &&
  record.status === 'attended' &&
  !!performance &&
  !isWitnessed(record, performance);

export type Scope = 'all' | 'inperson' | 'remote';

export const scopeMatches = (scope: Scope, category: EventCategory): boolean =>
  scope === 'all' ? true : scope === 'inperson' ? category === 'live' : category !== 'live';

// Split attendance records into in-person (witnessed) vs remote (watched) id sets.
export const partitionAttendance = (
  records: AttendanceRecord[],
  performanceById: Map<string, Pick<Performance, 'category'>>
): { witnessed: Set<string>; watched: Set<string> } => {
  const witnessed = new Set<string>();
  const watched = new Set<string>();
  for (const record of records) {
    const performance = performanceById.get(record.performanceId);
    if (isWitnessed(record, performance)) witnessed.add(record.performanceId);
    else if (isWatched(record, performance)) watched.add(record.performanceId);
  }
  return { witnessed, watched };
};
