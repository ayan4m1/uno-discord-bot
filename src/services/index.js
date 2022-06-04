import { MessageEmbed } from 'discord.js';
import { last } from 'lodash-es';

import { uno as config } from '../modules/config.js';
import {
  replyEmbed,
  replyMessage,
  sendEmbed,
  sendMessage
} from '../modules/discord.js';
import { CardType, hexColors, getCardColor } from '../modules/deck.js';

export default {
  notifyRoundStart: ({ color, discardPile, activePlayer }) => {
    const discard = last(discardPile);

    let hexColor;

    if (color && !discard.color) {
      hexColor = hexColors[color];
    } else if (discard.color) {
      hexColor = hexColors[discard.color];
    }

    let embed = new MessageEmbed({
      title: `${activePlayer.username}'s turn!`,
      description: `You have ${
        config.roundDelay / 1e3
      } seconds to \`/play\` or \`/draw\`.`,
      color: hexColor,
      image: discard.toUrl('M')
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
      new MessageEmbed({
        title: `${activePlayer.username} played ${card.toString()}!`,
        color: hexColor
      })
    );
  },
  notifyNoPlayers: () =>
    sendMessage('Cancelled the game because no players joined!'),
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
      new MessageEmbed({
        title: `${activePlayer.username} has UNO!`,
        description: `Watch out for ${activePlayer.username}!`
      })
    ),
  notifyWinner: ({ players, hands }) => {
    const [winnerId] = Object.entries(hands).find(
      ([, hand]) => hand.length === 0
    );
    const winner = players.find((player) => player.id === winnerId);

    return sendMessage(`${winner.username} is the winner!`);
  },
  notifyPass: ({ activePlayer }, { interaction }) =>
    replyMessage(interaction, `${activePlayer.username} passed!`),
  notifySkip: ({ activePlayer }) =>
    sendMessage(`Skipping ${activePlayer.username}`)
};
