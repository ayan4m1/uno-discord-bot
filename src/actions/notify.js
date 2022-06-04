import { MessageEmbed } from 'discord.js';
import { last } from 'lodash-es';
import pluralize from 'pluralize';
import { send, actions } from 'xstate';

import { uno as config } from '../modules/config.js';
import {
  replyEmbed,
  replyMessage,
  sendEmbed,
  sendPrivateEmbed
} from '../modules/discord.js';

const { pure } = actions;

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
              url: discardPile[0].toUrl('M')
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
  notifyInvalidPlayer: (_, { interaction }) =>
    replyMessage(interaction, "It's not your turn!"),
  notifyInvalidPass: (_, { interaction }) =>
    replyMessage(
      interaction,
      'You shall not pass (without first drawing a card)!'
    ),
  notifyInvalidDraw: (_, { interaction }) =>
    replyMessage(
      interaction,
      'You have already drawn a card! Use `/play` or `/pass`!'
    ),
  notifyMissingCard: (_, { interaction }) =>
    replyMessage(interaction, "You can't play a card you don't have!"),
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
    players.map((player) => send({ type: 'HAND_REQUEST', id: player.id }))
  ),
  notifyActivePlayerHand: send(({ activePlayer }) => ({
    type: 'HAND_REQUEST',
    id: activePlayer.id
  })),
  notifyHand: async ({ hands }, { interaction, id }) => {
    const hand = hands[id];
    const embed = new MessageEmbed({
      title: 'Your Hand',
      description: hand.map((card) => card.toString()).join(', ')
    });

    if (interaction) {
      return replyEmbed(interaction, embed);
    } else {
      return sendPrivateEmbed(id, embed);
    }
  }
};
