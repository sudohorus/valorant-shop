// Camada de acesso à Riot: sessão + chamadas cruas.
// Cada tela monta seus dados em cima disto.

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

/** Lê access_token/id_token do fragmento do redirect. */
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
function puuidFromToken(accessToken) {
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

export class RiotError extends Error {
  constructor(message, { code = null, status = null } = {}) {
    super(message);

    this.code = code;
    this.status = status;
  }
}

async function readOrThrow(response, what) {
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
    throw new RiotError(
      'O VALORANT está em manutenção no seu servidor. ' +
        'A loja volta quando a Riot religar os serviços.',
      { code, status: response.status }
    );
  }

  if (code === 'BAD_CLAIMS' || response.status === 401) {
    throw new RiotError('Sua sessão expirou. Entre de novo.', {
      code: 'EXPIRED',
      status: response.status,
    });
  }

  throw new RiotError(
    `${what} falhou (HTTP ${response.status}).` +
      (body ? `\n${body.slice(0, 300)}` : ''),
    { code, status: response.status }
  );
}

/**
 * Abre a sessão a partir dos tokens do login: descobre PUUID,
 * entitlement, shard e versão do cliente. Todas as telas
 * reaproveitam isso via AuthProvider.
 */
export async function openSession({ accessToken, idToken }) {
  const puuid = puuidFromToken(accessToken);

  const [entitlement, shard, clientVersion] = await Promise.all([
    fetch(ENTITLEMENTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
      .then((response) => readOrThrow(response, 'Entitlement'))
      .then((data) => {
        if (!data.entitlements_token) {
          throw new RiotError('A Riot não retornou entitlements_token.');
        }

        return data.entitlements_token;
      }),

    fetch(GEO_URL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_token: idToken }),
    })
      .then((response) => readOrThrow(response, 'Descoberta de região'))
      .then((data) => {
        const region = data?.affinities?.live;

        const shard = SHARDS[region];

        if (!shard) {
          throw new RiotError(
            `Não sei qual shard usar para a região '${region}'.`
          );
        }

        return shard;
      }),

    fetch(VERSION_URL)
      .then((response) => readOrThrow(response, 'Versão do VALORANT'))
      .then(({ data }) => {
        const version = data?.riotClientVersion || data?.clientVersion;

        if (!version) {
          throw new RiotError('Não encontrei riotClientVersion.');
        }

        return version;
      }),
  ]);

  return { accessToken, idToken, puuid, entitlement, shard, clientVersion };
}

/** Chamada autenticada num endpoint do jogo (pd.{shard}.a.pvp.net). */
export async function callGame(
  session,
  path,
  { method = 'GET', body, what = 'A chamada' } = {}
) {
  const response = await fetch(`https://pd.${session.shard}.a.pvp.net${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'X-Riot-Entitlements-JWT': session.entitlement,
      'X-Riot-ClientPlatform': PLATFORM,
      'X-Riot-ClientVersion': session.clientVersion,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return readOrThrow(response, what);
}
