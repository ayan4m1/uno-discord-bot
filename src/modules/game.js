import { createMachine } from 'xstate';
import { last, negate } from 'lodash';

import actions from 'actions';
import { CardColor, CardType, createDeck } from 'modules/deck';
import { uno as config } from 'modules/config';

const createContext = () => ({
  deck: createDeck(),
  color: null,
  discardPile: [],
  hands: {},
  players: [],
  activePlayer: null,
  lastDrawPlayer: null
});

const toIdleAfterEnd = {
  after: {
    [config.endDelay]: {
      target: 'idle'
    }
  }
};

const onStop = {
  GAME_STOP: {
    target: 'idle',
    actions: 'notifyGameStop'
  }
};

export const createGame = () =>
  createMachine(
    {
      id: 'uno',
      initial: 'idle',
      context: createContext(),
      states: {
        idle: {
          entry: 'resetGameState',
          on: {
            GAME_START: {
              target: 'solicitPlayers'
            }
          }
        },
        solicitPlayers: {
          entry: 'notifySolicit',
          after: {
            [config.solicitDelay]: [
              {
                target: 'startGame',
                cond: 'canGameStart'
              },
              {
                target: 'noPlayers'
              }
            ]
          },
          on: {
            PLAYER_ADD: {
              actions: ['addPlayer', 'notifyAddPlayer']
            },
            PLAYER_REMOVE: {
              actions: ['removePlayer', 'notifyRemovePlayer']
            },
            ...onStop
          }
        },
        startGame: {
          entry: ['notifyGameStart', 'dealHands', 'notifyAllHands'],
          always: { target: 'startRound' }
        },
        startRound: {
          entry: ['activateNextPlayer', 'resetLastDrawPlayer'],
          always: [
            { target: 'announceWinner', cond: 'isGameOver' },
            { target: 'round' }
          ]
        },
        round: {
          entry: ['notifyActivePlayerHand', 'notifyRoundStart'],
          on: {
            CARD_PLAY: [
              {
                actions: 'notifyInvalidPlayer',
                cond: 'isPlayerInvalid'
              },
              {
                actions: 'notifyMissingCard',
                cond: 'isCardMissing'
              },
              {
                actions: 'notifyInvalidCard',
                cond: 'isCardInvalid'
              },
              {
                target: '.changeColor',
                actions: ['notifyPlay', 'playCard'],
                cond: 'isColorChangeNeeded'
              },
              {
                target: '.specialCard',
                actions: ['notifyPlay', 'playCard'],
                cond: 'isSpecialCardPlayed'
              },
              {
                target: '.playCard'
              }
            ],
            CARD_DRAW: [
              {
                actions: 'notifyInvalidPlayer',
                cond: 'isPlayerInvalid'
              },
              {
                actions: ['notifyDraw', 'drawCard', 'sendActivePlayerHand']
              }
            ],
            PLAYER_PASS: [
              {
                actions: 'notifyInvalidPlayer',
                cond: 'isPlayerInvalid'
              },
              {
                actions: 'notifyInvalidPass',
                cond: 'isPassInvalid'
              },
              {
                target: '.pass'
              }
            ],
            HAND_REQUEST: {
              actions: 'notifyHand'
            },
            ...onStop
          },
          initial: 'waiting',
          states: {
            waiting: {
              after: {
                [config.roundDelay]: {
                  target: 'done',
                  actions: 'notifySkipPlayer'
                }
              }
            },
            changeColor: {
              entry: 'notifyColorChangeNeeded',
              exit: 'notifyColorChange',
              after: {
                [config.roundDelay]: {
                  target: 'done',
                  actions: ['notifySkipPlayer', 'changeColorRandom']
                }
              },
              on: {
                COLOR_CHANGE: [
                  {
                    actions: 'notifyInvalidPlayer',
                    cond: 'isPlayerInvalid'
                  },
                  {
                    actions: 'notifyInvalidColor',
                    cond: 'isColorInvalid'
                  },
                  {
                    target: 'done',
                    actions: 'changeColor'
                  }
                ]
              }
            },
            specialCard: {
              entry: 'handleSpecialCard',
              always: { target: 'done' }
            },
            playCard: {
              entry: ['notifyPlay', 'playCard'],
              always: { target: 'done' }
            },
            pass: {
              entry: 'notifyPass',
              always: { target: 'done' }
            },
            done: { type: 'final' }
          },
          onDone: 'startRound'
        },
        announceWinner: {
          entry: 'notifyWinner',
          ...toIdleAfterEnd
        },
        noPlayers: {
          entry: 'notifyNoPlayers',
          ...toIdleAfterEnd
        },
        stopGame: {
          ...toIdleAfterEnd
        }
      }
    },
    {
      actions,
      guards: {
        canGameStart: ({ players }) => players.length > 0,
        isGameOver: ({ hands }) =>
          Object.values(hands).some((hand) => hand.length === 0),
        isPlayerInvalid: negate(
          ({ activePlayer }, { id }) => activePlayer.id === id
        ),
        isCardMissing: negate(({ activePlayer, hands }, { card }) => {
          const hand = hands[activePlayer.id];

          return hand.some((handCard) => handCard.equals(card));
        }),
        isCardInvalid: negate(({ color, discardPile }, { card }) => {
          const discard = last(discardPile);

          switch (discard.type) {
            case CardType.WILD:
            case CardType.WILD_DRAW:
              return card.color === color;
            default:
              return discard.validPlay(card);
          }
        }),
        isColorInvalid: negate((_, { color }) =>
          Boolean(CardColor.fromString(color))
        ),
        isColorChangeNeeded: (_, { card }) =>
          [CardType.WILD_DRAW, CardType.WILD].includes(card.type),
        isPassInvalid: negate(
          ({ activePlayer, lastDrawPlayer }) =>
            activePlayer.id === lastDrawPlayer?.id
        ),
        isSpecialCardPlayed: (_, { card }) =>
          [
            CardType.WILD_DRAW,
            CardType.WILD,
            CardType.DRAW,
            CardType.SKIP,
            CardType.REVERSE
          ].includes(card.type)
      }
    }
  );
