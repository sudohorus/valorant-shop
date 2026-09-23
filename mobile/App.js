import { useEffect, useRef, useState } from 'react';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/barlow-condensed';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth';
import { I18nProvider, useI18n } from './src/i18n';
import { RiotLogin } from './src/RiotLogin';
import { LoginScreen } from './src/screens/LoginScreen';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { MatchesScreen } from './src/screens/MatchesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { WishlistScreen } from './src/screens/WishlistScreen';
import { theme } from './src/theme';
import { Loading, Message } from './src/ui/kit';
import { TabActiveContext, Tabs } from './src/ui/Tabs';
import { SkinPreviewProvider } from './src/skinPreview';
import { WishlistProvider } from './src/wishlist';

const TABS = [
  { key: 'shop', icon: 'storefront', Screen: ShopScreen },
  { key: 'wishlist', icon: 'heart', Screen: WishlistScreen },
  { key: 'collection', icon: 'grid', Screen: CollectionScreen },
  { key: 'matches', icon: 'stats-chart', Screen: MatchesScreen },
  { key: 'profile', icon: 'person-circle', Screen: ProfileScreen },
];

/**
 * Uma aba. Depois de visitada fica montada (só escondida), então
 * voltar nela não recarrega da rede nem perde a rolagem.
 * Ao ficar ativa, entra com um fade subindo 8px.
 */
function TabPane({ active, children }) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (active) {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [active, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <Animated.View
      // Escondida continua montada, mas fora do layout e sem receber toque.
      pointerEvents={active ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        { opacity: active ? progress : 0, transform: [{ translateY }] },
        !active && styles.hidden,
      ]}
    >
      <TabActiveContext.Provider value={active}>{children}</TabActiveContext.Provider>
    </Animated.View>
  );
}

function Shell() {
  const [active, setActive] = useState('shop');
  // Abas já abertas; as outras só montam na primeira visita.
  const [visited, setVisited] = useState(() => new Set(['shop']));
  const { t } = useI18n();

  const tabs = TABS.map((tab) => ({ ...tab, label: t(`tabs.${tab.key}`) }));

  function open(key) {
    setVisited((previous) => (previous.has(key) ? previous : new Set(previous).add(key)));
    setActive(key);
  }

  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        {TABS.filter((tab) => visited.has(tab.key)).map(({ key, Screen }) => (
          <TabPane key={key} active={key === active}>
            <Screen />
          </TabPane>
        ))}
      </View>

      <Tabs tabs={tabs} active={active} onChange={open} />
    </View>
  );
}

function Root() {
  const { status, error, signIn, needsLogin, retry } = useAuth();
  const { t } = useI18n();

  if (status === 'probing') {
    return (
      <>
        <Loading label={t('app.probing')} />

        <RiotLogin hidden onTokens={signIn} onNeedsLogin={needsLogin} />
      </>
    );
  }

  if (status === 'anonymous') {
    return <LoginScreen />;
  }

  if (status === 'opening') {
    return <Loading label={t('app.opening')} />;
  }

  if (status === 'failed') {
    return (
      <Message
        title={t('common.errorTitle')}
        body={error}
        actionLabel={t('common.retry')}
        onAction={retry}
      />
    );
  }

  return <Shell />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_800ExtraBold,
  });

  // Espera a fonte (é local, leva milissegundos). Se falhar, segue
  // com a fonte do sistema em vez de travar o app.
  if (!fontsLoaded && !fontError) {
    return <View style={styles.screen} />;
  }

  return (
    <SafeAreaProvider>
      {/* A barra de abas cuida do inset de baixo sozinha. */}
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        <I18nProvider>
          <AuthProvider>
            <WishlistProvider>
              <SkinPreviewProvider>
                <Root />
              </SkinPreviewProvider>
            </WishlistProvider>
          </AuthProvider>
        </I18nProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
