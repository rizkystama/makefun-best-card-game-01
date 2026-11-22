// Lantern Lanes — the table. render(game) paints the whole visible state:
// heroes, hands, lanes, log and overlays. Cards slide in when dealt,
// creatures pop when summoned, and a blow lands with a shake.

import { CARD_MAP, FACTIONS } from './cards.js';
import { MAX_LIFE } from './engine.js';

const seenCreatures = new Set();
const lastHp = new Map();
let lastPlayerHandSize = 0;

function el(tag, cls, html = '') {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html) node.innerHTML = html;
  return node;
}

export function findCreature(game, uid) {
  for (const side of ['player', 'ai']) {
    for (const row of game.boards[side]) {
      const found = row.find((c) => c.uid === uid);
      if (found) return found;
    }
  }
  return null;
}

function factionMark(faction) {
  // Ember is a CSS triangle and Moss a CSS leaf; Tide's wave is a glyph.
  const glyph = faction === 'tide' ? FACTIONS.tide.glyph : '';
  return `<span class="mark mark-${faction}"><span class="shape shape-${faction}">${glyph}</span></span>`;
}

function cardFace(card, atk, hp) {
  const f = FACTIONS[card.faction];
  const buffed = atk > card.atk;
  const hurt = hp < card.hp;
  return `
    <div class="card-cost">${card.cost}</div>
    <div class="card-mark">${factionMark(card.faction)}</div>
    <div class="card-art" style="background:linear-gradient(135deg, ${f.color}, ${f.dark})">
      <span class="art-glyph">${f.glyph}</span>
    </div>
    <div class="card-name">${card.name}</div>
    <div class="card-text">${card.text || '&nbsp;'}</div>
    <div class="card-stats">
      <span class="stat atk${buffed ? ' buffed' : ''}">${atk}</span>
      <span class="stat hp${hurt ? ' hurt' : ''}">${hp}</span>
    </div>`;
}

function cardElement(cardId, options = {}) {
  const card = CARD_MAP.get(cardId);
  const node = el('div', `card faction-${card.faction}${options.extraClass ? ` ${options.extraClass}` : ''}`);
  if (options.handIndex !== undefined) node.dataset.handIndex = options.handIndex;
  node.innerHTML = cardFace(card, card.atk, card.hp);
  return node;
}

function creatureElement(creature, game, validTargets) {
  const node = el(
    'div',
    `card creature faction-${creature.faction} on-board${creature.owner === 'player' ? ' mine' : ' foe'}`,
  );
  node.dataset.uid = creature.uid;
  if (!seenCreatures.has(creature.uid)) {
    node.classList.add('summoned');
    seenCreatures.add(creature.uid);
  }
  const prevHp = lastHp.get(creature.uid);
  if (prevHp !== undefined && creature.hp < prevHp) node.classList.add('hit');
  lastHp.set(creature.uid, creature.hp);
  if (creature.owner === 'player' && creature.ready && game.active === 'player' && !game.aiBusy) {
    node.classList.add('ready');
  }
  if (game.selectedAttacker === creature.uid) node.classList.add('selected');
  if (validTargets.some((t) => t.kind === 'creature' && t.creature.uid === creature.uid)) {
    node.classList.add('targetable');
  }
  node.innerHTML = cardFace(creature.card, creature.atk, creature.hp);
  return node;
}

function renderHero(side, game) {
  const hero = game.heroes[side];
  const panel = document.getElementById(side === 'player' ? 'player-hero' : 'ai-hero');
  panel.querySelector('.life-num').textContent = hero.life;
  panel.querySelector('.life-bar-fill').style.width = `${Math.max(0, (hero.life / MAX_LIFE) * 100)}%`;
  panel.querySelector('.mana-num').textContent = `${hero.mana}/${hero.maxMana}`;
  const pips = panel.querySelector('.mana-pips');
  pips.innerHTML = '';
  for (let i = 0; i < hero.maxMana; i++) {
    pips.appendChild(el('span', `pip${i < hero.mana ? ' filled' : ''}`));
  }
  panel.querySelector('.deck-count').textContent = `Deck ${game.decks[side].length}`;
}

