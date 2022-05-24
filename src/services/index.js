import { MessageEmbed } from 'discord.js';
import { last } from 'lodash-es';

import { uno as config } from '../modules/config.js';
import { sendEmbed, sendMessage } from '../modules/discord.js';
import { CardColor, getCardColor, CardType } from '../modules/deck.js';

export default {
  notifyRoundStart: ({ color, discardPile, activePlayer }) => {
    const discard = last(discardPile);

    let embed = new MessageEmbed()
      .setTitle(`${activePlayer.username}'s turn!`)
      .setDescription(
        `You have ${config.roundDelay / 1e3} seconds to \`?play\` or \`?pass\`.`
      )
      .setImage(discard.toUrl('L'));

    switch (discard.type) {
      case CardType.WILD_DRAW:
      case CardType.WILD:
        // todo: Need to implement handling for when WILD is the first discard!
        if (color) {
          let hexColor;

          switch (color) {
            case CardColor.BLUE:
              hexColor = '#0000ff';
              break;
            case CardColor.GREEN:
              hexColor = '#00ff00';
              break;
            case CardColor.RED:
              hexColor = '#ff0000';
              break;
            case CardColor.YELLOW:
              hexColor = '#ffff00';
              break;
            default:
              hexColor = '#000000';
          }

          embed = embed
            .setColor(hexColor)
            .setDescription(`Color is ${color.toLowerCase()}`);
        }
        break;
      default:
        break;
    }

    return sendEmbed(embed);
  },
  notifyPlay: ({ activePlayer, discardPile }) => {
    const card = last(discardPile);

    return sendEmbed(
      new MessageEmbed()
        .setTitle(`${activePlayer.username} played ${card.toString()}!`)
        .setImage(card.toUrl('M'))
    );
  },
  notifyNoPlayers: () =>
    sendMessage('Cancelled the game because no players joined!'),
  notifyColorChange: ({ color, activePlayer }) =>
    sendMessage(`${activePlayer.username} chose ${getCardColor(color)}!`),
  notifyColorChangeNeeded: ({ activePlayer }) =>
    sendMessage(
      `${activePlayer.username} must select a new color! Use e.g. \`?color Red\``
    )
};
