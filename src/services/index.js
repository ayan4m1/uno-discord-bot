import { EmbedBuilder } from 'discord.js';
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

export default {
  notifyRoundStart: ({ hands, players, color, discardPile, activePlayer }) => {
    const discard = last(discardPile);

    let hexColor;

    if (color && !discard.color) {
      hexColor = hexColors[color];
    } else if (discard.color) {
      hexColor = hexColors[discard.color];
    }

    const activePlayerIndex = players.indexOf(activePlayer);

    if (activePlayerIndex === -1) {
      return sendMessage('Error determining who the active player is!');
    }

    let handsArray = Object.entries(hands);

    handsArray = [
      ...handsArray.slice(activePlayerIndex),
      ...handsArray.slice(0, activePlayerIndex)
    ];

    let embed = new EmbedBuilder({
      title: `${activePlayer.username}'s turn!`,
      description: `You have ${
        config.roundDelay / 1e3
      } seconds to \`/play\` or \`/draw\`.`,
      fields: handsArray.map(([id, hand]) => ({
        name: players.find((player) => player.id === id).username,
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
  notifyPlay: ({ activePlayer, discardPile }, { interaction }) => {
    const card = last(discardPile);

    let hexColor;

    if (card.color) {
      hexColor = hexColors[card.color];
    }

    return replyEmbed(
      interaction,
      new EmbedBuilder({
        title: `${activePlayer.username} played ${card.toString()}!`,
        color: hexColor
      })
    );
  },
  notifyNoPlayers: () =>
    sendMessage('Cancelled the game because there were not enough players!'),
  notifyColorChange: ({ color, activePlayer }, { interaction }) =>
    replyMessage(
      interaction,
      `${activePlayer.username} chose ${getCardColor(color)}!`
    ),
  notifyColorChangeNeeded: ({ activePlayer }) =>
    sendMessage(
      `${activePlayer.username} must select a new color! Use e.g. \`/color Red\``
    ),
  notifyUno: ({ activePlayer }) =>
    sendEmbed(
      new EmbedBuilder({
        title: `${activePlayer.username} has UNO!`,
        description: `Watch out for ${activePlayer.username}!`
      })
    ),
  notifyWinner: ({ players, hands }) => {
    const [winnerId] = Object.entries(hands).find(
      ([, hand]) => hand.length === 0
    );
    const winner = players.find((player) => player.id === winnerId);

    return sendEmbed(
      new EmbedBuilder({
        title: 'Game Over!',
        description: `:tada: ${winner.username} is the winner! :tada:`
      })
    );
  },
  notifyPass: ({ activePlayer }, { interaction }) =>
    replyMessage(interaction, `${activePlayer.username} passed!`),
  notifySkip: ({ activePlayer }) =>
    sendMessage(`Skipping ${activePlayer.username}`),
  createGame: ({ players }) => startGame(players),
  updateScores: async ({ gameId, hands, players }) => {
    const [winnerId] = Object.entries(hands).find(
      ([, hand]) => hand.length === 0
    );

    await stopGame(gameId);
    await setWinner(gameId, winnerId);
    for (const { id } of players) {
      await createScore(gameId, { id }, scoreHand(hands[id]));
    }
  },
  stopGame: ({ gameId }) => stopGame(gameId)
};
