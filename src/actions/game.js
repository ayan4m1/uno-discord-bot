import { send, assign } from 'xstate';
import { sampleSize, without, sample, reverse, last } from 'lodash';

import { sendMessage } from 'modules/discord';
import { CardColor, CardType, createDeck } from 'modules/deck';

export default {
  resetGameState: assign({
    deck: createDeck(),
    color: null,
    discardPile: [],
    hands: {},
    players: [],
    activePlayer: null,
    lastDrawPlayer: null
  }),
  resetLastDrawPlayer: assign({
    lastDrawPlayer: null
  }),
  activateNextPlayer: assign({
    activePlayer: ({ players, activePlayer }) => {
      const currentIndex = players.indexOf(activePlayer);

      if (currentIndex === players.length - 1) {
        return players[0];
      } else {
        return players[currentIndex + 1];
      }
    }
  }),
  addPlayer: assign({
    players: ({ players }, event) => [
      ...players,
      {
        id: event.id,
        username: event.username
      }
    ]
  }),
  removePlayer: assign({
    players: ({ players }, event) =>
      players.filter((player) => player.id !== event.id)
  }),
  dealHands: assign(({ deck, players }) => {
    const hands = {};

    let remainingDeck = [...deck];

    for (const player of players) {
      const hand = sampleSize(deck, 7);

      hands[player.id] = hand;
      remainingDeck = without(remainingDeck, ...hand);
    }

    const discardPile = sampleSize(remainingDeck);

    remainingDeck = without(remainingDeck, discardPile[0]);

    return {
      deck: remainingDeck,
      hands,
      discardPile
    };
  }),
  playCard: assign(({ discardPile, hands, activePlayer }, { card }) => {
    const hand = hands[activePlayer.id].filter(
      (handCard) => !handCard.equals(card)
    );

    if (hand.length === 1) {
      sendMessage(`${activePlayer.username} has UNO!`);
    }

    return {
      hands: {
        ...hands,
        [activePlayer.id]: hand
      },
      discardPile: [...discardPile, card]
    };
  }),
  drawCard: assign(({ activePlayer, hands, deck }) => {
    const newCard = sample(deck);
    const hand = [...hands[activePlayer.id], newCard];

    return {
      hands: {
        ...hands,
        [activePlayer.id]: hand
      },
      deck: without(deck, newCard),
      lastDrawPlayer: activePlayer
    };
  }),
  changeColor: assign({
    color: (_, { color }) => CardColor.fromString(color)
  }),
  changeColorRandom: send(() => ({
    type: 'COLOR_CHANGE',
    color: sample(['R', 'G', 'B', 'Y'])
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
          const newCards = sampleSize(deck, 4);

          return {
            hands: {
              ...hands,
              [nextPlayer.id]: [...nextPlayerHand, ...newCards]
            },
            activePlayer: nextPlayer,
            deck: without(deck, ...newCards)
          };
        }
        case CardType.DRAW: {
          const newCards = sampleSize(deck, 2);

          return {
            hands: {
              ...hands,
              [nextPlayer.id]: [...nextPlayerHand, ...newCards]
            },
            activePlayer: nextPlayer,
            deck: without(deck, ...newCards)
          };
        }
        case CardType.SKIP: {
          return {
            activePlayer: nextPlayer
          };
        }
        case CardType.REVERSE: {
          return {
            players: reverse(players)
          };
        }
        default:
          return {};
      }
    }
  )
};
