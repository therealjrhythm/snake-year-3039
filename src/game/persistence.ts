import { CONTENT_VERSION, LEGACY_CONTENT_VERSION } from './content';

export interface LocalRecord {
  runId: string;
  score: number;
  cores: number;
  rivalKills: number;
  wave: number;
  elapsed: number;
  completed: boolean;
  difficulty: string;
  date: string;
  cause: string;
  contentVersion?: string;
  mode?: string;
  districtId?: string;
  seed?: number;
}

export const recordVersion = (record: LocalRecord): string => record.contentVersion ?? LEGACY_CONTENT_VERSION;
export const recordVersionLabel = (record: LocalRecord): string => recordVersion(record) === CONTENT_VERSION ? 'Expanded 36 × 26' : 'Legacy 32 × 24';

interface SavedEnvelope { schema: 1; savedAt: string; snapshot: unknown }
const DATABASE = 'snake-year-3039';
const VERSION = 1;
const SAVE_KEY = 'suspended-run';
const CHECKPOINT_KEY = 'checkpoint';
let databasePromise: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Saved runs require IndexedDB.')); return; }
    const request = indexedDB.open(DATABASE, VERSION);
    let settled = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('runs')) db.createObjectStore('runs');
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'runId' });
    };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) { db.close(); return; }
      settled = true;
      db.onversionchange = () => { db.close(); databasePromise = null; };
      resolve(db);
    };
    request.onerror = () => { settled = true; reject(request.error ?? new Error('Could not open saved-run storage.')); };
    request.onblocked = () => { settled = true; reject(new Error('Saved-run storage is blocked by another game window.')); };
  }).catch((error: unknown) => { databasePromise = null; throw error; });
  return databasePromise;
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Saved-run transaction was aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Saved-run transaction failed.'));
  });
}

function isRecord(value: unknown): value is LocalRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.runId === 'string' && record.runId.length > 0
    && ['score', 'cores', 'rivalKills', 'wave', 'elapsed'].every(key => typeof record[key] === 'number' && Number.isFinite(record[key]) && Number(record[key]) >= 0)
    && typeof record.completed === 'boolean'
    && typeof record.difficulty === 'string'
    && typeof record.date === 'string' && Number.isFinite(Date.parse(record.date))
    && typeof record.cause === 'string'
    && (record.contentVersion === undefined || [CONTENT_VERSION, LEGACY_CONTENT_VERSION].includes(String(record.contentVersion)))
    && (record.mode === undefined || record.mode === 'campaign')
    && (record.districtId === undefined || record.districtId === 'D1')
    && (record.seed === undefined || typeof record.seed === 'number' && Number.isInteger(record.seed));
}

async function getSnapshot(key: string): Promise<unknown | null> {
  const db = await database();
  const transaction = db.transaction('runs', 'readonly');
  const done = transactionDone(transaction);
  const request = transaction.objectStore('runs').get(key);
  await done;
  const envelope: unknown = request.result;
  if (!envelope || typeof envelope !== 'object') return null;
  const value = envelope as Partial<SavedEnvelope>;
  if (value.schema !== 1 || typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt)) || !value.snapshot || typeof value.snapshot !== 'object') return null;
  return value.snapshot;
}

async function putSnapshot(key: string, snapshot: unknown): Promise<void> {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Cannot save an invalid run snapshot.');
  const db = await database();
  const transaction = db.transaction('runs', 'readwrite');
  const done = transactionDone(transaction);
  try {
    transaction.objectStore('runs').put({ schema: 1, savedAt: new Date().toISOString(), snapshot } satisfies SavedEnvelope, key);
  } catch (error) {
    transaction.abort();
    await done.catch(() => undefined);
    throw error;
  }
  await done;
}

/** Snapshots remain untrusted until Simulation.restore validates the game schema. */
export function getSavedRun(): Promise<unknown | null> { return getSnapshot(SAVE_KEY); }
export function saveRun(snapshot: unknown): Promise<void> { return putSnapshot(SAVE_KEY, snapshot); }
export function getCheckpoint(): Promise<unknown | null> { return getSnapshot(CHECKPOINT_KEY); }
export function saveCheckpoint(snapshot: unknown): Promise<void> { return putSnapshot(CHECKPOINT_KEY, snapshot); }

export async function clearSavedRun(): Promise<void> {
  const db = await database();
  const transaction = db.transaction('runs', 'readwrite');
  const done = transactionDone(transaction);
  transaction.objectStore('runs').delete(SAVE_KEY);
  await done;
}

export async function getRecords(): Promise<LocalRecord[]> {
  const db = await database();
  const transaction = db.transaction('records', 'readonly');
  const done = transactionDone(transaction);
  const request = transaction.objectStore('records').getAll();
  await done;
  const records: unknown[] = request.result;
  return records.filter(isRecord).sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
}

/** A run has one record by runId. Final record and suspended-save removal commit together. */
export async function commitRecord(record: LocalRecord): Promise<void> {
  if (!isRecord(record)) throw new Error('Cannot store an invalid run record.');
  const db = await database();
  const transaction = db.transaction(['runs', 'records'], 'readwrite');
  const done = transactionDone(transaction);
  try {
    transaction.objectStore('records').put(record);
    transaction.objectStore('runs').delete(SAVE_KEY);
  } catch (error) {
    transaction.abort();
    await done.catch(() => undefined);
    throw error;
  }
  await done;
}
