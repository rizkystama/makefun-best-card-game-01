// Lantern Lanes — the rules engine.
//
// A game is three lanes between two heroes with 20 life each. Mana starts
// at 1 and grows by 1 every turn, to a cap of 10. A creature attacks down
// its own lane: if an enemy creature stands in that lane it must be the
// target (a Guardian first), otherwise the blow lands on the enemy hero.
// Creatures wait a turn before they can attack, unless they are Swift.
// Kindred: playing a creature gives your other creatures of its faction
// +1 attack. An empty deck burns its hero for 1 life on every draw.

import { CARD_MAP } from './cards.js';
import { buildDeck, shuffle, drawFrom, STARTING_HAND } from './deck.js';
import { runAiTurn } from './ai.js';

export const LANES = 3;
export const LANE_CAPACITY = 4;
export const MAX_LIFE = 20;
export const MAX_MANA = 10;
export const MAX_HAND = 8;

let nextCreatureUid = 1;

export class Creature {
  constructor(cardId, owner) {
    const card = CARD_MAP.get(cardId);
    this.uid = nextCreatureUid++;
    this.cardId = cardId;
    this.owner = owner;
    this.atk = card.atk;
    this.hp = card.hp;
    this.maxHp = card.hp;
    this.ready = Boolean(card.swift);
    this.summonedThisTurn = true;
  }

  get card() {
    return CARD_MAP.get(this.cardId);
  }

  get faction() {
    return this.card.faction;
  }

  get guardian() {
    return Boolean(this.card.guardian);
  }

  get alive() {
    return this.hp > 0;
  }
}

export class Game {
  constructor(rng) {
    this.rng = rng;
    this.phase = 'title'; // title | play | over
    this.turn = 0;
    this.active = 'player';
    this.winner = null; // 'player' | 'ai' | 'draw'
    this.log = [];
    this.heroes = {
      player: { life: MAX_LIFE, mana: 0, maxMana: 0 },
      ai: { life: MAX_LIFE, mana: 0, maxMana: 0 },
    };
    this.hands = { player: [], ai: [] };
    this.decks = { player: [], ai: [] };
    this.boards = { player: [[], [], []], ai: [[], [], []] };
    this.selectedCard = null; // hand index of the player's chosen card
    this.selectedAttacker = null; // uid of the player's chosen attacker
    this.aiBusy = false;
    this.onAiStep = null; // set by the UI: re-render after each AI move
  }

  other(side) {
    return side === 'player' ? 'ai' : 'player';
  }

  say(text) {
    this.log.unshift(text);
    if (this.log.length > 6) this.log.pop();
  }

  start() {
    this.decks.player = shuffle(buildDeck(), this.rng);
    this.decks.ai = shuffle(buildDeck(), this.rng);
    for (let i = 0; i < STARTING_HAND; i++) {
      this.hands.player.push(drawFrom(this.decks.player));
      this.hands.ai.push(drawFrom(this.decks.ai));
    }
    this.phase = 'play';
    this.turn = 1;
    this.active = 'player';
    this.beginTurn('player');
    this.say('The lanterns are lit. Your move.');
  }

  beginTurn(side) {
    const hero = this.heroes[side];
    hero.maxMana = Math.min(MAX_MANA, hero.maxMana + 1);
    hero.mana = hero.maxMana;
    for (const lane of this.boards[side]) {
      for (const creature of lane) {
        creature.ready = true;
        creature.summonedThisTurn = false;
      }
    }
    const drawn = drawFrom(this.decks[side]);
    if (drawn) {
      if (this.hands[side].length < MAX_HAND) {
        this.hands[side].push(drawn);
      } else {
        this.say(side === 'player' ? 'Your hand is full — a card burns away.' : 'The rival’s hand is full — a card burns away.');
      }
    } else {
      hero.life -= 1;
      this.say(side === 'player' ? 'Your deck is empty — fatigue burns you for 1.' : 'The rival’s deck is empty — fatigue burns them for 1.');
      this.checkEnd();
    }
  }

  canPlay(side, handIndex) {
    if (this.phase !== 'play' || this.active !== side) return false;
    const cardId = this.hands[side][handIndex];
    if (!cardId) return false;
    return this.heroes[side].mana >= CARD_MAP.get(cardId).cost;
  }

