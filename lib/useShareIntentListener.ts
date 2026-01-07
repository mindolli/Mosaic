import { useEffect } from 'react';
import { useShareIntent } from 'expo-share-intent';
import { router } from 'expo-router';
import { Platform } from 'react-native';

export const useShareIntentListener = () => {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    // 웹 환경에서는 실행하지 않음
    if (Platform.OS === 'web') return;

    if (hasShareIntent && shareIntent) {
      try {
        console.log('📥 Share Intent Received:', shareIntent);

        const intent = shareIntent as any;
        
        let url = '';
        let text = '';
        let imageUrl = '';

        // 1. URL/Text 처리
        if (intent.type === 'text' || intent.type === 'weburl') {
          if (intent.webUrl) {
            url = intent.webUrl;
            if (intent.value && intent.value !== intent.webUrl) {
              text = intent.value;
            }
          } else if (intent.value) {
            const urlMatch = intent.value.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
              url = urlMatch[0];
              text = intent.value.replace(url, '').trim();
            } else {
              text = intent.value;
            }
          }
        }
        
        // 2. 이미지 처리
        if (intent.files?.length > 0) {
          const file = intent.files[0];
          if (intent.type === 'media' || file.mimeType?.startsWith('image/')) {
            imageUrl = file.contentUri || file.path;
          }
        }

        // 3. 데이터 검증 및 네비게이션
        if (url || text || imageUrl) {
          // Navigation stack이 준비될 때까지 짧은 지연
          setTimeout(() => {
            // replace 사용: 공유로 진입했을 때 뒤로가기로 홈(S1)에 가지 않도록
            router.replace({
              pathname: '/save',
              params: { url, text, imageUrl }
            });
            resetShareIntent();
          }, 100);
        } else {
          console.warn('⚠️ Share intent received but no valid data extracted');
          resetShareIntent();
        }
      } catch (error) {
        console.error('❌ Error processing share intent:', error);
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, resetShareIntent]);
};
