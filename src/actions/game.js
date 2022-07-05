import { send, assign } from 'xstate';
import { sample, reverse, last, shuffle } from 'lodash-es';

import {
  CardColor,
  CardType,
  createContext,
  DrawSize,
  HandSize,
  WildDrawSize
} from '../modules/deck.js';

export default {
  /**
   * Take the gameId from the database result and set it in the context
   */
  assignGameId: assign({
    gameId: (_, { data }) => data
  }),
  /**
   * Create a brand new context
   */
  resetGameState: assign(createContext()),
  /**
   * Set lastDrawPlayer to null
   */
  resetLastDrawPlayer: assign({
    lastDrawPlayer: () => null
  }),
  /**
   * Shuffle all players
   */
  shufflePlayers: assign({
    players: ({ players }) => shuffle(players)
  }),
  /**
   * Advance to the next player
   */
  activateNextPlayer: assign({
    activePlayer: ({ players, activePlayer }) => {
      const currentIndex = players.indexOf(activePlayer);

      return players[
        currentIndex === players.length - 1 ? 0 : currentIndex + 1
      ];
    }
  }),
  /**
   * Add a new player to the pending game
   */
  addPlayer: assign({
    players: ({ players }, { id, username }) => [
      ...players,
      {
        id,
        username
      }
    ]
  }),
  /**
   * Remove an existing player from a pending game
   */
  removePlayer: assign({
    players: ({ players }, { id }) =>
      players.filter((player) => player.id !== id)
  }),
  /**
   * Remove an existing player from an active game
   */
  removePlayerMidgame: assign(({ discardPile, players, hands }, { id }) => {
    const newDiscard = [...discardPile];
    const newHands = { ...hands };

    newDiscard.push.apply(newDiscard, newHands[id]);
    delete newHands[id];

    return {
      discardPile: newDiscard,
      hands: newHands,
      players: players.filter((player) => player.id !== id)
    };
  }),
  /**
   * Deal out hands and set up discardPile
   */
  dealHands: assign(({ deck, players }) => {
    const hands = {};

    const remainingDeck = [...shuffle(deck)];

    for (const player of players) {
      const hand = remainingDeck.splice(0, HandSize);

      hands[player.id] = hand;
    }

    const discardPile = remainingDeck.splice(0, 1);

    let color;

    switch (discardPile[0].type) {
      case CardType.WILD:
      case CardType.WILD_DRAW:
        color = sample(Object.values(CardColor));
        break;
      default:
        color = null;
        break;
    }

    return {
      color,
      deck: remainingDeck,
      hands,
      discardPile
    };
  }),
  /**
   * Remove a card from the active player's hand and add it to the discard pile
   */
  playCard: assign(({ discardPile, hands, activePlayer }, { card }) => {
    const hand = [...hands[activePlayer.id]];

    hand.splice(
      hand.findIndex((handCard) => handCard.equals(card)),
      1
    );

    return {
      hands: {
        ...hands,
        [activePlayer.id]: hand
      },
      discardPile: [...discardPile, card]
    };
  }),
  /**
   * Deal a card from the deck to the active player's hand
   */
  drawCard: assign(({ activePlayer, hands, deck }) => {
    const [newCard] = deck.splice(0, 1);
    const hand = [...hands[activePlayer.id], newCard];

    return {
      hands: {
        ...hands,
        [activePlayer.id]: hand
      },
      deck,
      lastDrawPlayer: activePlayer
    };
  }),
  /**
   * Change the active color for wilds
   */
  changeColor: assign({
    color: (_, { color }) => color
  }),
  /**
   * Pick a random color for wilds
   */
  changeColorRandom: send(() => ({
    type: 'PLAYER_CHANGE_COLOR',
    color: sample(Object.values(CardColor))
  })),
  /**
   * Handle special (i.e. non-numeric) card effects
   */
  handleSpecialCard: assign(
    ({ activePlayer, players, deck, hands, discardPile }) => {
      const discard = last(discardPile);
      const activePlayerIndex = players.indexOf(activePlayer);
      const nextPlayer =
        players[
          activePlayerIndex === players.length - 1 ? 0 : activePlayerIndex + 1
        ];
      const nextPlayerHand = hands[nextPlayer.id];

      switch (discard.type) {
        case CardType.WILD_DRAW: {
          const newCards = deck.splice(0, WildDrawSize);

          return {
            hands: {
              ...hands,
              [nextPlayer.id]: [...nextPlayerHand, ...newCards]
            },
            activePlayer: nextPlayer,
            deck
          };
        }
        case CardType.DRAW: {
          const newCards = deck.splice(0, DrawSize);

          return {
            hands: {
              ...hands,
              [nextPlayer.id]: [...nextPlayerHand, ...newCards]
            },
            activePlayer: nextPlayer,
            deck
          };
        }
        case CardType.SKIP: {
          return {
            activePlayer: nextPlayer
          };
        }
        case CardType.REVERSE: {
          // handles special rule for two-player games
          if (players.length === 2) {
            return {
              players: reverse(players),
              activePlayer: nextPlayer
            };
          } else {
            return {
              players: reverse(players)
            };
          }
        }
        default:
          return {};
      }
    }
  ),
  /**
   * Shuffle the discardPile into the deck
   */
  rebuildDeck: assign(({ deck, discardPile }) => {
    if (deck.length > 0) {
      return {};
    }

    return {
      deck: shuffle(discardPile),
      discardPile: []
    };
  })
};
