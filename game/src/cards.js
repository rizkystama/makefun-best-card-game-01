// Lantern Lanes — the twelve cards of the game.
//
// Every card belongs to one of three factions. A faction is told by colour
// AND by shape, never by text alone: Ember is red triangles, Tide is blue
// waves, Moss is green leaves.
//
// The shared rule that binds a faction is Kindred: when you play a
// creature, your other creatures of the same faction gain +1 attack.

export const FACTIONS = {
  ember: { key: 'ember', name: 'Ember', color: '#e2483d', dark: '#8f1d16', glyph: '▲' },
  tide: { key: 'tide', name: 'Tide', color: '#3d8be2', dark: '#174a86', glyph: '≈' },
  moss: { key: 'moss', name: 'Moss', color: '#3da35d', dark: '#1c5c31', glyph: '❧' },
};

// onPlay tags the engine interprets when the card enters play:
//   'damage-hero-1' — deal 1 damage to the enemy hero
//   'draw-1'        — draw a card
//   'heal-3'        — restore 3 life to your hero
// swift   — the creature can attack the turn it is played
// guardian — enemies in this lane must attack this creature first
export const CARDS = [
  { id: 'ember-imp', name: 'Ember Imp', faction: 'ember', cost: 1, atk: 2, hp: 1, text: 'Swift.', swift: true },
  { id: 'cinder-fox', name: 'Cinder Fox', faction: 'ember', cost: 2, atk: 3, hp: 2, text: '' },
  { id: 'flame-herald', name: 'Flame Herald', faction: 'ember', cost: 3, atk: 4, hp: 3, text: 'Deal 1 damage to the enemy hero.', onPlay: 'damage-hero-1' },
  { id: 'pyre-drake', name: 'Pyre Drake', faction: 'ember', cost: 5, atk: 6, hp: 5, text: '' },
  { id: 'tide-sprite', name: 'Tide Sprite', faction: 'tide', cost: 1, atk: 1, hp: 2, text: '' },
  { id: 'coral-guard', name: 'Coral Guard', faction: 'tide', cost: 2, atk: 2, hp: 4, text: 'Guardian.', guardian: true },
  { id: 'wave-singer', name: 'Wave Singer', faction: 'tide', cost: 3, atk: 3, hp: 3, text: 'Draw a card.', onPlay: 'draw-1' },
  { id: 'leviathan', name: 'Leviathan', faction: 'tide', cost: 6, atk: 7, hp: 7, text: '' },
  { id: 'moss-sprout', name: 'Moss Sprout', faction: 'moss', cost: 1, atk: 1, hp: 3, text: '' },
  { id: 'thorn-wolf', name: 'Thorn Wolf', faction: 'moss', cost: 2, atk: 3, hp: 2, text: 'Swift.', swift: true },
  { id: 'grove-warden', name: 'Grove Warden', faction: 'moss', cost: 4, atk: 4, hp: 5, text: 'Restore 3 life to your hero.', onPlay: 'heal-3' },
  { id: 'ancient-oak', name: 'Ancient Oak', faction: 'moss', cost: 5, atk: 5, hp: 6, text: 'Guardian.', guardian: true },
];

export const CARD_MAP = new Map(CARDS.map((card) => [card.id, card]));
