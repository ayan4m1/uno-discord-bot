import { MessageEmbed, MessageAttachment } from 'discord.js';
import { last } from 'lodash-es';
import pluralize from 'pluralize';
import { send, actions } from 'xstate';
import jsonfile from 'jsonfile';
import { resolve } from 'path';

import { uno as config } from '../modules/config.js';
import {
  replyEmbed,
  replyMessage,
  sendEmbed,
  sendMessage,
  sendPrivateEmbed
} from '../modules/discord.js';
import { getLeaderboard } from '../modules/database.js';
import { createCardMontage } from '../modules/montage.js';

const { pure } = actions;
const { readFileSync } = jsonfile;

const packageJson = readFileSync(resolve('.', 'package.json'));

export default {
  notifySolicit: (_, { interaction }) =>
    replyEmbed(
      interaction,
      new MessageEmbed({
        title: 'Join Uno!',
        description: `Use \`/join\` to join the game!

        Starting in ${config.solicitDelay / 1e3} seconds...`
      })
    ),
  notifyGameStart: ({ players }) =>
    sendEmbed(
      new MessageEmbed({
        title: 'Game starting!',
        description: `Dealing cards to ${players.length} players...`
      })
    ),
  notifyGameStop: (_, { interaction }) =>
    replyEmbed(
      interaction,
      new MessageEmbed({
        title: 'Game stopped!',
        description: 'The game was stopped.'
      })
    ),
  notifyGameStatus: (
    { activePlayer, players, hands, discardPile, deck },
    { interaction }
  ) =>
    replyEmbed(
      interaction,
      players.length
        ? new MessageEmbed({
            title: `Game with ${players.length} players`,
            image: {
              url: discardPile.length
                ? discardPile[discardPile.length - 1].toUrl('M')
                : null
            },
            description: `Discard Pile: ${discardPile.length} ${pluralize(
              'cards',
              discardPile.length
            )}
            Deck: ${deck.length} ${pluralize('cards', deck.length)}`,
            fields: Object.entries(hands).map(([id, hand]) => ({
              name: players.find((player) => player.id === id).username,
              value: `${hand.length} ${pluralize('cards', hand.length)}`
            })),
            footer: `Active Player: ${activePlayer.username}`
          })
        : new MessageEmbed({ description: 'Not playing a game!' })
    ),
  notifyAddPlayer: (_, { username, interaction }) =>
    replyEmbed(
      interaction,
      new MessageEmbed({
        title: 'Player joined!',
        description: `${username} has joined the game!`
      })
    ),
  notifyRemovePlayer: (_, { username, interaction }) =>
    replyEmbed(
      interaction,
      new MessageEmbed({
        title: 'Player left!',
        description: `${username} has left the game!`
      })
    ),
  notifyInGame: (_, { interaction }) =>
    replyMessage(interaction, 'You are already in the game!'),
  notifyNotInGame: (_, { interaction }) =>
    replyMessage(interaction, 'You are not in the game!'),
  notifyInvalidAdd: (_, { interaction }) =>
    replyMessage(interaction, 'Sorry, you cannot join a game in progress!'),
  notifyInvalidRemove: (_, { interaction }) =>
    replyMessage(interaction, 'Sorry, you cannot leave a game in progress!'),
  notifyInvalidPlayer: (_, { interaction }) =>
    replyMessage(interaction, "It's not your turn!"),
  notifyInvalidPass: (_, { interaction }) =>
    replyMessage(
      interaction,
      'You shall not pass (without first drawing a card)!'
    ),
  notifyInvalidPlay: (_, { interaction }) =>
    replyMessage(interaction, 'You cannot play now!'),
  notifyInvalidDraw: (_, { interaction }) =>
    replyMessage(interaction, 'You cannot draw now!'),
  notifyInvalidColorChange: (_, { interaction }) =>
    replyMessage(interaction, 'You cannot change colors right now!'),
  notifyDuplicateDraw: (_, { interaction }) =>
    replyMessage(
      interaction,
      'You have already drawn a card! Use `/play` or `/pass`!'
    ),
  notifyMissingCard: (_, { interaction }) =>
    replyMessage(interaction, 'You cannot play that card!'),
  notifyInvalidCard: ({ discardPile }, { card, interaction }) =>
    replyMessage(
      interaction,
      `You cannot play ${card.toString()} on ${last(discardPile).toString()}!`
    ),
  notifyInvalidColor: (_, { color, interaction }) =>
    replyMessage(interaction, `${color} is not a valid color (R, G, B, or Y)`),
  notifyDraw: ({ activePlayer }, { interaction }) =>
    replyMessage(interaction, `${activePlayer.username} drew a card!`),
  notifyAllHands: pure(({ players }) =>
    players
      .slice(1)
      .map((player) => send({ type: 'HAND_REQUEST', id: player.id }))
  ),
  notifyActivePlayerHand: send(({ activePlayer }) => ({
    type: 'HAND_REQUEST',
    id: activePlayer.id
  })),
  notifyInactiveGame: (_, { interaction }) =>
    replyMessage(interaction, 'No game is active!'),
  notifyHand: async ({ hands }, { interaction, id }) => {
    if (!Array.isArray(hands[id])) {
      return sendMessage("Could not find that player's hand");
    }

    const hand = [...hands[id]];

    hand.sort((a, b) => a.compareTo(b));

    const { height, width, buffer } = await createCardMontage(hand);

    const embed = new MessageEmbed({
      title: 'Your Hand',
      description: hand.map((card) => card.toString()).join(', '),
      image: {
        url: 'attachment://hand.png',
        height,
        width
      }
    });
    const attachments = [new MessageAttachment(buffer, 'hand.png')];

    if (interaction) {
      return replyEmbed(interaction, embed, attachments);
    } else {
      return sendPrivateEmbed(id, embed, attachments);
    }
  },
  notifyLeaderboard: async (_, { interaction }) => {
    const leaderboard = await getLeaderboard();

    if (!leaderboard) {
      return replyMessage(interaction, 'Error fetching leaderboard data!');
    }

    const entries = Object.entries(leaderboard);

    entries.sort(([, a], [, b]) => a.ratio - b.ratio);

    const fields = entries.map(([username, { score, games, won, ratio }]) => ({
      name: `${username} - ${won} ${pluralize('wins', won)}`,
      value: `${ratio.toFixed(2)} (${score} pts / ${games} games)`
    }));

    return replyEmbed(
      interaction,
      new MessageEmbed({
        title: 'Leaderboard',
        fields: fields.slice(0, Math.min(10, fields.length))
      })
    );
  },
  notifyHelp: (_, { interaction }) =>
    replyEmbed(
      interaction,
      new MessageEmbed({
        title: 'Help!',
        description: `To play Uno, an admin starts the game with \`/start\`. Then, players join with \`/join\`. Admins can cancel a game in-progress with \`/stop\`.

        You can leave before the game begins with \`/leave\`.

        Once the game begins, all players receive their hands via PM. The player order is randomized.

        To play a card, use e.g. \`/play G2\`.

        If you cannot play a card, use \`/draw\`. You can then either \`/play\` it or use \`/pass\`.

        When playing a Wild card, you must choose the follow-up color for play to continue using e.g. \`/color red\`.

        At any time during a game, you can get a copy of your hand sent to you by using the \`/hand\` command.

        At any time during a game, you can get information on the size of decks and hands by using the \`/status\` command.

        Your score is kept between games, view the leaderboard using \`/board\`!`,
        fields: [{ name: 'Uno Rules', value: 'https://www.unorules.com/' }],
        image: {
          url: config.helpImageUrl
        },
        author: {
          name: `Uno ${packageJson.version} by ayan4m1`,
          url: 'https://github.com/ayan4m1/uno-discord-bot/'
        }
      })
    )
};