  playCard(side, handIndex, lane) {
    if (!this.canPlay(side, handIndex)) return null;
    if (lane < 0 || lane >= LANES) return null;
    if (this.boards[side][lane].length >= LANE_CAPACITY) return null;
    const cardId = this.hands[side].splice(handIndex, 1)[0];
    const card = CARD_MAP.get(cardId);
    this.heroes[side].mana -= card.cost;
    const creature = new Creature(cardId, side);
    this.boards[side][lane].push(creature);
    // Kindred: your other creatures of this faction gain +1 attack.
    for (const row of this.boards[side]) {
      for (const other of row) {
        if (other !== creature && other.faction === card.faction) other.atk += 1;
      }
    }
    this.applyOnPlay(side, card);
    this.say(`${side === 'player' ? 'You play' : 'Rival plays'} ${card.name} in lane ${lane + 1}.`);
    this.checkEnd();
    return creature;
  }

  applyOnPlay(side, card) {
    if (card.onPlay === 'damage-hero-1') {
      this.heroes[this.other(side)].life -= 1;
      this.say(`${card.name} sears the enemy hero for 1.`);
    } else if (card.onPlay === 'draw-1') {
      const drawn = drawFrom(this.decks[side]);
      if (drawn && this.hands[side].length < MAX_HAND) this.hands[side].push(drawn);
    } else if (card.onPlay === 'heal-3') {
      const hero = this.heroes[side];
      hero.life = Math.min(MAX_LIFE, hero.life + 3);
      this.say(`${card.name} mends its hero for 3.`);
    }
  }

  findLane(creature) {
    for (let i = 0; i < LANES; i++) {
      if (this.boards[creature.owner][i].includes(creature)) return i;
    }
    return -1;
  }

  attackTargets(creature) {
    const foe = this.other(creature.owner);
    const lane = this.findLane(creature);
    const foes = this.boards[foe][lane];
    const guardians = foes.filter((c) => c.guardian);
    if (guardians.length) return guardians.map((c) => ({ kind: 'creature', creature: c }));
    if (foes.length) return foes.map((c) => ({ kind: 'creature', creature: c }));
    return [{ kind: 'hero', side: foe }];
  }

  attack(attacker, target) {
    if (this.phase !== 'play' || !attacker.ready) return false;
    attacker.ready = false;
    if (target.kind === 'hero') {
      this.heroes[target.side].life -= attacker.atk;
      this.say(`${attacker.card.name} strikes the enemy hero for ${attacker.atk}.`);
    } else {
      const defender = target.creature;
      defender.hp -= attacker.atk;
      attacker.hp -= defender.atk;
      this.say(`${attacker.card.name} trades with ${defender.card.name}.`);
      this.removeDead();
    }
    this.checkEnd();
    return true;
  }

  removeDead() {
    for (const side of ['player', 'ai']) {
      for (let lane = 0; lane < LANES; lane++) {
        const before = this.boards[side][lane].length;
        this.boards[side][lane] = this.boards[side][lane].filter((c) => c.alive);
        if (this.boards[side][lane].length < before) this.say('A creature falls.');
      }
    }
  }

  checkEnd() {
    if (this.phase !== 'play') return;
    const playerDead = this.heroes.player.life <= 0;
    const aiDead = this.heroes.ai.life <= 0;
    if (playerDead && aiDead) this.winner = 'draw';
    else if (aiDead) this.winner = 'player';
    else if (playerDead) this.winner = 'ai';
    if (this.winner) {
      this.phase = 'over';
      this.say(
        this.winner === 'player'
          ? 'Victory! The rival’s lantern goes out.'
          : this.winner === 'ai'
            ? 'Defeat. Your lantern goes out.'
            : 'Both lanterns go out — a draw.',
      );
    }
  }

  endTurn() {
    if (this.phase !== 'play' || this.active !== 'player' || this.aiBusy) return;
    this.active = 'ai';
    this.selectedCard = null;
    this.selectedAttacker = null;
    this.aiBusy = true;
    this.beginTurn('ai');
    runAiTurn(this, () => {
      this.aiBusy = false;
      if (this.phase !== 'play') {
        if (this.onAiStep) this.onAiStep();
        return;
      }
      this.active = 'player';
      this.turn += 1;
      this.beginTurn('player');
      if (this.onAiStep) this.onAiStep();
    });
  }
}
