// Lantern Lanes — bootstrap and controls.
//
// Mouse: click a card, then a lane, to play it. Click a ready creature,
// then a target in its lane (or the enemy hero, if the lane is clear), to
// attack. Keyboard: Enter starts the game and ends your turn, Esc clears
// a selection. ?shot=title|play|win|loss renders a screenshot preset.

import { Game } from './engine.js';
import { render, findCreature } from './render.js';
import { applyShot } from './shots.js';
import { mulberry32 } from './random.js';

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam : Date.now() % 2147483647;
const shot = params.get('shot');

const game = new Game(mulberry32(seed));
game.onAiStep = () => render(game);

if (shot) applyShot(game, shot);
render(game);

document.addEventListener('click', (event) => {
  if (event.target.closest('#play-button')) {
    game.start();
    render(game);
    return;
  }
  if (event.target.closest('#play-again')) {
    location.reload();
    return;
  }
  if (event.target.closest('#end-turn')) {
    game.endTurn();
    render(game);
    return;
  }
  if (game.phase !== 'play' || game.active !== 'player' || game.aiBusy) return;

  const handCard = event.target.closest('.hand-card');
  if (handCard) {
    const idx = Number(handCard.dataset.handIndex);
    if (game.canPlay('player', idx)) {
      game.selectedCard = game.selectedCard === idx ? null : idx;
      game.selectedAttacker = null;
    }
    render(game);
    return;
  }

  const laneEl = event.target.closest('.lane');
  if (laneEl && game.selectedCard !== null) {
    const lane = Number(laneEl.dataset.lane);
    game.playCard('player', game.selectedCard, lane);
    game.selectedCard = null;
    render(game);
    return;
  }

  const creatureEl = event.target.closest('.creature');
  if (creatureEl) {
    const uid = Number(creatureEl.dataset.uid);
    const creature = findCreature(game, uid);
    if (!creature) return;
    if (creature.owner === 'player') {
      if (creature.ready) {
        game.selectedAttacker = game.selectedAttacker === uid ? null : uid;
        game.selectedCard = null;
      }
      render(game);
      return;
    }
    if (game.selectedAttacker !== null) {
      const attacker = findCreature(game, game.selectedAttacker);
      const targets = attacker ? game.attackTargets(attacker) : [];
      const target = targets.find((t) => t.kind === 'creature' && t.creature.uid === uid);
      if (attacker && target) {
        game.attack(attacker, target);
        game.selectedAttacker = null;
      }
      render(game);
      return;
    }
  }

  const aiHero = event.target.closest('#ai-hero');
  if (aiHero && game.selectedAttacker !== null) {
    const attacker = findCreature(game, game.selectedAttacker);
    const targets = attacker ? game.attackTargets(attacker) : [];
    const target = targets.find((t) => t.kind === 'hero');
    if (attacker && target) {
      game.attack(attacker, target);
      game.selectedAttacker = null;
    }
    render(game);
    return;
  }

  if (game.selectedCard !== null || game.selectedAttacker !== null) {
    game.selectedCard = null;
    game.selectedAttacker = null;
    render(game);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    if (game.phase === 'title') {
      game.start();
      render(game);
    } else if (game.phase === 'play' && game.active === 'player' && !game.aiBusy) {
      game.endTurn();
      render(game);
    } else if (game.phase === 'over') {
      location.reload();
    }
  } else if (event.key === 'Escape') {
    game.selectedCard = null;
    game.selectedAttacker = null;
    render(game);
  }
});
