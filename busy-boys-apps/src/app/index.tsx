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

// Hosts involved in sign in / sign up only. app.base44.com is this site's
// underlying auth platform (e.g. app.base44.com/api/apps/auth/apple/login),
// which then same-frame-redirects to the actual provider for Google/Apple.
// None of this is an intentional escape like the Toast/DoorDash/UberEats/rewards
// ordering links (those stay external, untouched) — keeping these in the WebView
// lets sign in/up complete inline instead of popping to the system browser.
// NOTE: Google generally refuses OAuth inside embedded WebViews
// ("Error 403: disallowed_useragent"); email and Apple sign-in work inline.
const AUTH_HOSTS = ['app.base44.com', 'base44.app', 'accounts.google.com', 'appleid.apple.com'];

function isSameFrameAuthHost(hostname: string | null) {
  if (!hostname) return false;
  return AUTH_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

// Anything that must stay inside the WebView so the session (cookies) is shared.
function staysInWebView(hostname: string | null) {
  return isBusyBoysHost(hostname) || isSameFrameAuthHost(hostname);
}

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const canGoBackRef = useRef(false);
  const theme = useTheme();

  const openExternal = (url: string) => {
    if (__DEV__) {
      // If sign-in still pops out to a separate browser, this tells you which
      // host did it — add that host to AUTH_HOSTS.
      console.log('[WebView] opening externally:', url);
    }
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
        // Persist login cookies (busyboys.com + base44.app) across app launches.
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onOpenWindow={(event) => {
          // busyboys.com deliberately escapes to a system/in-app browser for ordering
          // links (Toast, DoorDash, UberEats) rather than navigating the embedded
          // WebView — those checkout flows often refuse to work when embedded.
          // But a new-window link to busyboys.com itself (e.g. a Sign in button
          // with target="_blank") or to the auth hosts must stay in the WebView,
          // otherwise sign-in happens in a separate browser session.
          const targetUrl = event.nativeEvent.targetUrl;
          const hostname = getHostname(targetUrl);
          if (!hostname) return;
          if (staysInWebView(hostname)) {
            webViewRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(targetUrl)}; true;`);
          } else {
            openExternal(targetUrl);
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          // On iOS this also fires for iframes (reCAPTCHA, analytics, sign-in
          // button widgets, payment frames). Those are not navigations — let them
          // load, or they'd pop the system browser mid sign-in.
          if (request.isTopFrame === false) {
            return true;
          }
          // The site's own escape mechanism sometimes falls back to a same-frame
          // navigation (window.location.href) instead of window.open(), which
          // onOpenWindow above never sees — catch that here too, for any request
          // that isn't busyboys.com itself.
          const { url } = request;
          const hostname = getHostname(url);
          if (staysInWebView(hostname)) {
            return true;
          }
          if (hostname) {
            // a real http(s) host other than busyboys.com / auth
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
