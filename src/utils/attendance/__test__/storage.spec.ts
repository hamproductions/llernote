import { beforeEach, describe, expect, it } from 'vitest';
import {
  attendanceStore,
  deleteMyPickSlot,
  exportBackup,
  getActiveRecords,
  importBackup,
  myPickSlotsStore,
  overwriteMyPickSlot,
  removeAttendance,
  renameMyPickSlot,
  saveMyPickSlot,
  setActiveMyPickSlot,
  setAttendance,
  updateAttendance
} from '../storage';

describe('attendance storage', () => {
  beforeEach(() => {
    localStorage.clear();
    attendanceStore.set({});
  });

  it('saves an attendance record', () => {
    setAttendance('1', 'attended');
    const records = getActiveRecords(attendanceStore.get());
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ performanceId: '1', status: 'attended' });
    expect(records[0]?.createdAt).toBeTruthy();
  });

  it('updates an existing record', () => {
    setAttendance('1', 'attended');
    updateAttendance('1', { rating: 5, memo: 'great' });
    const record = attendanceStore.get()['1'];
    expect(record).toMatchObject({ rating: 5, memo: 'great', status: 'attended' });
  });

  it('removes via tombstone, keeps record for sync', () => {
    setAttendance('1', 'attended');
    removeAttendance('1');
    expect(getActiveRecords(attendanceStore.get())).toHaveLength(0);
    expect(attendanceStore.get()['1']?.deleted).toBe(true);
  });

  it('re-marking after removal resets createdAt', () => {
    setAttendance('1', 'attended');
    removeAttendance('1');
    setAttendance('1', 'interested');
    const record = attendanceStore.get()['1'];
    expect(record).toMatchObject({ status: 'interested', deleted: false });
  });

  it('ignores updates to deleted records', () => {
    setAttendance('1', 'attended');
    removeAttendance('1');
    updateAttendance('1', { memo: 'nope' });
    expect(attendanceStore.get()['1']?.memo).toBeUndefined();
  });

  it('export/import round-trips', () => {
    setAttendance('1', 'attended', { memo: 'seat A1' });
    const backup = exportBackup();
    attendanceStore.set({});
    importBackup(backup);
    expect(attendanceStore.get()['1']).toMatchObject({ memo: 'seat A1', status: 'attended' });
  });

  it('import merges by last-write-wins', () => {
    setAttendance('1', 'attended');
    const backup = exportBackup();
    backup.attendance['1'] = {
      ...backup.attendance['1']!,
      status: 'interested',
      updatedAt: '2099-01-01T00:00:00.000Z'
    };
    backup.attendance['2'] = {
      performanceId: '2',
      status: 'attended',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z'
    };
    importBackup(backup);
    expect(attendanceStore.get()['1']?.status).toBe('interested');
    expect(attendanceStore.get()['2']?.status).toBe('attended');
  });

  it('import keeps newer local records', () => {
    setAttendance('1', 'attended');
    importBackup({
      version: 1,
      exportedAt: '',
      attendance: {
        '1': {
          performanceId: '1',
          status: 'interested',
          createdAt: '2000-01-01T00:00:00.000Z',
          updatedAt: '2000-01-01T00:00:00.000Z'
        }
      }
    });
    expect(attendanceStore.get()['1']?.status).toBe('attended');
  });

  it('rejects invalid backup data', () => {
    expect(() => importBackup(JSON.parse('"garbage"'))).toThrow();
  });
});

describe('mypick save slots', () => {
  beforeEach(() => {
    localStorage.clear();
    myPickSlotsStore.set({ slots: [], activeId: null });
  });

  it('saves a slot and marks it active', () => {
    const slot = saveMyPickSlot('All time', { cells: { a: '1' } });
    const state = myPickSlotsStore.get();
    expect(state.slots).toHaveLength(1);
    expect(state.slots[0]).toMatchObject({ name: 'All time', cells: { a: '1' } });
    expect(state.activeId).toBe(slot.id);
  });

  it('falls back to a default name when blank', () => {
    const slot = saveMyPickSlot('   ', { cells: {} });
    expect(slot.name).toBe('MyPick');
  });

  it('renames a slot', () => {
    const slot = saveMyPickSlot('old', { cells: {} });
    renameMyPickSlot(slot.id, '2025');
    expect(myPickSlotsStore.get().slots[0]?.name).toBe('2025');
  });

  it('overwrites a slot with a new snapshot and activates it', () => {
    const a = saveMyPickSlot('a', { cells: { x: '1' } });
    saveMyPickSlot('b', { cells: {} });
    overwriteMyPickSlot(a.id, { cells: { x: '2', y: '3' } });
    const state = myPickSlotsStore.get();
    expect(state.slots.find((s) => s.id === a.id)?.cells).toEqual({ x: '2', y: '3' });
    expect(state.activeId).toBe(a.id);
  });

  it('deletes a slot and clears active when it was active', () => {
    const slot = saveMyPickSlot('a', { cells: {} });
    deleteMyPickSlot(slot.id);
    const state = myPickSlotsStore.get();
    expect(state.slots).toHaveLength(0);
    expect(state.activeId).toBeNull();
  });

  it('snapshots are decoupled from later edits', () => {
    const cells: Record<string, string | null> = { a: '1' };
    saveMyPickSlot('snap', { cells });
    cells.a = 'mutated';
    expect(myPickSlotsStore.get().slots[0]?.cells.a).toBe('1');
  });

  it('round-trips slots through backup export/import', () => {
    saveMyPickSlot('keep', { cells: { a: '1' } });
    const backup = exportBackup();
    expect(backup.version).toBe(2);
    myPickSlotsStore.set({ slots: [], activeId: null });
    importBackup(backup);
    expect(myPickSlotsStore.get().slots).toHaveLength(1);
    expect(myPickSlotsStore.get().slots[0]?.name).toBe('keep');
  });

  it('import keeps the newer slot by updatedAt', () => {
    const slot = saveMyPickSlot('local', { cells: {} });
    setActiveMyPickSlot(slot.id);
    importBackup({
      version: 2,
      exportedAt: '',
      attendance: {},
      myPickSlots: {
        activeId: null,
        slots: [
          {
            id: slot.id,
            name: 'stale',
            cells: {},
            createdAt: '2000-01-01T00:00:00.000Z',
            updatedAt: '2000-01-01T00:00:00.000Z'
          }
        ]
      }
    });
    expect(myPickSlotsStore.get().slots).toHaveLength(1);
    expect(myPickSlotsStore.get().slots[0]?.name).toBe('local');
  });
});
