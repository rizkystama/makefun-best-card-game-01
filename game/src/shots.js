// Lantern Lanes — screenshot presets.
//
// ?shot=title renders the title screen. ?shot=play renders a mid-game
// table: turn 5, both heroes hurt, hands full, creatures across all three
// lanes — one of them visibly Kindred-buffed, badge and log line both
// naming the combo. ?shot=win and ?shot=loss render the same table with
// the game decided. Every preset is built through the game's own engine
// and painted by its own renderer, so each screenshot is a real render
// of the game itself.

import { Creature } from './engine.js';

function place(game, cardId, side, lane, ready, atkBoost = 0) {
  const creature = new Creature(cardId, side);
  creature.ready = ready;
  creature.summonedThisTurn = false;
  creature.atk += atkBoost;
  game.boards[side][lane].push(creature);
  return creature;
}

export function applyShot(game, shot) {
  game.start();
  if (shot === 'title') {
    game.phase = 'title';
    game.log = [];
    return;
  }

  // A mid-game table on turn 5.
  game.turn = 5;
  game.heroes.player.life = 14;
  game.heroes.ai.life = 15;
  game.heroes.player.maxMana = 6;
  game.heroes.player.mana = 3;
  game.heroes.ai.maxMana = 6;
  game.heroes.ai.mana = 2;
  game.hands.player = ['flame-herald', 'coral-guard', 'thorn-wolf', 'wave-singer', 'ember-imp'];
  game.hands.ai = ['pyre-drake', 'leviathan', 'moss-sprout', 'ancient-oak'];
  game.decks.player = Array(15).fill('ember-imp');
  game.decks.ai = Array(16).fill('tide-sprite');

  // Kindred on show: the Cinder Fox stands beside an Ember Imp, so its
  // attack reads 4 instead of its printed 3 — the badge on the card and
  // the log line both say so.
  place(game, 'cinder-fox', 'player', 0, true, 1);
  place(game, 'ember-imp', 'player', 0, false);
  place(game, 'coral-guard', 'player', 1, true);
  place(game, 'moss-sprout', 'player', 2, true);
  place(game, 'thorn-wolf', 'ai', 0, false);
  place(game, 'tide-sprite', 'ai', 1, true);
  place(game, 'flame-herald', 'ai', 2, true);
  game.say('The rival plays Flame Herald in lane 3.');
  game.say('You play Coral Guard in lane 2.');
  game.say('Kindred: Cinder Fox gains +1 attack (now 4).');

  if (shot === 'win') {
    game.heroes.ai.life = 0;
    game.checkEnd();
  } else if (shot === 'loss') {
    game.heroes.player.life = 0;
    game.checkEnd();
  }
}
