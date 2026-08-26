import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

type Portal = 'buyer' | 'staff';

const PORTAL_URLS: Record<Portal, string> = {
  buyer: 'https://karavanimports.com',
  staff: 'https://karavanimports.com/staff',
};

export default function HomeScreen() {
  const [portal, setPortal] = useState<Portal | null>(null);

  if (portal === null) {
    return <PortalPicker onSelect={setPortal} />;
  }

  return <PortalWebView url={PORTAL_URLS[portal]} onExit={() => setPortal(null)} />;
}

function PortalPicker({ onSelect }: { onSelect: (portal: Portal) => void }) {
  return (
    <SafeAreaView style={styles.pickerContainer}>
      <Image
        source={require('@/assets/images/karavan-icon.png')}
        style={styles.logo}
        contentFit="contain"
      />
      <Text style={styles.title}>Karavan Portal</Text>
      <Pressable style={styles.button} onPress={() => onSelect('buyer')}>
        <Text style={styles.buttonText}>Buyer</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => onSelect('staff')}>
        <Text style={styles.buttonText}>Staff</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function PortalWebView({ url, onExit }: { url: string; onExit: () => void }) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const canGoBackRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackRef.current) {
        webViewRef.current?.goBack();
        return true;
      }
      onExit();
      return true;
    });
    return () => subscription.remove();
  }, [onExit]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Pressable style={styles.backButton} onPress={onExit} hitSlop={12}>
        <Text style={styles.backButtonText}>{'‹ Portals'}</Text>
      </Pressable>
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(navState) => {
          canGoBackRef.current = navState.canGoBack;
        }}
        allowsBackForwardNavigationGestures
      />
      {loading && <ActivityIndicator size="large" style={StyleSheet.absoluteFill} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  pickerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#C06A34',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#C06A34',
    fontWeight: '600',
  },
});
