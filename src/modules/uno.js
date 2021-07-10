import { MessageEmbed } from 'discord.js';
import { createMachine, assign, send } from 'xstate';
import { sampleSize, without, sample, last } from 'lodash';

import {
  getNotificationChannel,
  getPrivateMessageChannel
} from 'modules/discord';
import { CardType, createDeck } from 'modules/deck';
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

const toIdleAfterEnd = {
  after: {
    [config.endDelay]: {
      target: 'idle'
    }
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
            START: {
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
            STOP: {
              target: 'idle',
              actions: 'notifyStop'
            }
          }
        },
        startGame: {
          entry: ['notifyGameStart', 'dealHands'],
          always: [{ target: 'startRound' }]
        },
        startRound: {
          entry: ['activateNextPlayer'],
          always: [
            { target: 'announceWinner', cond: 'isGameOver' },
            { target: 'round' }
          ]
        },
        round: {
          entry: ['sendActivePlayerHand', 'notifyRoundStart'],
          after: {
            [config.roundDelay]: {
              target: 'startRound',
              actions: 'notifySkipPlayer'
            }
          },
          on: {
            PLAY: [
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
                target: 'startRound',
                actions: ['notifyPlay', 'playCard']
              }
            ],
            DRAW: [
              {
                actions: 'notifyInvalidPlayer',
                cond: 'isPlayerInvalid'
              },
              {
                actions: ['notifyDraw', 'dealCard', 'sendActivePlayerHand']
              }
            ],
            HAND_REQUEST: {
              actions: 'sendHand'
            },
            STOP: {
              target: 'stopGame'
            }
          }
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
          entry: 'notifyGameStop',
          ...toIdleAfterEnd
        }
      }
    },
    {
      actions: {
        notifySolicit: () =>
          sendMessage(
            new MessageEmbed().setTitle('Join Uno!').setDescription(
              `Say \`?join\` to join the game!
              Starting in ${config.solicitDelay / 1e3} seconds...`
            )
          ),
        notifyGameStart: ({ players }) =>
          sendMessage(
            new MessageEmbed()
              .setTitle('Game starting!')
              .setDescription(`Dealing cards to ${players.length} players...`)
          ),
        notifyGameStop: () =>
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
        notifyRoundStart: ({ discardPile, activePlayer }) =>
          sendMessage(
            new MessageEmbed()
              .setTitle(`${activePlayer.username}'s turn!`)
              .setImage(getCardUrl(last(discardPile), 'L'))
          ),
        notifyNoPlayers: () =>
          sendMessage('Cancelled the game because no players joined!'),
        notifyWinner: ({ players, hands }) => {
          const [winnerId] = Object.entries(hands).find(
            ([, hand]) => hand.length === 0
          );
          const winner = players.find((player) => player.id === winnerId);

          return sendMessage(`${winner.username} is the winner!`);
        },
        notifyInvalidPlayer: () => sendMessage("It's not your turn!"),
        notifyMissingCard: () =>
          sendMessage("You can't play a card you don't have!"),
        notifyInvalidCard: ({ discardPile }, { card }) =>
          sendMessage(
            `You cannot play ${card.toString()} on ${last(
              discardPile
            ).toString()}!`
          ),
        notifySkipPlayer: ({ activePlayer }) =>
          sendMessage(`Skipping ${activePlayer.username}`),
        notifyPlay: ({ activePlayer }, { card }) =>
          sendMessage(
            new MessageEmbed()
              .setTitle(`${activePlayer.username} played ${card.toString()}!`)
              .setImage(getCardUrl(card))
          ),
        notifyDraw: ({ activePlayer }) =>
          sendMessage(`${activePlayer.username} drew a card!`),
        sendActivePlayerHand: ({ activePlayer }) =>
          send({ type: 'HAND_REQUEST', id: activePlayer.id }),
        sendHand: async ({ hands }, { id }) => {
          const hand = hands[id];

          const embed = new MessageEmbed()
            .setTitle('Your Hand')
            .setDescription(hand.map((card) => card.toString()).join(', '));

          await sendPrivateMessage(id, embed);
        },
        resetGameState: assign(createContext),
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

          const discardPile = [sample(remainingDeck)];

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

          switch (card.type) {
            case CardType.WILD_DRAW:
              break;
            default:
              break;
          }

          return {
            hands: {
              ...hands,
              [activePlayer.id]: hand
            },
            discardPile: [...discardPile, card]
          };
        }),
        dealCard: assign(({ activePlayer, hands, deck }) => {
          const newCard = sample(deck);
          const hand = hands[activePlayer.id];

          return {
            hands: {
              ...hands,
              [activePlayer.id]: [...hand, newCard]
            },
            deck: without(deck, newCard)
          };
        })
      },
      guards: {
        canGameStart: ({ players }) => players.length > 0,
        isGameOver: ({ hands }) =>
          Object.values(hands).some((hand) => hand.length === 0),
        isPlayerInvalid: ({ activePlayer }, { id }) => activePlayer.id !== id,
        isCardMissing: ({ activePlayer, hands }, { card }) => {
          const hand = hands[activePlayer.id];

          return !hand.some((handCard) => handCard.equals(card));
        },
        isCardInvalid: ({ discardPile }, { card }) =>
          !last(discardPile).validPlay(card)
      }
    }
  );
