// Porte direto do python-reference/shop.py.

export const AUTH_URL =
  'https://auth.riotgames.com/authorize' +
  '?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in' +
  '&client_id=play-valorant-web-prod' +
  '&response_type=token%20id_token' +
  '&nonce=1' +
  '&scope=account%20openid';

const ENTITLEMENTS_URL =
  'https://entitlements.auth.riotgames.com/api/token/v1';

const GEO_URL =
  'https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant';

const VERSION_URL = 'https://valorant-api.com/v1/version';

const SKINS_URL = 'https://valorant-api.com/v1/weapons/skinlevels';

// Base64 do payload que o cliente VALORANT manda.
const PLATFORM =
  'eyJwbGF0Zm9ybVR5cGUiOiJQQyIsInBsYXRmb3JtT1MiOiJXaW5kb3dzIiwicGxhdGZvcm1PU1' +
  'ZlcnNpb24iOiIxMC4wLjE5MDQ0LjEuMjU2LjY0Yml0IiwicGxhdGZvcm1DaGlwc2V0IjoiVW5r' +
  'bm93biJ9';

const USER_AGENT = 'ShooterGame/13 Windows/10.0.19044.1.256.64bit';

// BR e LATAM ficam no shard NA.
const SHARDS = {
  br: 'na',
  latam: 'na',
  na: 'na',
  eu: 'eu',
  ap: 'ap',
  kr: 'kr',
};

/**
 * Lê o access_token/id_token do fragmento do redirect.
 * Retorna null se a URL não for o redirect final.
 */
export function parseAuthRedirect(url) {
  if (!url || !url.includes('access_token=')) {
    return null;
  }

  const hash = url.split('#')[1];

  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);

  const accessToken = params.get('access_token');
  const idToken = params.get('id_token');

  if (!accessToken || !idToken) {
    return null;
  }

  return { accessToken, idToken };
}

/** Decodifica só o payload do JWT, para pegar o PUUID ("sub"). */
export function puuidFromToken(accessToken) {
  const payload = accessToken.split('.')[1];

  if (!payload) {
    throw new Error('Access token não parece ser um JWT válido.');
  }

  const normalized = payload
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');

  const sub = JSON.parse(global.atob(normalized)).sub;

  if (!sub) {
    throw new Error('Não encontrei PUUID no access token.');
  }

  return sub;
}

async function expectOk(response, what) {
  if (response.ok) {
    return response.json();
  }

  const body = await response.text();

  // A Riot devolve errorCode em JSON nas falhas conhecidas.
  let code = null;

  try {
    code = JSON.parse(body).errorCode;
  } catch {
    // Corpo vazio ou HTML: segue com a mensagem genérica.
  }

  if (code === 'SCHEDULED_DOWNTIME') {
    throw new Error(
      'O VALORANT está em manutenção no seu servidor. ' +
        'A loja volta quando a Riot religar os serviços.'
    );
  }

  if (code === 'BAD_CLAIMS' || response.status === 401) {
    throw new Error('Sua sessão expirou. Entre de novo.');
  }

  throw new Error(
    `${what} falhou (HTTP ${response.status}).` +
      (body ? `\n${body.slice(0, 300)}` : '')
  );
}

async function getEntitlement(accessToken) {
  const response = await fetch(ENTITLEMENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  const data = await expectOk(response, 'Entitlement');

  if (!data.entitlements_token) {
    throw new Error('A Riot não retornou entitlements_token.');
  }

  return data.entitlements_token;
}

async function getShard(accessToken, idToken) {
  const response = await fetch(GEO_URL, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id_token: idToken }),
  });

  const data = await expectOk(response, 'Descoberta de região');

  const region = data?.affinities?.live;

  const shard = SHARDS[region];

  if (!shard) {
    throw new Error(`Não sei qual shard usar para a região '${region}'.`);
  }

  return shard;
}

async function getClientVersion() {
  const response = await fetch(VERSION_URL);

  const { data } = await expectOk(response, 'Versão do VALORANT');

  const version = data?.riotClientVersion || data?.clientVersion;

  if (!version) {
    throw new Error('Não encontrei riotClientVersion/clientVersion.');
  }

  return version;
}

async function getStorefront({
  accessToken,
  entitlement,
  puuid,
  shard,
  clientVersion,
}) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'X-Riot-Entitlements-JWT': entitlement,
    'X-Riot-ClientPlatform': PLATFORM,
    'X-Riot-ClientVersion': clientVersion,
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const base = `https://pd.${shard}.a.pvp.net/store`;

  // A Riot trocou o storefront de GET v2 para POST v3.
  // Tentamos v3 primeiro e caímos no v2 se der 404.
  const attempts = [
    { method: 'POST', url: `${base}/v3/storefront/${puuid}`, body: '{}' },
    { method: 'GET', url: `${base}/v2/storefront/${puuid}`, body: undefined },
  ];

  let last = null;

  for (const attempt of attempts) {
    const response = await fetch(attempt.url, {
      method: attempt.method,
      headers,
      body: attempt.body,
    });

    if (response.ok) {
      return response.json();
    }

    last = response;

    if (response.status !== 404) {
      break;
    }
  }

  return expectOk(last, 'Storefront');
}

async function getSkinIndex() {
  try {
    const response = await fetch(SKINS_URL);

    const { data } = await expectOk(response, 'Catálogo de skins');

    const index = {};

    for (const skin of data) {
      if (skin.uuid) {
        index[skin.uuid.toLowerCase()] = skin;
      }
    }

    return index;
  } catch (error) {
    // Sem o catálogo ainda dá para mostrar preço e contagem.
    console.warn('Catálogo de skins indisponível:', error.message);

    return {};
  }
}

function resolveSkin(offer, index) {
  const byOffer = index[(offer.OfferID || '').toLowerCase()];

  if (byOffer) {
    return byOffer;
  }

  for (const reward of offer.Rewards || []) {
    const bySkin = index[(reward.ItemID || '').toLowerCase()];

    if (bySkin) {
      return bySkin;
    }
  }

  return null;
}

function priceOf(offer) {
  const costs = Object.values(offer.Cost || {});

  return costs.length ? costs[0] : null;
}

/** Faz o caminho todo: tokens -> loja pronta para renderizar. */
export async function fetchDailyShop({ accessToken, idToken }) {
  const puuid = puuidFromToken(accessToken);

  const [entitlement, shard, clientVersion] = await Promise.all([
    getEntitlement(accessToken),
    getShard(accessToken, idToken),
    getClientVersion(),
  ]);

  const store = await getStorefront({
    accessToken,
    entitlement,
    puuid,
    shard,
    clientVersion,
  });

  const panel = store.SkinsPanelLayout;

  if (!panel) {
    throw new Error('A resposta da loja não trouxe SkinsPanelLayout.');
  }

  const index = await getSkinIndex();

  const offers = (panel.SingleItemStoreOffers || []).map((offer) => {
    const skin = resolveSkin(offer, index);

    return {
      id: offer.OfferID,
      name: skin?.displayName || 'Skin desconhecida',
      image: skin?.displayIcon || null,
      price: priceOf(offer),
    };
  });

  return {
    offers,
    resetsInSeconds: panel.SingleItemOffersRemainingDurationInSeconds ?? null,
  };
}

export function formatCountdown(seconds) {
  if (seconds === null || seconds === undefined) {
    return '--';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}
