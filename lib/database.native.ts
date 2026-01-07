import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { Tessera } from '../types';

import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
const db = isWeb ? null : SQLite.openDatabaseSync('mosaic.db');

export interface LocalTessera extends Tessera {
  sync_status: 'pending' | 'synced' | 'failed';
}

export const initDatabase = () => {
  if (!db) return;
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_tesserae (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        mosaic_id TEXT,
        text TEXT,
        source_url TEXT,
        source_domain TEXT,
        note TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'ready',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending'
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_mosaics (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
    
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        target_id TEXT NOT NULL,
        payload TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Local Database Initialized');
  } catch (error) {
    console.error('Database Initialization Failed:', error);
  }
};

export const addLocalTessera = (tessera: Partial<Tessera>): LocalTessera => {
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  
  const newLocalTessera = {
    id,
    user_id: tessera.user_id || 'guest',
    mosaic_id: tessera.mosaic_id || null,
    text: tessera.text || null,
    source_url: tessera.source_url || null,
    source_domain: tessera.source_domain || null,
    note: tessera.note || null,
    image_url: tessera.image_url || null,
    status: tessera.status || 'ready',
    created_at: now,
    updated_at: now,
    sync_status: 'pending' as const,
  } as LocalTessera;

  if (!db) {
    console.log('Web Mode: Skipping SQLite insert');
    return newLocalTessera;
  }

  try {
    db.runSync(
      `INSERT INTO local_tesserae (id, user_id, mosaic_id, text, source_url, source_domain, note, image_url, status, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newLocalTessera.id,
        newLocalTessera.user_id ?? '',
        newLocalTessera.mosaic_id ?? null,
        newLocalTessera.text ?? null,
        newLocalTessera.source_url ?? null,
        newLocalTessera.source_domain ?? null,
        newLocalTessera.note ?? null,
        newLocalTessera.image_url ?? null,
        newLocalTessera.status ?? 'ready',
        newLocalTessera.created_at,
        newLocalTessera.updated_at,
        newLocalTessera.sync_status
      ]
    );

    db.runSync(
      `INSERT INTO sync_queue (action, target_id, payload) VALUES (?, ?, ?)`,
      ['INSERT', id, JSON.stringify(newLocalTessera)]
    );
    
    console.log('Saved to Local DB:', id);
    return newLocalTessera;
  } catch (e) {
    console.error('Failed to save locally:', e);
    throw e;
  }
};

export const getLocalTesserae = (): LocalTessera[] => {
  if (!db) return [];
  try {
    const results = db.getAllSync<LocalTessera>(`SELECT * FROM local_tesserae ORDER BY created_at DESC`);
    return results;
  } catch (e) {
    console.error('Failed to fetch local tesserae:', e);
    return [];
  }
};

// 추후 동기화 로직에서 사용
export const getPendingSyncItems = () => {
    if (!db) return [];
    return db.getAllSync<{id: number, action: string, target_id: string, payload: string}>(
        `SELECT * FROM sync_queue ORDER BY created_at ASC`
    );
};

export const removeSyncItem = (queueId: number) => {
    if (!db) return;
    db.runSync(`DELETE FROM sync_queue WHERE id = ?`, [queueId]);
};

export const getLocalMosaics = () => {
  if (!db) return [];
  return db.getAllSync<{ id: string, name: string, user_id: string, is_default: number, created_at: string }>('SELECT * FROM local_mosaics ORDER BY created_at DESC');
};

export const saveLocalMosaics = (mosaics: any[]) => {
  if (!db) return;
  try {
    mosaics.forEach(m => {
      db.runSync(`
        INSERT OR REPLACE INTO local_mosaics (id, user_id, name, is_default, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [m.id, m.user_id, m.name, m.is_default ? 1 : 0, m.created_at]);
    });
  } catch (e) {
    console.error('Failed to cache mosaics:', e);
  }
};

export const updateLocalTesseraStatus = (id: string, status: 'synced' | 'failed') => {
    if (!db) return;
    db.runSync(`UPDATE local_tesserae SET sync_status = ? WHERE id = ?`, [status, id]);
};

export const deleteLocalTessera = (id: string) => {
    if (!db) return;
    db.runSync('DELETE FROM local_tesserae WHERE id = ?', [id]);
    // TODO: Add DELETE action to sync_queue if needed
};
