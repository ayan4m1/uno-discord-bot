import { assign, raise } from 'xstate';
import type { ActionFunctionMap, DoneInvokeEvent } from 'xstate';
import { sample, last, shuffle } from 'lodash-es';

import {
  CardColor,
  CardType,
  createContext,
  scoreHand,
  DrawSize,
  HandSize,
  WildDrawSize
} from '../modules/deck.js';
import { createScore } from '../modules/database.js';
import type { GameContext, GameEvent } from '../types.js';

/**
 * Returns the player after the supplied one, wrapping around to the start.
 */
const getNextPlayer = (
  { players }: GameContext,
  player?: GameContext['activePlayer']
) => {
  const currentIndex = player ? players.indexOf(player) : -1;

  return players[currentIndex === players.length - 1 ? 0 : currentIndex + 1];
};

export default {
  /**
   * Take the gameId from the database result and set it in the context
   */
  assignGameId: assign<GameContext, GameEvent>({
    gameId: (_, event) => (event as DoneInvokeEvent<bigint | undefined>).data
  }),
  /**
   * Create a brand new context
   */
  resetGameState: assign<GameContext, GameEvent>(() => createContext()),
  /**
   * Set lastDrawPlayer to undefined
   */
  resetLastDrawPlayer: assign<GameContext, GameEvent>({
    lastDrawPlayer: () => undefined
  }),
  /**
   * Shuffle all players
   */
  shufflePlayers: assign<GameContext, GameEvent>({
    players: ({ players }) => shuffle(players)
  }),
  /**
   * Advance to the next player, or the first player if nobody is active yet
   */
  activateNextPlayer: assign<GameContext, GameEvent>({
    activePlayer: (context) => getNextPlayer(context, context.activePlayer)
  }),
  /**
   * Add a new player to the pending game
   */
  addPlayer: assign<GameContext, GameEvent>({
    players: ({ players }, { id, username }) =>
      id && username ? [...players, { id, username }] : players
  }),
  /**
   * Remove an existing player from a pending game
   */
  removePlayer: assign<GameContext, GameEvent>({
    players: ({ players }, { id }) =>
      players.filter((player) => player.id !== id)
  }),
  /**
   * Remove an existing player from an active game
   */
  removePlayerMidgame: assign<GameContext, GameEvent>(
    ({ gameId, discardPile, players, hands }, { id }) => {
      if (!id) {
        return {};
      }

      const hand = hands[id] ?? [];
      const newHands = { ...hands };

      delete newHands[id];

      if (gameId) {
        createScore(gameId, { id }, scoreHand(hand));
      }

      return {
        discardPile: [...discardPile, ...hand],
        hands: newHands,
        players: players.filter((player) => player.id !== id)
      };
    }
  ),
  /**
   * Deal out hands and set up discardPile
   */
  dealHands: assign<GameContext, GameEvent>(({ deck, players }) => {
    const hands: GameContext['hands'] = {};

    const remainingDeck = [...shuffle(deck)];

    for (const player of players) {
      hands[player.id] = remainingDeck.splice(0, HandSize);
    }

    const discardPile = remainingDeck.splice(0, 1);

    let color: CardColor | undefined;

    switch (discardPile[0]?.type) {
      case CardType.WILD:
      case CardType.WILD_DRAW:
        color = sample(Object.values(CardColor));
        break;
      default:
        color = undefined;
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
  playCard: assign<GameContext, GameEvent>(
    ({ discardPile, hands, activePlayer }, { card }) => {
      if (!activePlayer || !card) {
        return {};
      }

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
    }
  ),
  /**
   * Deal a card from the deck to the active player's hand
   */
  drawCard: assign<GameContext, GameEvent>(({ activePlayer, hands, deck }) => {
    if (!activePlayer) {
      return {};
    }

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
  changeColor: assign<GameContext, GameEvent>({
    color: (_, { color }) => color
  }),
  /**
   * Pick a random color for wilds
   */
  changeColorRandom: raise<GameContext, GameEvent>(() => ({
    type: 'PLAYER_CHANGE_COLOR',
    color: sample(Object.values(CardColor))
  })),
  /**
   * Handle special (i.e. non-numeric) card effects
   */
  handleSpecialCard: assign<GameContext, GameEvent>((context) => {
    const { activePlayer, players, deck, hands, discardPile } = context;
    const discard = last(discardPile);
    const nextPlayer = getNextPlayer(context, activePlayer);
    const nextPlayerHand = hands[nextPlayer.id];

    switch (discard?.type) {
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
        const reversed = [...players].reverse();

        // handles special rule for two-player games
        if (players.length === 2) {
          return {
            players: reversed,
            activePlayer: nextPlayer
          };
        } else {
          return {
            players: reversed
          };
        }
      }
      default:
        return {};
    }
  }),
  /**
   * Shuffle the discardPile into the deck
   */
  rebuildDeck: assign<GameContext, GameEvent>(({ deck, discardPile }) => {
    if (deck.length > 0) {
      return {};
    }

    return {
      deck: shuffle(discardPile),
      discardPile: []
    };
  })
} satisfies ActionFunctionMap<GameContext, GameEvent>;
