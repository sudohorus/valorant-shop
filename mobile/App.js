import { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth';
import { RiotLogin } from './src/RiotLogin';
import { LoginScreen } from './src/screens/LoginScreen';
import { MatchesScreen } from './src/screens/MatchesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { theme } from './src/theme';
import { Loading, Message } from './src/ui/kit';
import { Tabs } from './src/ui/Tabs';

const TABS = [
  { key: 'shop', label: 'Loja', Screen: ShopScreen },
  { key: 'matches', label: 'Partidas', Screen: MatchesScreen },
  { key: 'profile', label: 'Perfil', Screen: ProfileScreen },
];

function Shell() {
  const [active, setActive] = useState('shop');

  const { Screen } = TABS.find((tab) => tab.key === active);

  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        <Screen />
      </View>

      <Tabs tabs={TABS} active={active} onChange={setActive} />
    </View>
  );
}

function Root() {
  const { status, error, signIn, needsLogin, retry } = useAuth();

  if (status === 'probing') {
    return (
      <>
        <Loading label="Entrando com a sessão salva..." />

        <RiotLogin hidden onTokens={signIn} onNeedsLogin={needsLogin} />
      </>
    );
  }

  if (status === 'anonymous') {
    return <LoginScreen />;
  }

  if (status === 'opening') {
    return <Loading label="Abrindo sua sessão..." />;
  }

  if (status === 'failed') {
    return (
      <Message
        title="Não deu certo"
        body={error}
        actionLabel="Tentar de novo"
        onAction={retry}
      />
    );
  }

  return <Shell />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      {/* A barra de abas cuida do inset de baixo sozinha. */}
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        <AuthProvider>
          <Root />
        </AuthProvider>
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
});
