// Lantern Lanes — the rival. A heuristic opponent that reads the board:
// it plays its best affordable card into the lane where it helps most,
// then attacks with every ready creature — killing what it can, and going
// for the hero when the lane is clear. Its moves run one at a time, with
// a pause between them, so the player can follow what it does.

import { CARD_MAP } from './cards.js';

const STEP_MS = 650;

function cardValue(game, side, card) {
  // Body stats, plus what the card does beyond its body.
  let value = card.atk + card.hp;
  if (card.swift) value += 0.5;
  if (card.guardian) value += 0.5;
  if (card.onPlay) value += 1;
  // Kindred: a card is worth more when its faction already stands with you.
  const kin = game.boards[side].flat().filter((c) => c.faction === card.faction).length;
  value += kin;
  return value;
}

function pickCardToPlay(game) {
  const side = 'ai';
  const mana = game.heroes[side].mana;
  let best = null;
  game.hands[side].forEach((cardId, handIndex) => {
    const card = CARD_MAP.get(cardId);
    if (card.cost > mana) return;
    const score = cardValue(game, side, card) - card.cost * 0.5;
    if (!best || score > best.score) best = { handIndex, score, card };
  });
  if (!best) return null;
  // Lane: stand beside kin for Kindred, else spread to the emptiest lane.
  let lane = 0;
  let laneScore = -1;
  for (let i = 0; i < game.boards[side].length; i++) {
    const row = game.boards[side][i];
    if (row.length >= 4) continue;
    const kin = row.filter((c) => c.faction === best.card.faction).length;
    const score = kin * 10 - row.length;
    if (score > laneScore) {
      laneScore = score;
      lane = i;
    }
  }
  return { handIndex: best.handIndex, lane };
}

function pickAttackTarget(game, creature, targets) {
  const heroTarget = targets.find((t) => t.kind === 'hero');
  if (heroTarget) return heroTarget;
  const foes = targets.map((t) => t.creature);
  // Kill what can be killed, the strongest first.
  const killable = foes.filter((f) => f.hp <= creature.atk);
  if (killable.length) {
    return { kind: 'creature', creature: killable.sort((a, b) => b.atk - a.atk)[0] };
  }
  // Otherwise trade only when the attacker survives the reply.
  const survivable = foes.filter((f) => f.atk < creature.hp);
  if (survivable.length) {
    return { kind: 'creature', creature: survivable.sort((a, b) => b.atk - a.atk)[0] };
  }
  return null;
}

export function runAiTurn(game, done) {
  const playStep = () => {
    if (game.phase !== 'play') {
      done();
      return;
    }
    const pick = pickCardToPlay(game);
    if (!pick) {
      attackPhase();
      return;
    }
    game.playCard('ai', pick.handIndex, pick.lane);
    if (game.onAiStep) game.onAiStep();
    setTimeout(playStep, STEP_MS);
  };

  const attackPhase = () => {
    const attackers = game.boards.ai.flat().filter((c) => c.ready);
    let i = 0;
    const attackStep = () => {
      if (game.phase !== 'play') {
        done();
        return;
      }
      if (i >= attackers.length) {
        done();
        return;
      }
      const creature = attackers[i++];
      if (creature.alive && creature.ready) {
        const targets = game.attackTargets(creature);
        const best = pickAttackTarget(game, creature, targets);
        if (best) game.attack(creature, best);
      }
      if (game.onAiStep) game.onAiStep();
      setTimeout(attackStep, STEP_MS);
    };
    setTimeout(attackStep, STEP_MS);
  };

  setTimeout(playStep, STEP_MS);
}
