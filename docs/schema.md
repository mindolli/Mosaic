### 3-1. 주요 엔티티(추천 확정)

### `users`

- `id (uuid, pk)`
- `created_at`

### `folders`

- `id (uuid, pk)`
- `user_id (fk users.id)`
- `name (text)`
- `created_at`
- (옵션) `cover_clip_id (uuid)`

### `tags`

- `id (uuid, pk)`
- `user_id`
- `name (text)` ← lowercase normalize 권장
- `created_at`
- (권장) unique(user_id, name)

### `clips` ✅ 핵심

- `id (uuid, pk)`
- `user_id`
- `folder_id (fk folders.id, nullable)` ← MVP에선 1개 폴더로 단순화
- `source_url (text, nullable)`
- `source_domain (text, nullable)`
- `text (text, nullable)` ← 선택 텍스트/짧은 메모용
- `note (text, nullable)` ← 사용자 추가 메모(선택)
- `thumb_path (text, nullable)` ← storage 경로
- `thumb_width (int, nullable)`
- `thumb_height (int, nullable)`
- `blurhash (text, nullable)` ← 선택
- `status (text)` ← `pending_upload | ready | pending_retry | failed`
- `last_error (text, nullable)`
- `created_at`, `updated_at`

### `clip_tags` (N:M)

- `clip_id (fk clips.id)`
- `tag_id (fk tags.id)`
- `pk(clip_id, tag_id)`

---

### 3-2. 로컬 저장/동기화 구조(오프라인/재시도)

### 로컬 DB(예: SQLite)

- `local_clips` (또는 clips를 로컬에도 동일 스키마로)
- `sync_queue` ✅ 권장
    - `id (uuid)`
    - `op (text)` : `create_clip | upload_thumb | update_clip | delete_clip`
    - `clip_id`
    - `payload_json (text)`
    - `retry_count (int)`
    - `last_error (text)`
    - `next_retry_at (timestamp)`
    - `created_at`

**규칙**

- 공유 진입 → 로컬에 먼저 저장 + 썸네일 임시파일 저장 → `sync_queue`에 enqueue
- 온라인이면 즉시 실행, 실패하면 백오프 재시도
- 성공하면 `status=ready`로 업데이트

---

## 스토리지 Path 규칙 + 권한 설계(비공개)

### 3-3. Storage 버킷/경로 규칙(추천)

- bucket: `thumbs`
- path:
    - `userId/clipId/thumb.jpg`
    - (WebP면) `userId/clipId/thumb.webp`

### 3-4. 접근 권한(“타인 공유 금지” 요구 반영)

- 기본: **Private bucket** (유저 본인만 접근)
- 앱에서 이미지 보여줄 때:
    - (Supabase 기준) **signed URL 발급** 또는 **권한 있는 클라이언트 SDK로 fetch**
- 캐시 전략:
    - signed URL 만료는 적당히(예: 1시간~24시간)
    - 클라이언트 캐시(메모리/디스크)로 스크롤 성능 확보

### 3-5. 부록

- **(Later) Storage 대체안:** Supabase Storage 대신 Cloudflare R2로 썸네일 저장소를 분리하고, Workers로 인증/서명 URL을 처리한다. DB/Auth는 Supabase 유지

---

### MVP 정책(단순)

- URL만 들어오면:
    - `thumb_path` 없이 저장(텍스트/도메인 카드)
    - `status=ready` (이미지가 없는 ready)

### 개선 정책(추천: FastAPI 메타 추출)

- URL 입력 → 서버가 OG 이미지/제목 가져와 썸네일 생성 후 `clips.thumb_*` 갱신