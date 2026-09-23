// Detalhes de uma partida (placar, scoreboard, stats por jogador).

import { agents, competitiveTiers, maps } from './content';
import { callGame } from './riot';

const cache = new Map();

/** Resposta crua do match-details. Partida encerrada não muda, então fica em cache. */
export function rawMatch(session, matchId) {
  if (cache.has(matchId)) {
    return cache.get(matchId);
  }

  const promise = callGame(session, `/match-details/v1/matches/${matchId}`, {
    what: 'what.matchDetails',
  }).catch((problem) => {
    cache.delete(matchId);

    throw problem;
  });

  cache.set(matchId, promise);

  return promise;
}

/** Soma dano, headshots e tiros de cada jogador em todos os rounds. */
function damageTotals(roundResults) {
  const totals = new Map();

  for (const round of roundResults || []) {
    for (const stats of round.playerStats || []) {
      const entry = totals.get(stats.subject) || {
        damage: 0,
        headshots: 0,
        shots: 0,
      };

      for (const hit of stats.damage || []) {
        entry.damage += hit.damage || 0;
        entry.headshots += hit.headshots || 0;
        entry.shots +=
          (hit.headshots || 0) + (hit.bodyshots || 0) + (hit.legshots || 0);
      }

      totals.set(stats.subject, entry);
    }
  }

  return totals;
}

/**
 * O match-details não traz mais gameName/tagLine, então os nomes
 * vêm do name-service. Se falhar, a tela mostra o agente no lugar.
 */
async function playerNames(session, puuids) {
  if (!puuids.length) {
    return new Map();
  }

  try {
    const names = await callGame(session, '/name-service/v2/players', {
      method: 'PUT',
      body: puuids,
      what: 'what.playerNames',
    });

    return new Map(
      names
        .filter((entry) => entry.GameName)
        .map((entry) => [entry.Subject, { gameName: entry.GameName, tagLine: entry.TagLine }])
    );
  } catch (problem) {
    console.warn(problem.message);

    return new Map();
  }
}

export async function loadMatchDetails(session, matchId) {
  const [match, mapIndex, agentIndex, tierIndex] = await Promise.all([
    rawMatch(session, matchId),
    maps(),
    agents(),
    competitiveTiers(),
  ]);

  const info = match.matchInfo || {};
  const map = mapIndex.get((info.mapId || '').toLowerCase());
  const totals = damageTotals(match.roundResults);
  const names = await playerNames(
    session,
    (match.players || []).map((player) => player.subject)
  );

  const players = (match.players || []).map((player) => {
    const stats = player.stats || {};
    const rounds = stats.roundsPlayed || 1;
    const agent = agentIndex.get((player.characterId || '').toLowerCase());
    const tier = tierIndex.get(player.competitiveTier);
    const shots = totals.get(player.subject) || { damage: 0, headshots: 0, shots: 0 };
    const named = names.get(player.subject) ||
      (player.gameName ? { gameName: player.gameName, tagLine: player.tagLine } : null);

    return {
      puuid: player.subject,
      name: named ? `${named.gameName}#${named.tagLine}` : null,
      // Sem nome (modo anônimo), usa o agente pra dar pra identificar.
      gameName: named?.gameName || agent?.name || null,
      tagLine: named?.tagLine || null,
      team: player.teamId,
      agent: agent?.name || null,
      agentIcon: agent?.icon || null,
      tierIcon: tier?.icon || null,
      tier: tier?.name || null,
      kills: stats.kills ?? 0,
      deaths: stats.deaths ?? 0,
      assists: stats.assists ?? 0,
      acs: Math.round((stats.score || 0) / rounds),
      adr: Math.round(shots.damage / rounds),
      hs: shots.shots ? Math.round((shots.headshots / shots.shots) * 100) : null,
      isMe: player.subject === session.puuid,
    };
  });

  const me = players.find((player) => player.isMe);

  const teams = (match.teams || []).map((team) => ({
    id: team.teamId,
    won: team.won,
    roundsWon: team.roundsWon ?? 0,
    players: players
      .filter((player) => player.team === team.teamId)
      .sort((a, b) => b.acs - a.acs),
  }));

  // Meu time primeiro.
  teams.sort((a, b) => (b.id === me?.team) - (a.id === me?.team));

  const [mine, theirs] = teams;

  return {
    id: matchId,
    map: map?.name || null,
    mapImage: map?.splash || map?.image || null,
    playedAt: info.gameStartMillis ? new Date(info.gameStartMillis) : null,
    durationMin: info.gameLengthMillis ? Math.round(info.gameLengthMillis / 60000) : null,
    // Código, não texto: a tela traduz.
    result: !mine || !theirs
      ? null
      : mine.won
        ? 'win'
        : mine.roundsWon === theirs.roundsWon
          ? 'draw'
          : 'loss',
    me,
    teams,
  };
}
