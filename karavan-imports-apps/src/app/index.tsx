import Constants from 'expo-constants';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PORTAL_URL =
  (Constants.expoConfig?.extra?.portalUrl as string | undefined) ??
  'https://karavanimports.com';

// Where a signed-in user should land on launch (Karavan Portal only). The
// staff variant leaves this unset and always opens its own start page.
const SIGNED_IN_PATH = Constants.expoConfig?.extra?.signedInPath as string | undefined;

function getHostname(url: string): string | null {
  const match = url.match(/^https?:\/\/([^/?#]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function getPath(url: string): string {
  const match = url.match(/^https?:\/\/[^/?#]+([^?#]*)/i);
  const path = (match?.[1] ?? '').replace(/\/+$/, '');
  return path || '/';
}

const START_PATH = getPath(PORTAL_URL);

function isKaravanHost(hostname: string | null) {
  return hostname === 'karavanimports.com' || hostname === 'www.karavanimports.com';
}

// Same rules as busy-boys-apps (both sites run on Base44). Sign in / sign up
// go through the site's own /login + /api/apps/auth/... routes and Base44's
// auth hosts; those must stay in the WebView so the session (stored in the
// WebView's localStorage as base44_access_token) belongs to the app.
// accounts.google.com and appleid.apple.com are deliberately NOT included —
// Google refuses to render inside an embedded WebView (leaving the user stuck
// on an error page) and Apple's Face ID/Passkey prompts need a real browser.
// Those escape to the in-app browser, whose "Done" button returns to the app.
const AUTH_HOSTS = ['app.base44.com', 'base44.app'];

function isSameFrameAuthHost(hostname: string | null) {
  if (!hostname) return false;
  return AUTH_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

function staysInWebView(hostname: string | null) {
  return isKaravanHost(hostname) || isSameFrameAuthHost(hostname);
}

// Pages that are a "home base": no return button there.
function isHomePath(path: string) {
  return path === START_PATH || (SIGNED_IN_PATH !== undefined && path === SIGNED_IN_PATH);
}

// On the first page load of each app launch, if the user already has a Base44
// session token, jump straight to the dashboard. The sessionStorage guard
// (reset every launch) makes this fire once, so tapping the site's own Home
// link later still works.
const LAUNCH_REDIRECT_JS = SIGNED_IN_PATH
  ? `(function () {
  try {
    if (window.sessionStorage.getItem('__karavanAppLaunched')) return;
    window.sessionStorage.setItem('__karavanAppLaunched', '1');
    var path = window.location.pathname.replace(/\\/+$/, '') || '/';
    var token = window.localStorage.getItem('base44_access_token') || window.localStorage.getItem('token');
    if (token && path === ${JSON.stringify(START_PATH)}) {
      window.location.replace(${JSON.stringify(SIGNED_IN_PATH)});
    }
  } catch (e) {}
})();
true;`
  : 'true;';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(PORTAL_URL);
  const canGoBackRef = useRef(false);
  const currentUrlRef = useRef(PORTAL_URL);
  const theme = useTheme();

  const onHomePage =
    isKaravanHost(getHostname(currentUrl)) && isHomePath(getPath(currentUrl));
  const showReturn = !onHomePage && !loading;

  const goHome = () => {
    const origin = PORTAL_URL.match(/^https?:\/\/[^/?#]+/i)?.[0] ?? PORTAL_URL;
    const target = SIGNED_IN_PATH ? `${origin}${SIGNED_IN_PATH}` : PORTAL_URL;
    webViewRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(target)}; true;`);
  };

  // Return button / Android back: go back if there's history, otherwise
  // (e.g. stuck on a login/error page with no history) go back to the portal.
  const goBackOrHome = () => {
    if (canGoBackRef.current) {
      webViewRef.current?.goBack();
    } else {
      goHome();
    }
  };

  const openExternal = (url: string) => {
    if (__DEV__) {
      // If sign-in still pops out to a separate browser, this tells you which
      // host did it — add that host to AUTH_HOSTS.
      console.log('[WebView] opening externally:', url);
    }
    // Reload once the in-app browser is dismissed so the portal isn't left
    // mid-flow (e.g. on a half-finished login page).
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
      const url = currentUrlRef.current;
      if (!(isKaravanHost(getHostname(url)) && isHomePath(getPath(url)))) {
        goHome();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <WebView
        ref={webViewRef}
        source={{ uri: PORTAL_URL }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(navState) => {
          canGoBackRef.current = navState.canGoBack;
          setCanGoBack(navState.canGoBack);
          currentUrlRef.current = navState.url;
          setCurrentUrl(navState.url);
        }}
        allowsBackForwardNavigationGestures
        // Keep the user signed in across app restarts: Base44 keeps its session
        // token in localStorage, plus cookies for the auth hosts.
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        injectedJavaScriptBeforeContentLoaded={LAUNCH_REDIRECT_JS}
        // Fallback in case the before-load script ran too early to see storage.
        injectedJavaScript={LAUNCH_REDIRECT_JS}
        onOpenWindow={(event) => {
          // target="_blank" / window.open: keep the portal and auth pages in the
          // WebView (so the session is shared), send everything else out.
          const targetUrl = event.nativeEvent.targetUrl;
          const hostname = getHostname(targetUrl);
          if (!hostname) return;
          if (staysInWebView(hostname)) {
            webViewRef.current?.injectJavaScript(
              `window.location.href = ${JSON.stringify(targetUrl)}; true;`
            );
          } else {
            openExternal(targetUrl);
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          // iOS also fires this for iframes (reCAPTCHA/Turnstile, analytics,
          // payment frames). Those aren't navigations — let them load.
          if (request.isTopFrame === false) {
            return true;
          }
          const { url } = request;
          const hostname = getHostname(url);
          if (staysInWebView(hostname)) {
            return true;
          }
          if (hostname) {
            // Any other real http(s) host (Google/Apple sign-in, external links)
            openExternal(url);
            return false;
          }
          if (/^(tel|mailto|sms|maps|itms-apps|market|intent):/i.test(url)) {
            Linking.openURL(url).catch(() => {});
            return false;
          }
          // about:blank, data:, blob: etc. — WebView handles these itself
          return true;
        }}
      />
      {showReturn && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={canGoBack ? 'Go back' : 'Return to portal'}
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={goBackOrHome}>
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
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
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
