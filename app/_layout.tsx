import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ShareIntentProvider, useShareIntent } from 'expo-share-intent';
import { initDatabase } from '../lib/database';
// 공유 인텐트는 이제 홈 화면(index.tsx)에서 직접 처리합니다

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    initDatabase();
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ShareIntentProvider>
      <RootLayoutNav />
    </ShareIntentProvider>
  );
}

import { AuthProvider } from '../lib/auth';
import { useShareIntentContext } from 'expo-share-intent';
import { Platform } from 'react-native';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  // 🔄 공유 인텐트 처리 (라우팅 레벨에서 가장 먼저 처리)
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    // 디버깅 로그
    console.log('[SHARE]', {
      has: hasShareIntent,
      intent: shareIntent,
    });
    
    if (hasShareIntent && shareIntent) {
      const intent = shareIntent as any;
      
      // 데이터 추출
      let url = '';
      let text = '';
      let imageUrl = '';
      
      // URL/Text
      if (intent.webUrl) {
        url = intent.webUrl;
      }
      
      // intent.text 또는 intent.value에서 텍스트 추출
      const rawText = intent.text || intent.value || '';
      if (rawText) {
        const urlMatch = rawText.match(/https?:\/\/[^\s]+/);
        if (urlMatch && !url) {
          url = urlMatch[0];
          text = rawText.replace(url, '').trim();
        } else if (!url) {
          text = rawText;
        }
      }
      
      // 이미지
      if (intent.files && intent.files.length > 0) {
        const file = intent.files[0];
        if (file.mimeType?.startsWith('image/')) {
          imageUrl = file.contentUri || file.path || '';
        }
      }
      
      console.log('[SHARE] Extracted:', { url, text, imageUrl: !!imageUrl });
      
      // /save 화면으로 이동
      if (url || text || imageUrl) {
        console.log('[SHARE] Navigating to /save...');
        router.replace({
          pathname: '/save',
          params: { url, text, imageUrl }
        });
        resetShareIntent();
      } else {
        console.warn('[SHARE] No valid data, resetting');
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="save" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
