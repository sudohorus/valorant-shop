import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RiotLogin } from '../RiotLogin';
import { theme } from '../theme';
import { Button } from '../ui/kit';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { LanguagePicker } from '../ui/LanguagePicker';

export function LoginScreen() {
  const { signIn, error } = useAuth();
  const { t } = useI18n();
  const [showing, setShowing] = useState(false);

  if (showing) {
    // Tela de login visível sempre pede a conta: permite trocar de conta.
    return <RiotLogin forceLogin onTokens={signIn} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.brand}>VALORANT</Text>
        <Text style={styles.title}>{t('login.title')}</Text>

        <Text style={styles.body}>{t('login.body')}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label={t('login.button')} onPress={() => setShowing(true)} />

      <View style={styles.languages}>
        <LanguagePicker />
      </View>
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
    fontSize: 34,
    textAlign: 'center',
    fontFamily: theme.fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    color: theme.textDim,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  languages: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
  error: {
    color: theme.accent,
    fontSize: 13,
    textAlign: 'center',
  },
});
