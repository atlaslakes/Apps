import * as WebBrowser from 'expo-web-browser';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SITE_URL = 'https://busyboys.com';

function getHostname(url: string): string | null {
  const match = url.match(/^https?:\/\/([^/]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function isBusyBoysHost(hostname: string | null) {
  // Exact hostnames only — subdomains like order.busyboys.com are a white-labeled
  // Toast storefront (the site itself flags it systemBrowser: true) and must be
  // treated as external, not the main site.
  return hostname === 'busyboys.com' || hostname === 'www.busyboys.com';
}

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const canGoBackRef = useRef(false);
  const theme = useTheme();

  const openExternal = (url: string) => {
    // Reload once the in-app browser is dismissed — busyboys.com can be left with
    // an order-platform picker modal still open from before the user left, and
    // there's no in-app affordance to close that (it's not real navigation
    // history, so the back button can't help). A reload gives a clean slate.
    WebBrowser.openBrowserAsync(url)
      .then(() => webViewRef.current?.reload())
      .catch(() => {});
  };

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
        source={{ uri: SITE_URL }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(navState) => {
          canGoBackRef.current = navState.canGoBack;
          setCanGoBack(navState.canGoBack);
        }}
        allowsBackForwardNavigationGestures
        onOpenWindow={(event) => {
          // busyboys.com deliberately escapes to a system/in-app browser for ordering
          // links (Toast, DoorDash, UberEats) rather than navigating the embedded
          // WebView — those checkout flows often refuse to work when embedded.
          const targetUrl = event.nativeEvent.targetUrl;
          if (getHostname(targetUrl)) {
            openExternal(targetUrl);
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          // The site's own escape mechanism sometimes falls back to a same-frame
          // navigation (window.location.href) instead of window.open(), which
          // onOpenWindow above never sees — catch that here too, for any request
          // that isn't busyboys.com itself.
          const { url } = request;
          const hostname = getHostname(url);
          if (isBusyBoysHost(hostname)) {
            return true;
          }
          if (hostname) {
            // a real http(s) host other than busyboys.com
            openExternal(url);
            return false;
          }
          if (/^(tel|mailto|sms|maps|itms-apps):/i.test(url)) {
            Linking.openURL(url).catch(() => {});
            return false;
          }
          // non-navigational schemes WebView needs to handle itself (about:blank, data:, etc.)
          return true;
        }}
      />
      {canGoBack && (
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={() => webViewRef.current?.goBack()}>
          <ThemedView type="backgroundElement" style={styles.backButtonCircle}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              size={16}
              weight="bold"
              tintColor={theme.text}
            />
          </ThemedView>
        </Pressable>
      )}
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
  backButton: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonCircle: {
    width: Spacing.four,
    height: Spacing.four,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
