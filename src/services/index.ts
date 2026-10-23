import { EmbedBuilder } from 'discord.js';
import type { ServiceConfig } from 'xstate';
import { last } from 'lodash-es';
import pluralize from 'pluralize';

import { uno as config } from '../modules/config.js';
import {
  createScore,
  setWinner,
  startGame,
  stopGame
} from '../modules/database.js';
import {
  replyEmbed,
  replyMessage,
  sendEmbed,
  sendMessage
} from '../modules/discord.js';
import {
  CardType,
  hexColors,
  getCardColor,
  scoreHand
} from '../modules/deck.js';
import type { GameContext, GameEvent } from '../types.js';

export default {
  notifyRoundStart: ({
    hands,
    players,
    color,
    discardPile,
    activePlayer
  }: GameContext) => {
    const discard = last(discardPile);

    if (!discard) {
      return sendMessage('Error determining the top of the discard pile!');
    }

    let hexColor: number | undefined;

    if (color && !discard.color) {
      hexColor = hexColors[color];
    } else if (discard.color) {
      hexColor = hexColors[discard.color];
    }

    const activePlayerIndex = activePlayer ? players.indexOf(activePlayer) : -1;

    if (activePlayerIndex === -1) {
      return sendMessage('Error determining who the active player is!');
    }

    let handsArray = Object.entries(hands);

    handsArray = [
      ...handsArray.slice(activePlayerIndex),
      ...handsArray.slice(0, activePlayerIndex)
    ];

    let embed = new EmbedBuilder({
      title: `${activePlayer?.username}'s turn!`,
      description: `You have ${
        config.roundDelay / 1e3
      } seconds to \`/play\` or \`/draw\`.`,
      fields: handsArray.map(([id, hand]) => ({
        name:
          players?.find((player) => player.id === id)?.username ?? 'Unknown',
        value: `${hand.length} ${pluralize('cards', hand.length)}`
      })),
      color: hexColor,
      image: {
        url: discard.toUrl('M')
      }
    });

    switch (discard.type) {
      case CardType.WILD_DRAW:
      case CardType.WILD:
        embed = embed.setDescription(`Color is ${color?.toLowerCase?.()}`);
        break;
      default:
        break;
    }

    return sendEmbed(embed);
  },
  notifyPlay: async (
    { activePlayer, discardPile }: GameContext,
    { interaction }: GameEvent
  ) => {
    const card = last(discardPile);

    if (!card) {
      return replyMessage(interaction, 'Error determining the card played!');
    }

    let hexColor: number | undefined;

    if (card.color) {
      hexColor = hexColors[card.color];
    }

    return replyEmbed(
      interaction,
      new EmbedBuilder({
        title: `${activePlayer?.username} played ${card.toString()}!`,
        color: hexColor
      })
    );
  },
  notifyNoPlayers: () =>
    sendMessage('Cancelled the game because there were not enough players!'),
  notifyColorChange: async (
    { color, activePlayer }: GameContext,
    { interaction }: GameEvent
  ) =>
    replyMessage(
      interaction,
      `${activePlayer?.username} chose ${getCardColor(color)}!`
    ),
  notifyColorChangeNeeded: ({ activePlayer }: GameContext) =>
    sendMessage(
      `${activePlayer?.username} must select a new color! Use e.g. \`/color Red\``
    ),
  notifyUno: ({ activePlayer }: GameContext) =>
    sendEmbed(
      new EmbedBuilder({
        title: `${activePlayer?.username} has UNO!`,
        description: `Watch out for ${activePlayer?.username}!`
      })
    ),
  notifyWinner: ({ players, hands }: GameContext) => {
    const [winnerId] = Object.entries(hands).find(
      ([, hand]) => hand.length === 0
    ) ?? [''];
    const winner = players.find((player) => player.id === winnerId);

    return sendEmbed(
      new EmbedBuilder({
        title: 'Game Over!',
        description: `:tada: ${winner?.username} is the winner! :tada:`
      })
    );
  },
  notifyPass: async (
    { activePlayer }: GameContext,
    { interaction }: GameEvent
  ) => replyMessage(interaction, `${activePlayer?.username} passed!`),
  notifySkip: ({ activePlayer }: GameContext) =>
    sendMessage(`Skipping ${activePlayer?.username}`),
  createGame: ({ players }: GameContext) => startGame(players),
  updateScores: async ({ gameId, hands, players }: GameContext) => {
    const [winnerId] = Object.entries(hands).find(
      ([, hand]) => hand.length === 0
    ) ?? [''];

    if (!gameId) {
      return;
    }

    await stopGame(gameId);
    await setWinner(gameId, winnerId);
    for (const { id } of players) {
      await createScore(gameId, { id }, scoreHand(hands[id]));
    }
  },
  stopGame: async ({ gameId }: GameContext) => {
    if (gameId) {
      await stopGame(gameId);
    }
  }
} satisfies Record<string, ServiceConfig<GameContext, GameEvent>>;
