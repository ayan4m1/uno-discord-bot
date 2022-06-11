import { createMachine, interpret, send } from 'xstate';

import actions from '../actions/index.js';
import guards from '../guards/index.js';
import services from '../services/index.js';
import { uno as config } from './config.js';
import { getLogger } from './logging.js';
import { createContext } from './deck.js';

const log = getLogger('game');

const createGame = () =>
  createMachine(
    {
      id: 'uno',
      initial: 'idle',
      context: createContext(),
      on: {
        GAME_STOP: {
          target: 'idle',
          actions: 'notifyGameStop'
        },
        GAME_STATUS: {
          actions: 'notifyGameStatus'
        },
        PLAYER_PASS: {
          actions: 'notifyInvalidPass'
        },
        HAND_REQUEST: {
          actions: 'notifyHand',
          cond: 'isGameActive'
        },
        LEADERBOARD_REQUEST: {
          actions: 'notifyLeaderboard'
        },
        COLOR_CHANGE: {
          actions: 'notifyInvalidColorChange'
        }
      },
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
                target: 'createGame',
                cond: 'canGameStart'
              },
              {
                target: 'notifyNoPlayers'
              }
            ]
          },
          on: {
            PLAYER_ADD: [
              { actions: 'notifyInGame', cond: 'isPlayerInGame' },
              { actions: ['addPlayer', 'notifyAddPlayer'] }
            ],
            PLAYER_REMOVE: [
              { actions: 'notifyNotInGame', cond: 'isPlayerNotInGame' },
              { actions: ['removePlayer', 'notifyRemovePlayer'] }
            ]
          }
        },
        createGame: {
          invoke: {
            src: 'createGame',
            onDone: {
              target: 'startGame',
              actions: 'assignGameId'
            }
          }
        },
        startGame: {
          entry: ['shufflePlayers', 'dealHands', 'notifyAllHands'],
          always: [{ target: 'startRound' }]
        },
        startRound: {
          entry: [
            'activateNextPlayer',
            'resetLastDrawPlayer',
            'checkEmptyDeck'
          ],
          invoke: {
            src: 'notifyRoundStart',
            onDone: 'round'
          }
        },
        round: {
          entry: ['notifyActivePlayerHand'],
          on: {
            GAME_END: {
              target: 'stopGame'
            },
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
                target: '.playCard'
              }
            ],
            CARD_DRAW: [
              {
                actions: 'notifyInvalidPlayer',
                cond: 'isPlayerInvalid'
              },
              {
                target: '.drawCard'
              }
            ],
            PLAYER_ADD: {
              actions: 'notifyInvalidAdd'
            },
            PLAYER_REMOVE: {
              actions: 'notifyInvalidRemove'
            },
            PLAYER_PASS: {
              actions: 'notifyInvalidPass'
            },
            HAND_REQUEST: {
              actions: 'notifyHand'
            }
          },
          initial: 'idle',
          states: {
            idle: {
              after: {
                [config.roundDelay]: {
                  target: 'notifySkip'
                }
              }
            },
            notifySkip: {
              invoke: {
                src: 'notifySkip',
                onDone: 'done'
              }
            },
            drawCard: {
              entry: ['drawCard', 'notifyDraw', 'notifyActivePlayerHand'],
              after: {
                [config.roundDelay]: {
                  target: 'notifySkip'
                }
              },
              on: {
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
                    target: 'notifyPass'
                  }
                ],
                CARD_DRAW: [{ actions: 'notifyInvalidDraw' }]
              }
            },
            playCard: {
              entry: ['playCard'],
              invoke: {
                src: 'notifyPlay',
                onDone: 'checkWinner'
              }
            },
            checkWinner: {
              always: [
                { target: 'notifyWinner', cond: 'isGameOver' },
                { target: 'checkUno' }
              ]
            },
            notifyWinner: {
              invoke: {
                src: 'notifyWinner',
                onDone: 'updateScores'
              }
            },
            updateScores: {
              invoke: {
                src: 'updateScores',
                onDone: {
                  actions: send('GAME_END')
                }
              }
            },
            checkUno: {
              always: [
                { target: 'notifyUno', cond: 'playerHasUno' },
                { target: 'checkColor' }
              ]
            },
            notifyUno: {
              invoke: {
                src: 'notifyUno',
                onDone: 'checkColor'
              }
            },
            checkColor: {
              always: [
                {
                  target: 'changeColorNeeded',
                  cond: 'isColorChangeNeeded'
                },
                { target: 'checkSpecial' }
              ]
            },
            changeColorNeeded: {
              invoke: {
                src: 'notifyColorChangeNeeded',
                onDone: 'changeColor'
              }
            },
            changeColor: {
              after: {
                [config.roundDelay]: {
                  target: 'checkSpecial',
                  actions: ['changeColorRandom']
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
                    target: 'notifyChangeColor',
                    actions: 'changeColor'
                  }
                ]
              }
            },
            notifyChangeColor: {
              invoke: {
                src: 'notifyColorChange',
                onDone: 'checkSpecial'
              }
            },
            checkSpecial: {
              always: [
                { target: 'specialCard', cond: 'isSpecialCardPlayed' },
                { target: 'done' }
              ]
            },
            specialCard: {
              entry: 'handleSpecialCard',
              always: [{ target: 'done' }]
            },
            notifyPass: {
              invoke: {
                src: 'notifyPass',
                onDone: 'done'
              }
            },
            done: { type: 'final' }
          },
          onDone: 'startRound'
        },
        notifyNoPlayers: {
          invoke: {
            src: 'notifyNoPlayers',
            onDone: 'idle'
          }
        },
        stopGame: {
          invoke: {
            src: 'stopGame',
            onDone: 'idle'
          }
        }
      }
    },
    {
      actions,
      guards,
      services
    }
  );

export const service = interpret(createGame()).onTransition((state) => {
  log.debug(
    JSON.stringify(state.context, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
});
