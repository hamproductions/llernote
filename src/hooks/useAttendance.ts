import { useSyncExternalStore } from 'react';
import {
  attendanceStore,
  deleteMyPickSlot,
  getActiveRecords,
  myPickSlotsStore,
  myPickStore,
  overwriteMyPickSlot,
  removeAttendance,
  renameMyPickSlot,
  saveMyPickSlot,
  setActiveMyPickSlot,
  setAttendance,
  setMyPick,
  updateAttendance,
  type AttendanceMap
} from '~/utils/attendance/storage';
import type { MyPick, MyPickSaveSlots } from '~/types/attendance';

const EMPTY_MAP: AttendanceMap = {};
const EMPTY_SLOTS: MyPickSaveSlots = { slots: [], activeId: null };

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

export const useMyPickSlots = () => {
  const value = useSyncExternalStore(
    (cb) => myPickSlotsStore.subscribe(cb),
    () => myPickSlotsStore.get(),
    () => EMPTY_SLOTS
  );

  return {
    slots: value.slots,
    activeId: value.activeId,
    saveMyPickSlot,
    renameMyPickSlot,
    overwriteMyPickSlot,
    deleteMyPickSlot,
    setActiveMyPickSlot
  };
};
