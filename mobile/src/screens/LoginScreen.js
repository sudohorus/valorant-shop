import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RiotLogin } from '../RiotLogin';
import { theme } from '../theme';
import { Button } from '../ui/kit';
import { useAuth } from '../auth';

export function LoginScreen() {
  const { signIn, error } = useAuth();
  const [showing, setShowing] = useState(false);

  if (showing) {
    return <RiotLogin onTokens={signIn} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.brand}>VALORANT</Text>
        <Text style={styles.title}>Sua loja, suas partidas.</Text>

        <Text style={styles.body}>
          O login acontece na página oficial da Riot. O app não vê e não
          guarda sua senha.
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Entrar com a Riot" onPress={() => setShowing(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 28,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 4,
  },
  title: {
    color: theme.text,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  body: {
    color: theme.textDim,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  error: {
    color: theme.accent,
    fontSize: 13,
    textAlign: 'center',
  },
});
