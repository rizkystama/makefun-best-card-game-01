// Lantern Lanes — decks. Each side plays the same 24-card deck:
// two copies of each of the twelve cards, shuffled, three drawn to open.

import { CARDS } from './cards.js';

export const COPIES_PER_CARD = 2;
export const STARTING_HAND = 3;

export function buildDeck() {
  const deck = [];
  for (const card of CARDS) {
    for (let i = 0; i < COPIES_PER_CARD; i++) deck.push(card.id);
  }
  return deck;
}

export function shuffle(deck, rng) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawFrom(deck) {
  return deck.length ? deck.pop() : null;
}
