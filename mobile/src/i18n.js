// Traduções do app.
//
// Sem biblioteca: é um dicionário por idioma e um t('chave', params).
// O idioma escolhido fica salvo em settings.json; sem escolha, segue
// o idioma do aparelho. `t` também funciona fora de componentes
// (erros da Riot, catálogos), lendo o idioma atual do módulo.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { readSettings, updateSettings } from './settings';

export const LANGUAGES = [
  { code: 'pt-BR', label: 'Português' },
  { code: 'en-US', label: 'English' },
  { code: 'es-ES', label: 'Español' },
];

const FALLBACK = 'pt-BR';

const STRINGS = {
  'pt-BR': {
    'common.errorTitle': 'Não deu certo',
    'common.retry': 'Tentar de novo',
    'common.rr': 'PDL',
    'common.minutes': '{n} min',

    'app.probing': 'Entrando com a sessão salva...',
    'app.opening': 'Abrindo sua sessão...',
    'tabs.shop': 'Loja',
    'tabs.wishlist': 'Desejos',
    'tabs.matches': 'Partidas',
    'tabs.profile': 'Perfil',

    'login.title': 'Sua loja, suas partidas.',
    'login.body': 'O login acontece na página oficial da Riot. O app não vê e não guarda sua senha.',
    'login.button': 'Entrar com a Riot',

    'shop.title': 'Loja',
    'shop.loading': 'Carregando sua loja...',
    'shop.resets': 'Loja diária renova em {h}h {m}min',
    'shop.noForecast': 'sem previsão',
    'shop.alertTitle': 'Na loja hoje!',
    'shop.alertBody': 'As skins da sua lista de desejos chegaram: {names}',
    'shop.unknownSkin': 'Skin desconhecida',
    'shop.noImage': 'sem imagem',
    'shop.noPanel': 'A resposta da loja não trouxe SkinsPanelLayout.',

    'wishlist.title': 'Lista de Desejos',
    'wishlist.subtitle': 'Skins que você quer',
    'wishlist.loading': 'Carregando skins...',
    'wishlist.search': 'Buscar skins...',
    'wishlist.results': '{n} resultados',
    'wishlist.yourList': 'Sua lista · {n}',
    'wishlist.noResults': 'Nenhuma skin encontrada.',
    'wishlist.empty': 'Busque uma skin acima e adicione à lista.',
    'wishlist.notInStore': 'Fora da loja',
    'wishlist.catalogError': 'Não consegui carregar o catálogo de skins.',

    'matches.title': 'Partidas',
    'matches.subtitle': '{n} partidas · toque para detalhes',
    'matches.loading': 'Buscando suas partidas...',
    'matches.emptyTitle': 'Nada por aqui',
    'matches.emptyBody': 'Nenhuma partida desse modo no histórico recente.',
    'matches.unknownMap': 'Mapa desconhecido',

    'match.back': 'Partidas',
    'match.loading': 'Abrindo a partida...',
    'match.win': 'Vitória',
    'match.loss': 'Derrota',
    'match.draw': 'Empate',
    'match.yourPerformance': 'Seu desempenho',
    'match.scoreboard': 'Placar',
    'match.yourTeam': 'Seu time',
    'match.enemies': 'Adversários',
    'match.anonymous': 'Anônimo',
    'match.player': 'Jogador',

    'profile.loading': 'Carregando seu perfil...',
    'profile.signOutShort': 'Sair',
    'profile.signOut': 'Sair ou trocar de conta',
    'profile.mostPlayed': 'Mais jogado',
    'profile.gamesOf': '{games} de {sample} partidas recentes',
    'profile.currentRank': 'Patente atual',
    'profile.lastN': 'Últimas {n} competitivas',
    'profile.wins': 'Vitórias',
    'profile.winrate': 'Winrate',
    'profile.bestStreak': 'Maior sequência',
    'profile.streakValue': '{n}V',
    'profile.avgRR': 'Média PDL',
    'profile.peakRank': 'Melhor patente',
    'profile.server': 'Servidor',
    'profile.unranked': 'Sem patente',
    'profile.noName': 'Conta sem nome',
    'profile.language': 'Idioma',
    'profile.notifications': 'Notificações',
    'profile.shopAlerts': 'Avisar quando a loja renovar',
    'profile.shopAlertsHint': 'Todo dia no horário do reset, mesmo com o app fechado.',
    'profile.permissionDenied': 'Permita notificações nas configurações do celular.',
    'notify.channel': 'Loja renovada',
    'notify.title': 'Sua loja renovou!',
    'notify.body': 'Skins novas na loja diária. Toque para ver.',

    'errors.downtime': 'O VALORANT está em manutenção no seu servidor. A loja volta quando a Riot religar os serviços.',
    'errors.expired': 'Sua sessão expirou. Entre de novo.',
    'errors.failed': '{what} falhou (HTTP {status}).',
    'errors.noEntitlement': 'A Riot não retornou entitlements_token.',
    'errors.unknownShard': "Não sei qual shard usar para a região '{region}'.",
    'errors.noVersion': 'Não encontrei riotClientVersion.',
    'errors.badToken': 'Access token não parece ser um JWT válido.',
    'errors.noPuuid': 'Não encontrei PUUID no access token.',

    'what.call': 'A chamada',
    'what.entitlement': 'Entitlement',
    'what.region': 'Descoberta de região',
    'what.version': 'Versão do VALORANT',
    'what.shop': 'A loja',
    'what.matches': 'O histórico de partidas',
    'what.matchDetails': 'Os detalhes da partida',
    'what.playerNames': 'Os nomes dos jogadores',
    'what.accountName': 'O nome da conta',
    'what.mmr': 'Seu MMR',
    'what.level': 'Seu nível',
    'what.loadout': 'Seu loadout',

    'shop.nightMarket': 'Mercado Noturno',
    'shop.daily': 'Ofertas do dia',
    'shop.endsIn': 'termina em {time}',
    'matches.tabHistory': 'Histórico',
    'matches.tabStats': 'Estatísticas',
    'stats.loading': 'Analisando partidas... {done}/{total}',
    'stats.overall': 'Geral · últimas {n} partidas',
    'stats.byAgent': 'Por agente',
    'stats.byMap': 'Por mapa',
    'stats.game': '{n} partida',
    'stats.games': '{n} partidas',
    'stats.record': '{w}V {l}D',
    'stats.winrate': 'Winrate',
    'stats.empty': 'Sem partidas para analisar.',
    'stats.partial': '{n} partidas não carregaram e ficaram de fora.',

    'shop.owned': 'Já tenho',
    'profile.needsDevBuild': 'No Android, notificações não funcionam no Expo Go. Precisa de um build de desenvolvimento (npx expo run:android).',
    'what.owned': 'Suas skins',
    'what.wallet': 'Sua carteira',

    'preview.variants': 'Variantes',
    'preview.levels': 'Níveis',
    'preview.level': 'Nível {n}',
    'preview.base': 'Base',
    'preview.variant': 'Variante {n}',
    'preview.noVideo': 'Sem vídeo para este item.',
    'preview.notFound': 'Não encontrei essa skin no catálogo.',
    'preview.close': 'Fechar',
    'levelItem.VFX': 'Efeitos visuais',
    'levelItem.Animation': 'Animação',
    'levelItem.Finisher': 'Finalizador',
    'levelItem.SoundEffects': 'Efeitos sonoros',
    'levelItem.KillBanner': 'Banner de abate',
    'levelItem.Transformation': 'Transformação',
    'levelItem.KillEffect': 'Efeito de abate',
    'levelItem.TopFrag': 'Top frag',
    'levelItem.KillCounter': 'Contador de abates',
    'levelItem.Randomizer': 'Aleatório',
    'levelItem.InspectAndKill': 'Inspeção e abate',
    'levelItem.SongShuffle': 'Músicas',
    'levelItem.Voiceover': 'Narração',
    'levelItem.HeartbeatAndMapSensor': 'Sensor de batimentos',
    'levelItem.FishAnimation': 'Animação do peixe',
    'levelItem.AttackerDefenderSwap': 'Troca ataque/defesa',

    'tabs.collection': 'Coleção',
    'collection.title': 'Coleção',
    'collection.subtitle': '{n} skins · {vp} VP em skins',
    'collection.loading': 'Carregando sua coleção...',
    'collection.empty': 'Nenhuma skin na sua coleção ainda.',
    'collection.all': 'Tudo',
    'category.Sidearm': 'Pistolas',
    'category.SMG': 'Submetralhadoras',
    'category.Shotgun': 'Escopetas',
    'category.Rifle': 'Rifles',
    'category.Sniper': 'Snipers',
    'category.Heavy': 'Pesadas',
    'category.Melee': 'Armas brancas',
    'queue.competitive': 'Competitivo',
    'queue.unrated': 'Sem classificação',
    'queue.swiftplay': 'Frenético',
    'preview.wish': 'Adicionar à lista de desejos',
    'preview.unwish': 'Remover da lista de desejos',
    'bp.level': 'Nível {n} de {total}',
    'bp.levelShort': 'Nv. {n}',
    'bp.xp': '{a} / {b} XP',
    'bp.complete': 'Passe completo',
    'bp.epilogue': 'Epílogo',
    'what.contracts': 'Seu passe de batalha',
    'profile.version': 'Versão',
  },

  'en-US': {
    'common.errorTitle': 'Something went wrong',
    'common.retry': 'Try again',
    'common.rr': 'RR',
    'common.minutes': '{n} min',

    'app.probing': 'Signing in with your saved session...',
    'app.opening': 'Opening your session...',
    'tabs.shop': 'Shop',
    'tabs.wishlist': 'Wishlist',
    'tabs.matches': 'Matches',
    'tabs.profile': 'Profile',

    'login.title': 'Your shop, your matches.',
    'login.body': "You sign in on Riot's official page. The app never sees or stores your password.",
    'login.button': 'Sign in with Riot',

    'shop.title': 'Shop',
    'shop.loading': 'Loading your shop...',
    'shop.resets': 'Daily offers reset in {h}h {m}min',
    'shop.noForecast': 'no reset time',
    'shop.alertTitle': 'In the shop today!',
    'shop.alertBody': 'Skins from your wishlist are here: {names}',
    'shop.unknownSkin': 'Unknown skin',
    'shop.noImage': 'no image',
    'shop.noPanel': 'The shop response had no SkinsPanelLayout.',

    'wishlist.title': 'Wishlist',
    'wishlist.subtitle': 'Skins you want',
    'wishlist.loading': 'Loading skins...',
    'wishlist.search': 'Search skins...',
    'wishlist.results': '{n} results',
    'wishlist.yourList': 'Your list · {n}',
    'wishlist.noResults': 'No skins found.',
    'wishlist.empty': 'Search for a skin above and add it to your list.',
    'wishlist.notInStore': 'Not in the shop',
    'wishlist.catalogError': "Couldn't load the skin catalog.",

    'matches.title': 'Matches',
    'matches.subtitle': '{n} matches · tap for details',
    'matches.loading': 'Fetching your matches...',
    'matches.emptyTitle': 'Nothing here',
    'matches.emptyBody': 'No matches of this mode in your recent history.',
    'matches.unknownMap': 'Unknown map',

    'match.back': 'Matches',
    'match.loading': 'Opening match...',
    'match.win': 'Victory',
    'match.loss': 'Defeat',
    'match.draw': 'Draw',
    'match.yourPerformance': 'Your performance',
    'match.scoreboard': 'Scoreboard',
    'match.yourTeam': 'Your team',
    'match.enemies': 'Enemies',
    'match.anonymous': 'Anonymous',
    'match.player': 'Player',

    'profile.loading': 'Loading your profile...',
    'profile.signOutShort': 'Sign out',
    'profile.signOut': 'Sign out or switch account',
    'profile.mostPlayed': 'Most played',
    'profile.gamesOf': '{games} of {sample} recent matches',
    'profile.currentRank': 'Current rank',
    'profile.lastN': 'Last {n} competitive',
    'profile.wins': 'Wins',
    'profile.winrate': 'Win rate',
    'profile.bestStreak': 'Best streak',
    'profile.streakValue': '{n}W',
    'profile.avgRR': 'Avg RR',
    'profile.peakRank': 'Peak rank',
    'profile.server': 'Server',
    'profile.unranked': 'Unranked',
    'profile.noName': 'Unnamed account',
    'profile.language': 'Language',
    'profile.notifications': 'Notifications',
    'profile.shopAlerts': 'Notify me when the shop resets',
    'profile.shopAlertsHint': 'Every day at reset time, even with the app closed.',
    'profile.permissionDenied': 'Allow notifications in your phone settings.',
    'notify.channel': 'Shop reset',
    'notify.title': 'Your shop has reset!',
    'notify.body': 'New skins in your daily shop. Tap to see them.',

    'errors.downtime': 'VALORANT is under maintenance on your server. The shop will be back once Riot brings services up.',
    'errors.expired': 'Your session expired. Sign in again.',
    'errors.failed': '{what} failed (HTTP {status}).',
    'errors.noEntitlement': 'Riot did not return an entitlements_token.',
    'errors.unknownShard': "Don't know which shard to use for region '{region}'.",
    'errors.noVersion': "Couldn't find riotClientVersion.",
    'errors.badToken': "The access token doesn't look like a valid JWT.",
    'errors.noPuuid': "Couldn't find a PUUID in the access token.",

    'what.call': 'The request',
    'what.entitlement': 'Entitlement',
    'what.region': 'Region lookup',
    'what.version': 'VALORANT version',
    'what.shop': 'The shop',
    'what.matches': 'Match history',
    'what.matchDetails': 'Match details',
    'what.playerNames': 'Player names',
    'what.accountName': 'Account name',
    'what.mmr': 'Your MMR',
    'what.level': 'Your level',
    'what.loadout': 'Your loadout',

    'shop.nightMarket': 'Night Market',
    'shop.daily': 'Daily offers',
    'shop.endsIn': 'ends in {time}',
    'matches.tabHistory': 'History',
    'matches.tabStats': 'Stats',
    'stats.loading': 'Analyzing matches... {done}/{total}',
    'stats.overall': 'Overall · last {n} matches',
    'stats.byAgent': 'By agent',
    'stats.byMap': 'By map',
    'stats.game': '{n} match',
    'stats.games': '{n} matches',
    'stats.record': '{w}W {l}L',
    'stats.winrate': 'Win rate',
    'stats.empty': 'No matches to analyze.',
    'stats.partial': "{n} matches couldn't load and were left out.",

    'shop.owned': 'Owned',
    'profile.needsDevBuild': "On Android, notifications don't work in Expo Go. You need a development build (npx expo run:android).",
    'what.owned': 'Your skins',
    'what.wallet': 'Your wallet',

    'preview.variants': 'Variants',
    'preview.levels': 'Levels',
    'preview.level': 'Level {n}',
    'preview.base': 'Base',
    'preview.variant': 'Variant {n}',
    'preview.noVideo': 'No video for this item.',
    'preview.notFound': "Couldn't find this skin in the catalog.",
    'preview.close': 'Close',
    'levelItem.VFX': 'Visual effects',
    'levelItem.Animation': 'Animation',
    'levelItem.Finisher': 'Finisher',
    'levelItem.SoundEffects': 'Sound effects',
    'levelItem.KillBanner': 'Kill banner',
    'levelItem.Transformation': 'Transformation',
    'levelItem.KillEffect': 'Kill effect',
    'levelItem.TopFrag': 'Top frag',
    'levelItem.KillCounter': 'Kill counter',
    'levelItem.Randomizer': 'Randomizer',
    'levelItem.InspectAndKill': 'Inspect and kill',
    'levelItem.SongShuffle': 'Song shuffle',
    'levelItem.Voiceover': 'Voiceover',
    'levelItem.HeartbeatAndMapSensor': 'Heartbeat sensor',
    'levelItem.FishAnimation': 'Fish animation',
    'levelItem.AttackerDefenderSwap': 'Attacker/defender swap',

    'tabs.collection': 'Collection',
    'collection.title': 'Collection',
    'collection.subtitle': '{n} skins · {vp} VP in skins',
    'collection.loading': 'Loading your collection...',
    'collection.empty': 'No skins in your collection yet.',
    'collection.all': 'All',
    'category.Sidearm': 'Sidearms',
    'category.SMG': 'SMGs',
    'category.Shotgun': 'Shotguns',
    'category.Rifle': 'Rifles',
    'category.Sniper': 'Snipers',
    'category.Heavy': 'Heavy',
    'category.Melee': 'Melee',
    'queue.competitive': 'Competitive',
    'queue.unrated': 'Unrated',
    'queue.swiftplay': 'Swiftplay',
    'preview.wish': 'Add to wishlist',
    'preview.unwish': 'Remove from wishlist',
    'bp.level': 'Level {n} of {total}',
    'bp.levelShort': 'Lv. {n}',
    'bp.xp': '{a} / {b} XP',
    'bp.complete': 'Pass complete',
    'bp.epilogue': 'Epilogue',
    'what.contracts': 'Your battle pass',
    'profile.version': 'Version',
  },

  'es-ES': {
    'common.errorTitle': 'Algo salió mal',
    'common.retry': 'Reintentar',
    'common.rr': 'RR',
    'common.minutes': '{n} min',

    'app.probing': 'Entrando con la sesión guardada...',
    'app.opening': 'Abriendo tu sesión...',
    'tabs.shop': 'Tienda',
    'tabs.wishlist': 'Deseos',
    'tabs.matches': 'Partidas',
    'tabs.profile': 'Perfil',

    'login.title': 'Tu tienda, tus partidas.',
    'login.body': 'El inicio de sesión ocurre en la página oficial de Riot. La app no ve ni guarda tu contraseña.',
    'login.button': 'Entrar con Riot',

    'shop.title': 'Tienda',
    'shop.loading': 'Cargando tu tienda...',
    'shop.resets': 'Ofertas diarias se renuevan en {h}h {m}min',
    'shop.noForecast': 'sin previsión',
    'shop.alertTitle': '¡En la tienda hoy!',
    'shop.alertBody': 'Llegaron skins de tu lista de deseos: {names}',
    'shop.unknownSkin': 'Skin desconocida',
    'shop.noImage': 'sin imagen',
    'shop.noPanel': 'La respuesta de la tienda no trajo SkinsPanelLayout.',

    'wishlist.title': 'Lista de deseos',
    'wishlist.subtitle': 'Skins que quieres',
    'wishlist.loading': 'Cargando skins...',
    'wishlist.search': 'Buscar skins...',
    'wishlist.results': '{n} resultados',
    'wishlist.yourList': 'Tu lista · {n}',
    'wishlist.noResults': 'No se encontraron skins.',
    'wishlist.empty': 'Busca una skin arriba y añádela a la lista.',
    'wishlist.notInStore': 'No está en la tienda',
    'wishlist.catalogError': 'No pude cargar el catálogo de skins.',

    'matches.title': 'Partidas',
    'matches.subtitle': '{n} partidas · toca para ver detalles',
    'matches.loading': 'Buscando tus partidas...',
    'matches.emptyTitle': 'Nada por aquí',
    'matches.emptyBody': 'No hay partidas de este modo en tu historial reciente.',
    'matches.unknownMap': 'Mapa desconocido',

    'match.back': 'Partidas',
    'match.loading': 'Abriendo la partida...',
    'match.win': 'Victoria',
    'match.loss': 'Derrota',
    'match.draw': 'Empate',
    'match.yourPerformance': 'Tu rendimiento',
    'match.scoreboard': 'Marcador',
    'match.yourTeam': 'Tu equipo',
    'match.enemies': 'Rivales',
    'match.anonymous': 'Anónimo',
    'match.player': 'Jugador',

    'profile.loading': 'Cargando tu perfil...',
    'profile.signOutShort': 'Salir',
    'profile.signOut': 'Cerrar sesión o cambiar de cuenta',
    'profile.mostPlayed': 'Más jugado',
    'profile.gamesOf': '{games} de {sample} partidas recientes',
    'profile.currentRank': 'Rango actual',
    'profile.lastN': 'Últimas {n} competitivas',
    'profile.wins': 'Victorias',
    'profile.winrate': 'Winrate',
    'profile.bestStreak': 'Mejor racha',
    'profile.streakValue': '{n}V',
    'profile.avgRR': 'Media RR',
    'profile.peakRank': 'Mejor rango',
    'profile.server': 'Servidor',
    'profile.unranked': 'Sin rango',
    'profile.noName': 'Cuenta sin nombre',
    'profile.language': 'Idioma',
    'profile.notifications': 'Notificaciones',
    'profile.shopAlerts': 'Avisar cuando la tienda se renueve',
    'profile.shopAlertsHint': 'Cada día a la hora del reinicio, incluso con la app cerrada.',
    'profile.permissionDenied': 'Permite las notificaciones en los ajustes del móvil.',
    'notify.channel': 'Tienda renovada',
    'notify.title': '¡Tu tienda se renovó!',
    'notify.body': 'Skins nuevas en tu tienda diaria. Toca para verlas.',

    'errors.downtime': 'VALORANT está en mantenimiento en tu servidor. La tienda vuelve cuando Riot reactive los servicios.',
    'errors.expired': 'Tu sesión expiró. Vuelve a entrar.',
    'errors.failed': '{what} falló (HTTP {status}).',
    'errors.noEntitlement': 'Riot no devolvió entitlements_token.',
    'errors.unknownShard': "No sé qué shard usar para la región '{region}'.",
    'errors.noVersion': 'No encontré riotClientVersion.',
    'errors.badToken': 'El access token no parece un JWT válido.',
    'errors.noPuuid': 'No encontré el PUUID en el access token.',

    'what.call': 'La petición',
    'what.entitlement': 'Entitlement',
    'what.region': 'Detección de región',
    'what.version': 'Versión de VALORANT',
    'what.shop': 'La tienda',
    'what.matches': 'El historial de partidas',
    'what.matchDetails': 'Los detalles de la partida',
    'what.playerNames': 'Los nombres de los jugadores',
    'what.accountName': 'El nombre de la cuenta',
    'what.mmr': 'Tu MMR',
    'what.level': 'Tu nivel',
    'what.loadout': 'Tu loadout',

    'shop.nightMarket': 'Mercado Nocturno',
    'shop.daily': 'Ofertas del día',
    'shop.endsIn': 'termina en {time}',
    'matches.tabHistory': 'Historial',
    'matches.tabStats': 'Estadísticas',
    'stats.loading': 'Analizando partidas... {done}/{total}',
    'stats.overall': 'General · últimas {n} partidas',
    'stats.byAgent': 'Por agente',
    'stats.byMap': 'Por mapa',
    'stats.game': '{n} partida',
    'stats.games': '{n} partidas',
    'stats.record': '{w}V {l}D',
    'stats.winrate': 'Winrate',
    'stats.empty': 'No hay partidas para analizar.',
    'stats.partial': '{n} partidas no cargaron y quedaron fuera.',

    'shop.owned': 'La tienes',
    'profile.needsDevBuild': 'En Android, las notificaciones no funcionan en Expo Go. Necesitas una build de desarrollo (npx expo run:android).',
    'what.owned': 'Tus skins',
    'what.wallet': 'Tu cartera',

    'preview.variants': 'Variantes',
    'preview.levels': 'Niveles',
    'preview.level': 'Nivel {n}',
    'preview.base': 'Base',
    'preview.variant': 'Variante {n}',
    'preview.noVideo': 'No hay vídeo para este objeto.',
    'preview.notFound': 'No encontré esta skin en el catálogo.',
    'preview.close': 'Cerrar',
    'levelItem.VFX': 'Efectos visuales',
    'levelItem.Animation': 'Animación',
    'levelItem.Finisher': 'Remate',
    'levelItem.SoundEffects': 'Efectos de sonido',
    'levelItem.KillBanner': 'Banner de baja',
    'levelItem.Transformation': 'Transformación',
    'levelItem.KillEffect': 'Efecto de baja',
    'levelItem.TopFrag': 'Top frag',
    'levelItem.KillCounter': 'Contador de bajas',
    'levelItem.Randomizer': 'Aleatorio',
    'levelItem.InspectAndKill': 'Inspección y baja',
    'levelItem.SongShuffle': 'Canciones',
    'levelItem.Voiceover': 'Voz',
    'levelItem.HeartbeatAndMapSensor': 'Sensor de latidos',
    'levelItem.FishAnimation': 'Animación del pez',
    'levelItem.AttackerDefenderSwap': 'Cambio ataque/defensa',

    'tabs.collection': 'Colección',
    'collection.title': 'Colección',
    'collection.subtitle': '{n} skins · {vp} VP en skins',
    'collection.loading': 'Cargando tu colección...',
    'collection.empty': 'Todavía no tienes skins en tu colección.',
    'collection.all': 'Todo',
    'category.Sidearm': 'Pistolas',
    'category.SMG': 'Subfusiles',
    'category.Shotgun': 'Escopetas',
    'category.Rifle': 'Fusiles',
    'category.Sniper': 'Francotiradores',
    'category.Heavy': 'Pesadas',
    'category.Melee': 'Cuerpo a cuerpo',
    'queue.competitive': 'Competitivo',
    'queue.unrated': 'No competitivo',
    'queue.swiftplay': 'Swiftplay',
    'preview.wish': 'Añadir a la lista de deseos',
    'preview.unwish': 'Quitar de la lista de deseos',
    'bp.level': 'Nivel {n} de {total}',
    'bp.levelShort': 'Nv. {n}',
    'bp.xp': '{a} / {b} XP',
    'bp.complete': 'Pase completo',
    'bp.epilogue': 'Epílogo',
    'what.contracts': 'Tu pase de batalla',
    'profile.version': 'Versión',
  },
};

/** Idioma do aparelho mapeado para um dos suportados. */
function deviceLanguage() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const prefix = locale.slice(0, 2).toLowerCase();

    return LANGUAGES.find((language) => language.code.startsWith(prefix))?.code || 'en-US';
  } catch {
    return FALLBACK;
  }
}

function initialLanguage() {
  const saved = readSettings().language;

  return LANGUAGES.some((language) => language.code === saved) ? saved : deviceLanguage();
}

// Lido de forma síncrona pra primeira tela já sair no idioma certo.
let current = initialLanguage();

export function getLanguage() {
  return current;
}

export function t(key, params) {
  const text = STRINGS[current]?.[key] ?? STRINGS[FALLBACK][key] ?? key;

  if (!params) {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined ? match : String(params[name])
  );
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(current);

  const setLang = useCallback((code) => {
    current = code;

    updateSettings({ language: code });

    setLangState(code);
  }, []);

  // `lang` no value faz todo mundo que usa o hook re-renderizar.
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error('useI18n precisa estar dentro de <I18nProvider>.');
  }

  return value;
}
