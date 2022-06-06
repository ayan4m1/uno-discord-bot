import { send, assign } from 'xstate';
import { sample, reverse, last, shuffle } from 'lodash-es';

import { CardColor, CardType, createContext } from '../modules/deck.js';

export default {
  resetGameState: assign(createContext()),
  resetLastDrawPlayer: assign({
    lastDrawPlayer: () => null
  }),
  shufflePlayers: assign({
    players: ({ players }) => shuffle(players)
  }),
  activateNextPlayer: assign({
    activePlayer: ({ players, activePlayer }) => {
      const currentIndex = players.indexOf(activePlayer);

      return players[
        currentIndex === players.length - 1 ? 0 : currentIndex + 1
      ];
    }
  }),
  addPlayer: assign({
    players: ({ players }, { id, username }) => [
      ...players,
      {
        id,
        username
      }
    ]
  }),
  removePlayer: assign({
    players: ({ players }, { id }) =>
      players.filter((player) => player.id !== id)
  }),
  dealHands: assign(({ deck, players }) => {
    const hands = {};

    const remainingDeck = [...shuffle(deck)];

    for (const player of players) {
      const hand = remainingDeck.splice(0, 7);

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
  changeColor: assign({
    color: (_, { color }) => color
  }),
  changeColorRandom: send(() => ({
    type: 'COLOR_CHANGE',
    color: sample(Object.values(CardColor))
  })),
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
          const newCards = deck.splice(0, 4);

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
          const newCards = deck.splice(0, 2);

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
  checkEmptyDeck: assign(({ deck, discardPile }) => {
    if (deck.length > 0) {
      return {};
    }

    return {
      deck: shuffle(discardPile),
      discardPile: []
    };
  })
};
