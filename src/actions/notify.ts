import { resolve } from 'path';
import { last } from 'lodash-es';
import pluralize from 'pluralize';
import { readFileSync } from 'jsonfile';
import { actions, raise } from 'xstate';
import type { ActionFunctionMap } from 'xstate';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';

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
import type { GameContext, GameEvent } from '../types.js';

const { pure } = actions;
const packageJson: { version: string } = readFileSync(
  resolve('.', 'package.json')
);

export default {
  notifySolicit: (_: GameContext, { interaction }: GameEvent) =>
    replyEmbed(
      interaction,
      new EmbedBuilder({
        title: 'Join Uno!',
        description: `Use \`/join\` to join the game!

        Starting in ${config.solicitDelay / 1e3} seconds...`
      })
    ),
  notifyGameStart: ({ players }: GameContext) =>
    sendEmbed(
      new EmbedBuilder({
        title: 'Game starting!',
        description: `Dealing cards to ${players.length} players...`
      })
    ),
  notifyGameStop: (_: GameContext, { interaction }: GameEvent) => {
    const embed = new EmbedBuilder({
      title: 'Game stopped!',
      description: 'The game was stopped.'
    });

    return interaction ? replyEmbed(interaction, embed) : sendEmbed(embed);
  },
  notifyGameStatus: (
    { activePlayer, players, hands, discardPile, deck }: GameContext,
    { interaction }: GameEvent
  ) =>
    replyEmbed(
      interaction,
      players.length
        ? new EmbedBuilder({
            title: `Game with ${players.length} players`,
            image: {
              url: discardPile.length
                ? discardPile[discardPile.length - 1].toUrl('M')
                : ''
            },
            description: `Discard Pile: ${discardPile.length} ${pluralize(
              'cards',
              discardPile.length
            )}
            Deck: ${deck.length} ${pluralize('cards', deck.length)}`,
            fields: Object.entries(hands).map(([id, hand]) => ({
              name:
                players?.find?.((player) => player.id === id)?.username ??
                'Unknown',
              value: `${hand.length} ${pluralize('cards', hand.length)}`
            })),
            footer: {
              text: `Active Player: ${activePlayer?.username}`
            }
          })
        : new EmbedBuilder({ description: 'Not playing a game!' })
    ),
  notifyAddPlayer: (_: GameContext, { username, interaction }: GameEvent) =>
    replyEmbed(
      interaction,
      new EmbedBuilder({
        title: 'Player joined!',
        description: `${username} has joined the game!`
      })
    ),
  notifyRemovePlayer: (_: GameContext, { username, interaction }: GameEvent) =>
    replyEmbed(
      interaction,
      new EmbedBuilder({
        title: 'Player left!',
        description: `${username} has left the game!`
      })
    ),
  notifyInGame: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, 'You are already in the game!'),
  notifyNotInGame: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, 'You are not in the game!'),
  notifyInvalidAdd: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, 'Sorry, you cannot join now!'),
  notifyInvalidRemove: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, 'Sorry, you cannot leave now!'),
  notifyInvalidPlayer: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, "It's not your turn!"),
  notifyInvalidPass: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(
      interaction,
      'You shall not pass (without first drawing a card)!'
    ),
  notifyInvalidPlay: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, 'You cannot play now!'),
  notifyInvalidDraw: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, 'You cannot draw now!'),
  notifyInvalidColorChange: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, 'You cannot change colors right now!'),
  notifyDuplicateDraw: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(
      interaction,
      'You have already drawn a card! Use `/play` or `/pass`!'
    ),
  notifyMissingCard: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, 'You cannot play that card!'),
  notifyInvalidCard: (
    { discardPile }: GameContext,
    { card, interaction }: GameEvent
  ) =>
    replyMessage(
      interaction,
      `You cannot play ${card?.toString()} on ${last(discardPile)?.toString()}!`
    ),
  notifyInvalidColor: (_: GameContext, { color, interaction }: GameEvent) =>
    replyMessage(interaction, `${color} is not a valid color (R, G, B, or Y)`),
  notifyDraw: ({ activePlayer }: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, `${activePlayer?.username} drew a card!`),
  notifyAllHands: pure<GameContext, GameEvent>(({ players }) =>
    players
      .slice(1)
      .map((player) => raise({ type: 'HAND_REQUEST', id: player.id }))
  ),
  notifyActivePlayerHand: raise<GameContext, GameEvent>(({ activePlayer }) => ({
    type: 'HAND_REQUEST',
    id: activePlayer?.id
  })),
  notifyInactiveGame: (_: GameContext, { interaction }: GameEvent) =>
    replyMessage(interaction, 'No game is active!'),
  notifyHand: async (
    { hands }: GameContext,
    { interaction, id }: GameEvent
  ) => {
    if (!id || !Array.isArray(hands[id])) {
      return sendMessage("Could not find that player's hand");
    }

    const hand = [...hands[id]];

    hand.sort((a, b) => a.compareTo(b));

    const { height, width, buffer } = await createCardMontage(hand);

    const embed = new EmbedBuilder({
      title: 'Your Hand',
      description: hand.map((card) => card.toString()).join(', '),
      image: {
        url: 'attachment://hand.png',
        height,
        width
      }
    });
    const attachments = [new AttachmentBuilder(buffer).setName('hand.png')];

    if (interaction) {
      return replyEmbed(interaction, embed, attachments);
    } else {
      return sendPrivateEmbed(id, embed, attachments);
    }
  },
  notifyLeaderboard: async (_: GameContext, { interaction }: GameEvent) => {
    const leaderboard = await getLeaderboard();

    if (!leaderboard) {
      return replyMessage(interaction, 'Error fetching leaderboard data!');
    }

    const entries = [...leaderboard.entries()];

    entries.sort(([, a], [, b]) => a.ratio - b.ratio);

    const fields = entries.map(([username, { score, games, won, ratio }]) => ({
      name: `${username} - ${won} ${pluralize('wins', won)}`,
      value: `${ratio.toFixed(2)} (${score} pts / ${games} games)`
    }));

    return replyEmbed(
      interaction,
      new EmbedBuilder({
        title: 'Leaderboard',
        fields: fields.slice(0, Math.min(10, fields.length))
      })
    );
  },
  notifyHelp: (_: GameContext, { interaction }: GameEvent) =>
    replyEmbed(
      interaction,
      new EmbedBuilder({
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
} satisfies ActionFunctionMap<GameContext, GameEvent>;
