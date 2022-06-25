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
          actions: 'notifyGameStop',
          target: 'idle'
        },
        GAME_STATUS: {
          actions: 'notifyGameStatus'
        },
        PLAYER_ADD: {
          actions: 'notifyInvalidAdd'
        },
        PLAYER_REMOVE: {
          actions: 'notifyInvalidRemove'
        },
        PLAYER_PASS: {
          actions: 'notifyInvalidPass'
        },
        PLAYER_CHANGE_COLOR: {
          actions: 'notifyInvalidColorChange'
        },
        CARD_PLAY: {
          actions: 'notifyInvalidPlay'
        },
        PLAYER_DRAW: {
          actions: 'notifyInvalidDraw'
        },
        HAND_REQUEST: [
          {
            actions: 'notifyHand',
            cond: 'isGameActive'
          },
          { actions: 'notifyInactiveGame' }
        ],
        LEADERBOARD_REQUEST: {
          actions: 'notifyLeaderboard'
        },
        HELP_REQUEST: {
          actions: 'notifyHelp'
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
          entry: [
            'shufflePlayers',
            'activateNextPlayer',
            'dealHands',
            'notifyAllHands'
          ],
          always: [{ target: 'startRound' }]
        },
        startRound: {
          entry: ['resetLastDrawPlayer'],
          invoke: {
            src: 'notifyRoundStart',
            onDone: 'round'
          }
        },
        round: {
          entry: ['notifyActivePlayerHand'],
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
                target: '.playCard'
              }
            ],
            PLAYER_DRAW: [
              {
                actions: 'notifyInvalidPlayer',
                cond: 'isPlayerInvalid'
              },
              {
                target: '.drawCard'
              }
            ],
            PLAYER_REMOVE: [
              { actions: 'notifyNotInGame', cond: 'isPlayerNotInGame' },
              {
                target: '.removePlayer'
              }
            ],
            PLAYER_PASS: {
              actions: 'notifyInvalidPass'
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
                onDone: 'finishRound'
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
                PLAYER_DRAW: [{ actions: 'notifyDuplicateDraw' }]
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
                  actions: send('GAME_STOP')
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
                  target: 'notifyColorChangeNeeded',
                  cond: 'isColorChangeNeeded'
                },
                { target: 'checkSpecial' }
              ]
            },
            notifyColorChangeNeeded: {
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
                PLAYER_CHANGE_COLOR: [
                  {
                    actions: 'notifyInvalidPlayer',
                    cond: 'isPlayerInvalid'
                  },
                  {
                    actions: 'notifyInvalidColor',
                    cond: 'isColorInvalid'
                  },
                  {
                    target: 'notifyColorChange',
                    actions: 'changeColor'
                  }
                ]
              }
            },
            notifyColorChange: {
              invoke: {
                src: 'notifyColorChange',
                onDone: 'checkSpecial'
              }
            },
            checkSpecial: {
              always: [
                { target: 'specialCard', cond: 'isSpecialCardPlayed' },
                { target: 'finishRound' }
              ]
            },
            specialCard: {
              entry: 'handleSpecialCard',
              always: [{ target: 'finishRound' }]
            },
            notifyPass: {
              invoke: {
                src: 'notifyPass',
                onDone: 'finishRound'
              }
            },
            removePlayer: {
              entry: ['notifyRemovePlayer', 'removePlayerMidgame'],
              always: [
                {
                  actions: send('GAME_STOP'),
                  target: 'idle',
                  cond: 'isOnePlayerGame'
                },
                { target: 'finishRound', cond: 'isPlayerActive' },
                { target: 'idle' }
              ]
            },
            finishRound: {
              exit: ['activateNextPlayer', 'resetLastDrawPlayer'],
              always: [
                { actions: 'rebuildDeck', cond: 'isDeckEmpty' },
                { target: 'done' }
              ]
            },
            done: {
              type: 'final'
            }
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
