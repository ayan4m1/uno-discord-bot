import { MessageEmbed, MessageAttachment } from 'discord.js';
import { last } from 'lodash-es';
import { send, actions } from 'xstate';

import { uno as config } from '../modules/config.js';
import {
  replyEmbed,
  replyMessage,
  sendEmbed,
  sendPrivateEmbed
} from '../modules/discord.js';
import { createCardMontage } from '../modules/montage.js';

const { pure } = actions;

export default {
  notifySolicit: (_, { interaction }) =>
    replyEmbed(
      interaction,
      new MessageEmbed().setTitle('Join Uno!').setDescription(
        `Use \`/join\` to join the game!

Starting in ${config.solicitDelay / 1e3} seconds...`
      )
    ),
  notifyGameStart: ({ players }) =>
    sendEmbed(
      new MessageEmbed()
        .setTitle('Game starting!')
        .setDescription(`Dealing cards to ${players.length} players...`)
    ),
  notifyGameStop: (_, { interaction }) =>
    replyEmbed(
      interaction,
      new MessageEmbed()
        .setTitle('Game stopped!')
        .setDescription('The game was aborted.')
    ),
  notifyGameStatus: (
    { activePlayer, players, hands, discardPile, deck },
    { interaction }
  ) =>
    replyEmbed(
      interaction,
      players.length
        ? new MessageEmbed()
            .setTitle(`Game with ${players.length} players`)
            .setDescription(
              `Discard Pile: ${discardPile.length} cards
      Deck: ${deck.length} cards
      Hands:

      ${Object.entries(hands)
        .map(
          ([id, hand]) =>
            `${players.find((player) => player.id === id).username} - ${
              hand.length
            } cards`
        )
        .join('\n')}`
            )
            .setFooter(`Active Player: ${activePlayer.username}`)
        : new MessageEmbed().setDescription('Not playing a game!')
    ),
  notifyAddPlayer: (_, { username, interaction }) =>
    replyEmbed(
      interaction,
      new MessageEmbed()
        .setTitle('New player!')
        .setDescription(`${username} has joined the game!`)
    ),
  notifyRemovePlayer: (_, { username, interaction }) =>
    replyEmbed(
      interaction,
      new MessageEmbed()
        .setTitle('Lost player!')
        .setDescription(`${username} has left the game!`)
    ),
  notifyInvalidPlayer: (_, { interaction }) =>
    replyMessage(interaction, "It's not your turn!", true),
  notifyInvalidPass: (_, { interaction }) =>
    replyMessage(
      interaction,
      "You can't pass without first drawing a card using `/draw`.",
      true
    ),
  notifyMissingCard: (_, { interaction }) =>
    replyMessage(interaction, "You can't play a card you don't have!", true),
  notifyInvalidCard: ({ discardPile }, { card }) =>
    replyMessage(
      `You cannot play ${card.toString()} on ${last(discardPile).toString()}!`,
      true
    ),
  notifyInvalidColor: (_, { color, interaction }) =>
    replyMessage(
      interaction,
      `${color} is not a valid color (R, G, B, or Y)`,
      true
    ),
  notifyDraw: ({ activePlayer }, { interaction }) =>
    replyMessage(interaction, `${activePlayer.username} drew a card!`),
  notifyAllHands: pure(({ players }) =>
    players.map((player) => send({ type: 'HAND_REQUEST', id: player.id }))
  ),
  notifyActivePlayerHand: send(({ activePlayer }) => ({
    type: 'HAND_REQUEST',
    id: activePlayer.id
  })),
  notifyHand: async ({ hands }, { id }) => {
    const hand = hands[id];
    const montage = await createCardMontage(hand);
    const embed = new MessageEmbed()
      .setTitle('Your Hand')
      .setDescription(hand.map((card) => card.toString()).join(', '))
      .setImage('attachment://hand.png');

    return sendPrivateEmbed(id, embed, [
      new MessageAttachment(montage, 'hand.png')
    ]);
  }
};
