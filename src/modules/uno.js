import { MessageEmbed } from 'discord.js';
import { createMachine, assign } from 'xstate';
import { shuffle, sampleSize, without, sample } from 'lodash';

import {
  getNotificationChannel,
  getPrivateMessageChannel
} from 'modules/discord';
import { createDeck } from './deck';

const sendMessage = (message) => {
  const channel = getNotificationChannel();

  return channel.send(message);
};

const sendPrivateMessage = async (userId, message) => {
  const channel = await getPrivateMessageChannel(userId);

  return channel.send(message);
};

const createContext = () => ({
  deck: createDeck(),
  discardPile: [],
  hands: {},
  players: [],
  activePlayer: null
});

export const createGame = (
  options = {
    solicitDelay: 60000,
    endDelay: 20000
  }
) =>
  createMachine(
    {
      id: 'uno',
      initial: 'idle',
      context: createContext(),
      states: {
        idle: {
          entry: 'resetGameState',
          on: {
            START: {
              target: 'solicitPlayers'
            }
          }
        },
        solicitPlayers: {
          entry: 'sendSolicitMessage',
          after: {
            [options.solicitDelay]: [
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
            STOP: {
              target: 'idle',
              actions: 'sendStopMessage'
            }
          }
        },
        startGame: {
          entry: ['sendGameStartMessage', 'shuffleDeck', 'dealHands'],
          always: [{ target: 'startRound' }]
        },
        startRound: {
          entry: ['activateNextPlayer', 'sendRoundStartMessage'],
          always: [{ target: 'announceWinner', cond: 'isGameOver' }],
          on: {
            PLAYER_PLAY: {
              target: 'startRound',
              actions: 'playCard'
            },
            PLAYER_PASS: {
              target: 'startRound',
              actions: 'pass'
            },
            PLAYER_REQUEST_HAND: {
              actions: 'sendHand'
            },
            STOP: {
              target: 'endGame'
            }
          }
        },
        announceWinner: {
          entry: 'sendWinnerMessage',
          after: {
            [options.endDelay]: {
              target: 'idle'
            }
          }
        },
        noPlayers: {
          entry: 'sendNoPlayersMessage',
          after: {
            [options.endDelay]: {
              target: 'idle'
            }
          }
        },
        endGame: {
          entry: 'sendGameEndMessage',
          after: {
            [options.endDelay]: {
              target: 'idle'
            }
          }
        }
      }
    },
    {
      actions: {
        sendSolicitMessage: () =>
          sendMessage(
            new MessageEmbed()
              .setTitle('Join Uno!')
              .setDescription(
                `Say \`?join\` to join the game! Game will start in ${
                  options.solicitDelay / 10000
                } seconds.`
              )
          ),
        sendGameStartMessage: (context) =>
          sendMessage(
            new MessageEmbed()
              .setTitle('Game is starting!')
              .setDescription(
                `Dealing cards to ${context.players.length} players...`
              )
          ),
        sendGameStopMessage: () =>
          sendMessage(
            new MessageEmbed()
              .setTitle('Game stopped!')
              .setDescription('The game was aborted.')
          ),
        notifyAddPlayer: (_, event) =>
          sendMessage(
            new MessageEmbed()
              .setTitle('New player!')
              .setDescription(`${event.username} has joined the game!`)
          ),
        notifyRemovePlayer: (_, event) =>
          sendMessage(
            new MessageEmbed()
              .setTitle('Lost player!')
              .setDescription(`${event.username} has left the game!`)
          ),
        sendRoundStartMessage: (context) =>
          sendMessage(
            new MessageEmbed().setTitle(
              `${context.activePlayer.username}'s turn!`
            )
          ),
        sendNoPlayersMessage: () =>
          sendMessage('Cancelled the game because no players joined!'),
        sendHand: async (context, event) => {
          const hand = context.hands[event.id];

          const embed = new MessageEmbed()
            .setTitle('Your Hand')
            .setDescription(
              hand.reduce((prev, curr) => prev + curr.toString(), '')
            );

          await sendPrivateMessage(event.id, embed);
        },
        activateNextPlayer: assign({
          activePlayer: (context) => {
            const currentIndex = context.players.indexOf(context.activePlayer);

            if (currentIndex === context.players.length - 1) {
              return context.players[0];
            } else {
              return context.players[currentIndex + 1];
            }
          }
        }),
        addPlayer: assign({
          players: (context, event) => [
            ...context.players,
            {
              id: event.id,
              username: event.username
            }
          ]
        }),
        removePlayer: assign({
          players: (context, event) => {
            const playerIndex = context.players.findIndex(
              (player) => player.id === event.id
            );

            if (playerIndex === -1) {
              return context.players;
            } else {
              const modified = [...context.players];

              modified.splice(playerIndex, 1);

              return modified;
            }
          }
        }),
        shuffleDeck: assign({
          deck: (context) => shuffle(context.deck)
        }),
        dealHands: assign((context) => {
          const hands = {};

          let remainingDeck = [...context.deck];

          for (const player of context.players) {
            const hand = sampleSize(context.deck, 7);

            hands[player.id] = hand;
            remainingDeck = without(remainingDeck, ...hand);
          }

          const discardPile = [sample(remainingDeck)];

          remainingDeck = without(remainingDeck, discardPile[0]);

          return {
            deck: remainingDeck,
            hands,
            discardPile
          };
        }),
        resetGameState: assign(createContext)
      },
      guards: {
        canGameStart: (context) => context.players.length > 0,
        isGameOver: (context) => {
          for (const key in context.hands) {
            if (context.hands[key].length === 0) {
              return true;
            }
          }

          return false;
        }
      }
    }
  );
