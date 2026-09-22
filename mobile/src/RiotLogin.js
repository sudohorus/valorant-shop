import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { AUTH_URL, parseAuthRedirect } from './api';

/**
 * WebView do login oficial da Riot.
 *
 * Enquanto `hidden`, tentamos reaproveitar a sessão que já
 * está nos cookies do WebView — se a Riot pedir login, o
 * pai mostra a janela.
 */
export function RiotLogin({ hidden, onTokens, onNeedsLogin }) {
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

    // Caiu na tela de login: a sessão salva não serve mais.
    if (hidden && url.includes('auth.riotgames.com')) {
      onNeedsLogin();
    }
  }

  return (
    <View style={hidden ? styles.hidden : styles.visible}>
      <WebView
        source={{ uri: AUTH_URL }}
        incognito={false}
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
    backgroundColor: '#0B0B0D',
  },
});
