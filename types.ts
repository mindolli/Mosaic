export type Mosaic = {
  id: string;
  user_id: string;
  name: string;
  cover_tessera_id?: string | null;
  created_at: string;
};

export type Tessera = {
  id: string;
  user_id: string;
  mosaic_id?: string | null;
  source_url?: string | null;
  source_domain?: string | null;
  text?: string | null;
  note?: string | null;
  thumb_path?: string | null;
  thumb_width?: number;
  thumb_height?: number;
  blurhash?: string | null;
  status: 'pending_upload' | 'ready' | 'pending_retry' | 'failed';
  last_error?: string | null;
  created_at: string;
  updated_at: string;
};
