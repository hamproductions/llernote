import { useSyncExternalStore } from 'react';
import {
  attendanceStore,
  getActiveRecords,
  myPickStore,
  removeAttendance,
  setAttendance,
  setMyPick,
  updateAttendance,
  type AttendanceMap
} from '~/utils/attendance/storage';
import type { MyPick } from '~/types/attendance';

const EMPTY_MAP: AttendanceMap = {};

export const useAttendance = () => {
  const map = useSyncExternalStore(
    (cb) => attendanceStore.subscribe(cb),
    () => attendanceStore.get(),
    () => EMPTY_MAP
  );

  return {
    map,
    records: getActiveRecords(map),
    get: (performanceId: string) => {
      const record = map[performanceId];
      return record && !record.deleted ? record : undefined;
    },
    setAttendance,
    updateAttendance,
    removeAttendance
  };
};

export const useMyPick = () => {
  const myPick = useSyncExternalStore(
    (cb) => myPickStore.subscribe(cb),
    () => myPickStore.get(),
    () => null as MyPick | null
  );

  return { myPick, setMyPick };
};
