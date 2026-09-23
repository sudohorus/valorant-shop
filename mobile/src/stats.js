// Estatísticas por mapa e por agente, a partir do match-details
// das últimas competitivas (o mesmo cache do detalhe da partida).

import { agents, maps } from './content';
import { rawMatch } from './match';

// Poucas chamadas por vez para não tomar rate limit da Riot.
const BATCH = 4;

function emptyLine() {
  return { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, score: 0, rounds: 0, damage: 0, headshots: 0, shots: 0 };
}

/** Soma dano e tiros só de um jogador ao longo dos rounds. */
function myShots(match, puuid) {
  const totals = { damage: 0, headshots: 0, shots: 0 };

  for (const round of match.roundResults || []) {
    const mine = (round.playerStats || []).find((stats) => stats.subject === puuid);

    for (const hit of mine?.damage || []) {
      totals.damage += hit.damage || 0;
      totals.headshots += hit.headshots || 0;
      totals.shots += (hit.headshots || 0) + (hit.bodyshots || 0) + (hit.legshots || 0);
    }
  }

  return totals;
}

function add(line, game) {
  line.games += 1;
  line.wins += game.won ? 1 : 0;
  line.kills += game.kills;
  line.deaths += game.deaths;
  line.assists += game.assists;
  line.score += game.score;
  line.rounds += game.rounds;
  line.damage += game.damage;
  line.headshots += game.headshots;
  line.shots += game.shots;
}

function summarize(line) {
  return {
    games: line.games,
    wins: line.wins,
    losses: line.games - line.wins,
    winrate: line.games ? Math.round((line.wins / line.games) * 100) : 0,
    kd: line.deaths ? (line.kills / line.deaths).toFixed(2) : line.kills.toFixed(2),
    acs: line.rounds ? Math.round(line.score / line.rounds) : 0,
    adr: line.rounds ? Math.round(line.damage / line.rounds) : 0,
    hs: line.shots ? Math.round((line.headshots / line.shots) * 100) : null,
  };
}

/** Uma partida reduzida ao que importa para as stats. */
function toGame(match, puuid) {
  const me = (match.players || []).find((player) => player.subject === puuid);

  if (!me?.stats) {
    return null;
  }

  const team = (match.teams || []).find((entry) => entry.teamId === me.teamId);

  return {
    mapId: (match.matchInfo?.mapId || '').toLowerCase(),
    agentId: (me.characterId || '').toLowerCase(),
    won: Boolean(team?.won),
    kills: me.stats.kills || 0,
    deaths: me.stats.deaths || 0,
    assists: me.stats.assists || 0,
    score: me.stats.score || 0,
    rounds: me.stats.roundsPlayed || 0,
    ...myShots(match, puuid),
  };
}

/**
 * Busca os detalhes de cada partida (em lotes) e agrupa.
 * `onProgress(done, total)` avisa a tela enquanto carrega.
 */
export async function loadStats(session, matchIds, onProgress) {
  const [mapIndex, agentIndex] = await Promise.all([maps(), agents()]);

  const games = [];
  let failed = 0;

  for (let i = 0; i < matchIds.length; i += BATCH) {
    const batch = matchIds.slice(i, i + BATCH);

    const results = await Promise.all(
      batch.map((id) => rawMatch(session, id).catch(() => null))
    );

    for (const match of results) {
      const game = match ? toGame(match, session.puuid) : null;

      if (game) {
        games.push(game);
      } else {
        failed += 1;
      }
    }

    onProgress?.(Math.min(i + BATCH, matchIds.length), matchIds.length);
  }

  const overall = emptyLine();
  const byMap = new Map();
  const byAgent = new Map();

  for (const game of games) {
    add(overall, game);

    if (!byMap.has(game.mapId)) byMap.set(game.mapId, emptyLine());
    if (!byAgent.has(game.agentId)) byAgent.set(game.agentId, emptyLine());

    add(byMap.get(game.mapId), game);
    add(byAgent.get(game.agentId), game);
  }

  // Mais jogados primeiro; empate, melhor winrate.
  const order = (a, b) => b.games - a.games || b.winrate - a.winrate;

  return {
    failed,
    overall: summarize(overall),
    maps: [...byMap.entries()]
      .map(([id, line]) => ({
        id,
        name: mapIndex.get(id)?.name || null,
        image: mapIndex.get(id)?.image || null,
        ...summarize(line),
      }))
      .sort(order),
    agents: [...byAgent.entries()]
      .map(([id, line]) => ({
        id,
        name: agentIndex.get(id)?.name || null,
        icon: agentIndex.get(id)?.icon || null,
        ...summarize(line),
      }))
      .sort(order),
  };
}
