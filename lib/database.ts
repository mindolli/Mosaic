import type { Tessera } from '../types';

export interface LocalTessera extends Tessera {
  sync_status: 'pending' | 'synced' | 'failed';
}

export const initDatabase = () => {
  console.log('Web: initDatabase (Mock)');
};

export const addLocalTessera = (tessera: Partial<Tessera>): LocalTessera => {
  console.log('Web: addLocalTessera (Mock)', tessera);
  const now = new Date().toISOString();
  return {
    id: 'web-mock-' + Date.now(),
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
    sync_status: 'pending',
    // Tessera 타입의 필수 속성들을 채워줌
  } as LocalTessera;
};

export const getLocalTesserae = (): LocalTessera[] => {
   console.log('Web: getLocalTesserae (Mock)');
   return [];
};

export const getPendingSyncItems = () => [];
export const removeSyncItem = (id: number) => {};
export const getLocalMosaics = (): { id: string, name: string, user_id: string, is_default: number, created_at: string }[] => [];
export const saveLocalMosaics = (mosaics: any[]) => {};
export const updateLocalTesseraStatus = (id: string, status: 'synced' | 'failed') => {};
export const deleteLocalTessera = (id: string) => {};
