import { MessageEmbed } from 'discord.js';
import { createMachine, assign } from 'xstate';
import { shuffle, sampleSize, without, sample } from 'lodash';

import {
  getNotificationChannel,
  getPrivateMessageChannel
} from 'modules/discord';
import { createDeck } from 'modules/deck';
import { uno as config } from 'modules/config';

const getCardUrl = (card, size = 'S') =>
  `${config.cardBaseUrl}${card.toString()}_${size}.png`;

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
            REQUEST_HAND: {
              actions: 'sendHand'
            },
            STOP: {
              target: 'stopGame'
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
        stopGame: {
          entry: 'sendGameStopMessage',
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
            new MessageEmbed().setTitle('Join Uno!').setDescription(
              `Say \`?join\` to join the game!
              Starting in ${options.solicitDelay / 1e3} seconds...`
            )
          ),
        sendGameStartMessage: ({ players }) =>
          sendMessage(
            new MessageEmbed()
              .setTitle('Game starting!')
              .setDescription(`Dealing cards to ${players.length} players...`)
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
        sendRoundStartMessage: ({ discardPile, activePlayer }) => {
          const discard = discardPile[discardPile.length - 1];

          return sendMessage(
            new MessageEmbed()
              .setTitle(`${activePlayer.username}'s turn!`)
              .setImage(getCardUrl(discard, 'L'))
          );
        },
        sendNoPlayersMessage: () =>
          sendMessage('Cancelled the game because no players joined!'),
        sendHand: async ({ hands }, event) => {
          const hand = hands[event.id];

          const embed = new MessageEmbed()
            .setTitle('Your Hand')
            .setDescription(hand.map((card) => card.toString()).join(', '));

          await sendPrivateMessage(event.id, embed);
        },
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
          players: ({ players }, event) => {
            const playerIndex = players.findIndex(
              (player) => player.id === event.id
            );

            if (playerIndex === -1) {
              return players;
            } else {
              const modified = [...players];

              modified.splice(playerIndex, 1);

              return modified;
            }
          }
        }),
        shuffleDeck: assign({
          deck: ({ deck }) => shuffle(deck)
        }),
        dealHands: assign(({ deck, players }) => {
          const hands = {};

          let remainingDeck = [...deck];

          for (const player of players) {
            const hand = sampleSize(deck, 7);

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
        canGameStart: ({ players }) => players.length > 0,
        isGameOver: ({ hands }) =>
          Object.entries(hands).some(([, hand]) => hand.length === 0)
      }
    }
  );