export function render(game) {
  const title = document.getElementById('title-screen');
  const table = document.getElementById('table');
  const overlay = document.getElementById('end-overlay');
  title.hidden = game.phase !== 'title';
  table.hidden = game.phase === 'title';
  overlay.hidden = game.phase !== 'over';
  if (game.phase === 'title') return;

  // The selected attacker's legal targets, for highlighting.
  let validTargets = [];
  if (game.selectedAttacker !== null) {
    const attacker = findCreature(game, game.selectedAttacker);
    if (attacker) validTargets = game.attackTargets(attacker);
  }

  renderHero('player', game);
  renderHero('ai', game);
  document
    .getElementById('ai-hero')
    .classList.toggle('targetable', validTargets.some((t) => t.kind === 'hero'));

  const aiHand = document.getElementById('ai-hand');
  aiHand.innerHTML = '';
  game.hands.ai.forEach(() => aiHand.appendChild(el('div', 'card-back')));

  const lanesEl = document.getElementById('lanes');
  lanesEl.innerHTML = '';
  for (let lane = 0; lane < game.boards.player.length; lane++) {
    const laneEl = el('div', 'lane');
    laneEl.dataset.lane = lane;
    if (game.selectedCard !== null && game.boards.player[lane].length < 4) {
      laneEl.classList.add('drop-target');
    }
    const aiRow = el('div', 'lane-row ai-row');
    game.boards.ai[lane].forEach((c) => aiRow.appendChild(creatureElement(c, game, validTargets)));
    const playerRow = el('div', 'lane-row player-row');
    game.boards.player[lane].forEach((c) => playerRow.appendChild(creatureElement(c, game, validTargets)));
    laneEl.appendChild(aiRow);
    laneEl.appendChild(el('div', 'lane-label', `LANE ${lane + 1}`));
    laneEl.appendChild(playerRow);
    lanesEl.appendChild(laneEl);
  }

  const hand = document.getElementById('player-hand');
  hand.innerHTML = '';
  game.hands.player.forEach((cardId, i) => {
    const node = cardElement(cardId, { handIndex: i, extraClass: 'hand-card' });
    if (game.canPlay('player', i)) node.classList.add('playable');
    if (game.selectedCard === i) node.classList.add('selected');
    if (i === game.hands.player.length - 1 && game.hands.player.length > lastPlayerHandSize) {
      node.classList.add('dealt');
    }
    hand.appendChild(node);
  });
  lastPlayerHandSize = game.hands.player.length;

  const hint = document.getElementById('hint');
  if (game.phase === 'over') {
    hint.textContent = '';
  } else if (game.aiBusy || game.active === 'ai') {
    hint.textContent = 'The rival is thinking…';
  } else if (game.selectedCard !== null) {
    hint.textContent = `Choose a lane for ${CARD_MAP.get(game.hands.player[game.selectedCard]).name}.`;
  } else if (game.selectedAttacker !== null) {
    hint.textContent = 'Choose a target in the same lane — or the hero, if the lane is clear.';
  } else {
    hint.textContent = 'Play a card, attack with a ready creature, or end your turn.';
  }

  document.getElementById('turn-label').textContent =
    `Turn ${game.turn} — ${game.active === 'player' ? 'Your move' : 'Rival’s move'}`;
  const endBtn = document.getElementById('end-turn');
  endBtn.disabled = game.phase !== 'play' || game.active !== 'player' || game.aiBusy;

  const logEl = document.getElementById('log');
  logEl.innerHTML = '';
  game.log.forEach((line) => logEl.appendChild(el('div', 'log-line', line)));

  if (game.phase === 'over') {
    const titleEl = document.getElementById('end-title');
    const subEl = document.getElementById('end-subtitle');
    overlay.classList.remove('win', 'loss', 'draw');
    if (game.winner === 'player') {
      titleEl.textContent = 'VICTORY';
      subEl.textContent = 'The rival’s lantern goes out. Yours burns on.';
      overlay.classList.add('win');
    } else if (game.winner === 'ai') {
      titleEl.textContent = 'DEFEAT';
      subEl.textContent = 'Your lantern goes out. Light it again.';
      overlay.classList.add('loss');
    } else {
      titleEl.textContent = 'DRAW';
      subEl.textContent = 'Both lanterns go out at once.';
      overlay.classList.add('draw');
    }
  }
}
