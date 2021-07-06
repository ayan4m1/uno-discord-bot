import { MessageEmbed } from 'discord.js';
import { createMachine, assign } from 'xstate';

import { discord as config } from 'modules/config';
import { getNotificationChannel } from 'modules/discord';

const sendEmbed = (embed) => {
  const channel = getNotificationChannel(config.guildId, config.channelId);

  return channel.send(embed);
};

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
      context: {
        deck: [],
        hands: new Map(),
        players: []
      },
      states: {
        idle: {
          on: {
            START: {
              target: 'solicitPlayers'
            }
          }
        },
        solicitPlayers: {
          entry: 'sendSolicitMessage',
          after: {
            [options.solicitDelay]: {
              target: 'startGame',
              cond: 'canGameStart'
            }
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
          entry: 'sendGameStartMessage',
          on: {
            STOP: {
              target: 'idle',
              actions: 'sendStopMessage'
            }
          }
        },
        startRound: {
          entry: 'sendRoundStartMessage',
          on: {
            STOP: {
              target: 'idle',
              actions: 'sendStopMessage'
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
          sendEmbed(
            new MessageEmbed()
              .setTitle('Join Uno!')
              .setDescription('Say `!uno join` to join the game!')
          ),
        sendGameStartMessage: () =>
          sendEmbed(
            new MessageEmbed()
              .setTitle('Game is starting!')
              .setDescription('Get ready...')
          ),
        sendGameStopMessage: () =>
          sendEmbed(
            new MessageEmbed()
              .setTitle('Game stopped!')
              .setDescription('The game was aborted.')
          ),
        notifyAddPlayer: (_, event) =>
          sendEmbed(
            new MessageEmbed()
              .setTitle('New player!')
              .setDescription(`${event.username} has joined the game!`)
          ),
        notifyRemovePlayer: (_, event) =>
          sendEmbed(
            new MessageEmbed()
              .setTitle('Lost player!')
              .setDescription(`${event.username} has left the game!`)
          ),
        addPlayer: assign({
          players: (context, event) => [...context.players, { ...event }]
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
        })
      },
      guards: {
        canGameStart: (context) => context.players.length > 0
      }
    }
  );
