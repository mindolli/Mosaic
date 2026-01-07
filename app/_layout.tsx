import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ShareIntentProvider, useShareIntent } from 'expo-share-intent';
import { initDatabase } from '../lib/database';

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

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      console.log('Received Share Intent:', shareIntent);
      
      let url = '';
      let text = '';

      if (shareIntent.type === 'text' || shareIntent.type === 'weburl') {
        const content = (shareIntent as any).value || '';
        const urlMatch = content.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          url = urlMatch[0];
          const remainingText = content.replace(url, '').trim();
          if (remainingText) text = remainingText;
        } else {
          text = content;
        }
      }

      if (url || text) {
        // 이미 모달이 열려있을 수 있으므로 replace 대신 push나 적절한 처리 필요
        // 여기서는 push로 저장 화면을 띄웁니다.
        router.push({
          pathname: '/save',
          params: { url, text }
        });
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
