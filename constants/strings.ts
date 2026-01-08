/**
 * 앱 전체에서 사용되는 문자열 상수
 * 나중에 다국어 지원(i18n)으로 쉽게 전환할 수 있도록 한 곳에 모아둠
 */

export const strings = {
  // 저장 화면 (save.tsx)
  save: {
    title: 'Save',
    cancel: 'Cancel',
    saveButton: 'Save',
    loginRequired: '로그인 필요',
    loginRequiredMessage: '저장하려면 로그인이 필요합니다.',
    noContent: '내용 없음',
    noContentMessage: '저장할 내용이 없습니다.',
    saveFailed: '저장 실패',
    saveFailedMessage: '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.',
    noteLabel: 'Note (optional)',
    notePlaceholder: 'Add a note...',
    urlPlaceholder: 'Paste URL or write something...',
    mosaicLabel: 'Save to Mosaic',
    noMosaics: 'No Mosaics yet. Create one first!',
    sharePrompt: 'Share content from another app',
  },

  // 홈 화면 (index.tsx)
  home: {
    allItems: 'All Items',
    mosaic: 'Mosaic',
    items: 'items',
    noItems: 'No items yet',
    addPrompt: 'Add a URL or note above',
    inputPlaceholder: 'Paste URL or write a note...',
    signingIn: 'Signing in...',
    deleteFailed: 'Failed to delete',
    note: 'Note',
    image: 'Image',
  },

  // Mosaics 탭 (mosaics.tsx)
  mosaics: {
    newPlaceholder: 'New Mosaic Name...',
    empty: 'No Mosaics yet. Create one!',
    deleteTitle: 'Delete Mosaic',
    deleteMessage: 'Are you sure?',
    deleteCancel: 'Cancel',
    deleteConfirm: 'Delete',
  },

  // 공통
  common: {
    error: 'Error',
    cancel: 'Cancel',
    delete: 'Delete',
    save: 'Save',
    ok: 'OK',
  },
};
