import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

const PORTAL_URL =
  (Constants.expoConfig?.extra?.portalUrl as string | undefined) ??
  'https://karavanimports.com';

export default function HomeScreen() {
  return <PortalWebView url={PORTAL_URL} />;
}

function PortalWebView({ url }: { url: string }) {
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
      return false;
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      )}
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
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
