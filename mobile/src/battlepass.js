// Passe de batalha: progresso (Riot) + níveis e recompensas (valorant-api).

import {
  battlePasses,
  buddyLevels,
  currencies,
  playerCards,
  playerTitles,
  seasons,
  skinLevels,
  sprays,
} from './content';
import { callGame } from './riot';

/** Passe da temporada que está rolando agora. */
function currentPass(passes, seasonList) {
  const now = new Date().toISOString();

  const active = new Set(
    seasonList.filter((season) => season.start <= now && now <= season.end).map((season) => season.id)
  );

  return passes.find((pass) => active.has(pass.seasonId)) || null;
}

/** Nome e imagem de uma recompensa, conforme o tipo. */
function describeReward(reward, catalogs) {
  const id = (reward?.uuid || '').toLowerCase();

  switch (reward?.type) {
    case 'EquippableSkinLevel': {
      const skin = catalogs.skins.get(id);
      return { kind: 'skin', skinId: id, name: skin?.name, image: skin?.image };
    }
    case 'EquippableCharmLevel': {
      const buddy = catalogs.buddies.get(id);
      return { kind: 'buddy', name: buddy?.name, image: buddy?.icon };
    }
    case 'PlayerCard': {
      const card = catalogs.cards.get(id);
      return { kind: 'card', image: card?.large || card?.small };
    }
    case 'Spray': {
      const spray = catalogs.sprays.get(id);
      return { kind: 'spray', name: spray?.name, image: spray?.icon };
    }
    case 'Title':
      return { kind: 'title', name: catalogs.titles.get(id) };
    case 'Currency': {
      const currency = catalogs.currencies.get(id);
      return { kind: 'currency', name: currency?.name, image: currency?.icon, amount: reward.amount };
    }
    default:
      return { kind: 'other' };
  }
}

export async function loadBattlePass(session) {
  const [progress, passes, seasonList, skins, buddies, cards, sprayIndex, titles, currencyIndex] =
    await Promise.all([
      callGame(session, `/contracts/v1/contracts/${session.puuid}`, { what: 'what.contracts' }),
      battlePasses(),
      seasons(),
      skinLevels(),
      buddyLevels(),
      playerCards(),
      sprays(),
      playerTitles(),
      currencies(),
    ]);

  const pass = currentPass(passes, seasonList);

  if (!pass) {
    return null;
  }

  const mine = (progress.Contracts || []).find(
    (contract) => (contract.ContractDefinitionID || '').toLowerCase() === pass.id
  );

  // Quantos níveis você já tem e o XP acumulado rumo ao próximo.
  const reached = mine?.ProgressionLevelReached ?? 0;
  const xpInto = mine?.ProgressionTowardsNextLevel ?? 0;

  const catalogs = { skins, buddies, cards, sprays: sprayIndex, titles, currencies: currencyIndex };

  const levels = pass.levels.map((level, index) => ({
    number: index + 1,
    epilogue: level.epilogue,
    reached: index < reached,
    ...describeReward(level.reward, catalogs),
  }));

  const main = levels.filter((level) => !level.epilogue).length;
  const next = pass.levels[reached];

  return {
    name: pass.name,
    reached,
    total: main,
    complete: reached >= pass.levels.length,
    xpInto,
    xpNeeded: next?.xp ?? null,
    levels,
  };
}
