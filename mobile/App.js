import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchDailyShop, formatCountdown } from './src/api';
import { RiotLogin } from './src/RiotLogin';
import { SkinCard } from './src/SkinCard';
import { theme } from './src/theme';

export default function App() {
  // silent: tenta reaproveitar a sessão do WebView sem mostrar nada.
  const [stage, setStage] = useState('silent');
  const [tokens, setTokens] = useState(null);
  const [shop, setShop] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (auth) => {
    try {
      setError(null);

      setShop(await fetchDailyShop(auth));

      setStage('shop');
    } catch (problem) {
      setError(problem.message);

      setStage('error');
    }
  }, []);

  useEffect(() => {
    if (tokens) {
      setStage('loading');

      load(tokens);
    }
  }, [tokens, load]);

  async function refresh() {
    setRefreshing(true);

    await load(tokens);

    setRefreshing(false);
  }

  if (stage === 'silent' || stage === 'login') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        {stage === 'silent' && (
          <Centered label="Entrando com a sessão salva..." />
        )}

        <RiotLogin
          hidden={stage === 'silent'}
          onTokens={setTokens}
          onNeedsLogin={() => setStage('login')}
        />
      </SafeAreaView>
    );
  }

  if (stage === 'loading') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
        <Centered label="Carregando sua loja..." />
      </SafeAreaView>
    );
  }

  if (stage === 'error') {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>Não deu certo</Text>
          <Text style={styles.errorBody}>{error}</Text>

          <Pressable
            style={styles.button}
            onPress={() => {
              setTokens(null);
              setStage('login');
            }}
          >
            <Text style={styles.buttonLabel}>Entrar de novo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      <FlatList
        data={shop.offers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SkinCard skin={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.textDim}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Loja diária</Text>

            <Text style={styles.subtitle}>
              renova em {formatCountdown(shop.resetsInSeconds)}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Centered({ label }) {
  return (
    <View style={styles.centerBox}>
      <ActivityIndicator color={theme.accent} />
      <Text style={styles.centerLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  list: {
    padding: theme.gap,
    paddingBottom: 48,
  },
  separator: {
    height: theme.gap,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  title: {
    color: theme.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.textDim,
    fontSize: 13,
    marginTop: 6,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  centerLabel: {
    color: theme.textDim,
    fontSize: 14,
  },
  errorTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
  },
  errorBody: {
    color: theme.textDim,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    backgroundColor: theme.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonLabel: {
    color: theme.text,
    fontWeight: '700',
    fontSize: 14,
  },
});
