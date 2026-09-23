// Aviso diário de "loja renovou".
//
// É uma notificação LOCAL agendada: o próprio sistema dispara no
// horário, mesmo com o app fechado, sem servidor e sem login.
// O horário vem do contador da loja (SingleItemOffersRemaining...),
// então segue o reset certo do seu servidor e do seu fuso.
//
// Ela não sabe QUAIS skins vieram — para isso o app teria que
// logar na Riot em segundo plano.

import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { t } from './i18n';
import { readSettings, updateSettings } from './settings';

const CHANNEL = 'shop-reset';

// No Expo Go do Android, só IMPORTAR o expo-notifications já lança
// erro (ele registra listener de push ao carregar, e o Expo Go tirou
// push no SDK 53). Por isso o require é condicional: lá o recurso fica
// indisponível; num build de desenvolvimento funciona normal.
export const notificationsAvailable = !(Platform.OS === 'android' && isRunningInExpoGo());

const Notifications = notificationsAvailable ? require('expo-notifications') : null;

// Mostra a notificação mesmo se o app estiver aberto.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Ligado por padrão; só desliga se a pessoa desligar no perfil. */
export function shopAlertsEnabled() {
  return notificationsAvailable && readSettings().shopAlerts !== false;
}

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Agenda o aviso diário no horário (hora:minuto) de `resetAt`. */
async function scheduleAt(resetAt) {
  if (!Notifications || !(await ensurePermission())) {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: t('notify.channel'),
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notify.title'),
      body: t('notify.body'),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: resetAt.getHours(),
      minute: resetAt.getMinutes(),
      channelId: CHANNEL,
    },
  });

  return true;
}

/**
 * (Re)agenda o aviso para o horário do próximo reset. Chamado toda
 * vez que a loja carrega — assim o texto acompanha o idioma atual
 * e o horário se corrige sozinho.
 *
 * Devolve false se a pessoa não deu permissão.
 */
export async function scheduleShopReset(secondsUntilReset) {
  if (secondsUntilReset == null) {
    return true;
  }

  // Arredonda pro minuto: o contador chega com alguns segundos de atraso.
  const resetAt = new Date(
    Math.round((Date.now() + secondsUntilReset * 1000) / 60000) * 60000
  );

  // Guardado para o perfil conseguir religar o aviso sem a loja aberta.
  updateSettings({ resetAt: resetAt.getTime() });

  if (!shopAlertsEnabled()) {
    return true;
  }

  return scheduleAt(resetAt);
}

export async function setShopAlerts(enabled) {
  updateSettings({ shopAlerts: enabled });

  if (!Notifications) {
    return false;
  }

  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();

    return true;
  }

  // Sem loja carregada ainda: a loja diária renova às 00:00 UTC.
  const saved = readSettings().resetAt;
  const resetAt = saved ? new Date(saved) : new Date(Date.UTC(2000, 0, 1, 0, 0));

  return scheduleAt(resetAt);
}
