import { createMachine } from 'xstate';

import actions from '../actions/index.js';
import guards from '../guards/index.js';
import services from '../services/index.js';
import { uno as config } from './config.js';
import { createContext } from './deck.js';

export const createGame = () =>
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
            }
          }
        },
        startGame: {
          entry: ['dealHands'],
          always: [{ target: 'startRound' }]
        },
        startRound: {
          entry: ['activateNextPlayer', 'resetLastDrawPlayer'],
          always: [
            { target: 'announceWinner', cond: 'isGameOver' },
            { target: 'notifyRound' }
          ]
        },
        notifyRound: {
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
            CARD_DRAW: [
              {
                actions: 'notifyInvalidPlayer',
                cond: 'isPlayerInvalid'
              },
              {
                target: '.drawCard'
              }
            ],
            HAND_REQUEST: {
              actions: 'notifyHand'
            }
          },
          initial: 'idle',
          states: {
            idle: {
              after: {
                [config.roundDelay]: {
                  target: 'done',
                  actions: 'notifySkipPlayer'
                }
              }
            },
            drawCard: {
              entry: ['drawCard', 'notifyDraw', 'notifyActivePlayerHand'],
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
                    target: 'pass'
                  }
                ]
              }
            },
            playCard: {
              entry: ['playCard'],
              invoke: {
                src: 'notifyPlay',
                onDone: 'checkUno'
              }
            },
            checkUno: {
              always: [
                { target: 'uno', cond: 'playerHasUno' },
                { target: 'checkSpecial' }
              ]
            },
            uno: {
              invoke: {
                src: 'notifyUno',
                onDone: 'checkSpecial'
              }
            },
            checkSpecial: {
              always: [
                { target: 'specialCard', cond: 'isSpecialCardPlayed' },
                { target: 'checkColor' }
              ]
            },
            specialCard: {
              entry: 'handleSpecialCard',
              always: [{ target: 'checkColor' }]
            },
            checkColor: {
              always: [
                { target: 'changeColor', cond: 'isColorChangeNeeded' },
                { target: 'done' }
              ]
            },
            notifyChangeColor: {
              invoke: {
                src: 'notifyColorChangeNeeded',
                onDone: 'changeColor'
              }
            },
            changeColor: {
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
            pass: {
              entry: 'notifyPass',
              always: { target: 'done' }
            },
            done: { type: 'final' }
          },
          onDone: 'startRound'
        },
        announceWinner: {
          invoke: {
            src: 'notifyWinner',
            onDone: 'idle'
          }
        },
        noPlayers: {
          invoke: {
            src: 'notifyNoPlayers',
            onDone: 'idle'
          }
        },
        stopGame: {
          after: {
            [config.endDelay]: {
              target: 'idle'
            }
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
