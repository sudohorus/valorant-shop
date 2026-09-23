import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { AUTH_URL, AUTH_URL_FORCE_LOGIN, parseAuthRedirect } from './riot';
import { theme } from './theme';

/**
 * WebView do login oficial da Riot.
 *
 * Com `hidden`, roda escondido só para ver se os cookies do
 * WebView ainda valem; se a Riot pedir login de novo, avisa o
 * pai por `onNeedsLogin` em vez de aparecer sozinho.
 */
export function RiotLogin({ hidden = false, forceLogin = false, onTokens, onNeedsLogin }) {
  const done = useRef(false);

  function inspect(url) {
    if (done.current) {
      return;
    }

    const tokens = parseAuthRedirect(url);

    if (tokens) {
      done.current = true;

      onTokens(tokens);

      return;
    }

    if (hidden && url.includes('auth.riotgames.com') && onNeedsLogin) {
      onNeedsLogin();
    }
  }

  return (
    <View style={hidden ? styles.hidden : styles.visible}>
      <WebView
        source={{ uri: forceLogin ? AUTH_URL_FORCE_LOGIN : AUTH_URL }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        onNavigationStateChange={(state) => inspect(state.url)}
        onShouldStartLoadWithRequest={(request) => {
          inspect(request.url);

          return true;
        }}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  visible: {
    flex: 1,
  },
  web: {
    flex: 1,
    backgroundColor: theme.bg,
  },
});
