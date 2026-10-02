import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

const SITE_URL = 'https://pangeamarket.com';

function getHostname(url: string): string | null {
  const match = url.match(/^https?:\/\/([^/]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function isPangeaMarketHost(hostname: string | null) {
  return hostname === 'pangeamarket.com' || hostname === 'www.pangeamarket.com';
}

// Hosts involved in sign in / sign up only. app.base44.com is this site's
// underlying auth platform (e.g. app.base44.com/api/apps/auth/google/login),
// which then same-frame-redirects to the actual provider. Keeping app.base44.com
// in the WebView lets email sign-in/up complete inline instead of popping to
// the system browser, where the resulting session would land in a separate
// cookie jar the WebView never sees.
// accounts.google.com and appleid.apple.com are deliberately NOT included —
// both get stuck inside an embedded WebView (Google actively refuses to
// render there at all; Apple's flow commonly relies on Face ID/Passkey
// WebAuthn prompts that only work in a real system-browser context) — and
// letting them escape to the external browser is what actually lets those
// flows complete, with its "Done" button returning the user to the app.
const AUTH_HOSTS = ['app.base44.com', 'base44.app'];

function isSameFrameAuthHost(hostname: string | null) {
  if (!hostname) return false;
  return AUTH_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

// Anything that must stay inside the WebView so the session (cookies) is shared.
function staysInWebView(hostname: string | null) {
  return isPangeaMarketHost(hostname) || isSameFrameAuthHost(hostname);
}

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const canGoBackRef = useRef(false);

  const openExternal = (url: string) => {
    if (__DEV__) {
      // If sign-in still pops out to a separate browser, this tells you which
      // host did it — add that host to AUTH_HOSTS.
      console.log('[WebView] opening externally:', url);
    }
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
        }}
        allowsBackForwardNavigationGestures
        // Persist login cookies (pangeamarket.com + base44.app) across app launches.
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onOpenWindow={(event) => {
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
          const { url } = request;
          const hostname = getHostname(url);
          if (staysInWebView(hostname)) {
            return true;
          }
          if (hostname) {
            openExternal(url);
            return false;
          }
          if (/^(tel|mailto|sms|maps|itms-apps):/i.test(url)) {
            Linking.openURL(url).catch(() => {});
            return false;
          }
          return true;
        }}
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
});
