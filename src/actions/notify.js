import { MessageEmbed } from 'discord.js';
import { last } from 'lodash-es';
import { send, actions } from 'xstate';

import { uno as config } from '../modules/config.js';
import {
  sendEmbed,
  sendMessage,
  sendPrivateEmbed
} from '../modules/discord.js';
// import { createCardMontage } from '../modules/montage.js';

const { pure } = actions;

export default {
  notifySolicit: () =>
    sendEmbed(
      new MessageEmbed().setTitle('Join Uno!').setDescription(
        `Say \`?join\` to join the game!

Starting in ${config.solicitDelay / 1e3} seconds...`
      )
    ),
  notifyGameStart: ({ players }) =>
    sendEmbed(
      new MessageEmbed()
        .setTitle('Game starting!')
        .setDescription(`Dealing cards to ${players.length} players...`)
    ),
  notifyGameStop: () =>
    sendEmbed(
      new MessageEmbed()
        .setTitle('Game stopped!')
        .setDescription('The game was aborted.')
    ),
  notifyGameStatus: ({ activePlayer, players, hands, discardPile, deck }) =>
    sendEmbed(
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
  notifyWinner: ({ players, hands }) => {
    const [winnerId] = Object.entries(hands).find(
      ([, hand]) => hand.length === 0
    );
    const winner = players.find((player) => player.id === winnerId);

    return sendMessage(`${winner.username} is the winner!`);
  },
  notifyInvalidPlayer: () => sendMessage("It's not your turn!"),
  notifyInvalidPass: () =>
    sendMessage("You can't pass without first drawing a card using `?draw`."),
  notifyMissingCard: () => sendMessage("You can't play a card you don't have!"),
  notifyInvalidCard: ({ discardPile }, { card }) =>
    sendMessage(
      `You cannot play ${card.toString()} on ${last(discardPile).toString()}!`
    ),
  notifyInvalidColor: (_, { color }) =>
    sendMessage(`${color} is not a valid color (R, G, B, or Y)`),
  notifySkipPlayer: ({ activePlayer }) =>
    sendMessage(`Skipping ${activePlayer.username}`),
  notifyDraw: ({ activePlayer }) =>
    sendMessage(`${activePlayer.username} drew a card!`),
  notifyPass: ({ activePlayer }) =>
    sendMessage(`${activePlayer.username} passed!`),
  notifyAllHands: pure(({ players }) =>
    players.map((player) => send({ type: 'HAND_REQUEST', id: player.id }))
  ),
  notifyActivePlayerHand: send(({ activePlayer }) => ({
    type: 'HAND_REQUEST',
    id: activePlayer.id
  })),
  notifyHand: ({ hands }, { id }) => {
    const hand = hands[id];
    // const montage = await createCardMontage(hand);
    const embed = new MessageEmbed()
      .setTitle('Your Hand')
      .setDescription(hand.map((card) => card.toString()).join(', '));
    // .attachFiles(new MessageAttachment(montage, 'montage.png'));

    return sendPrivateEmbed(id, embed);
  },
  notifyUno: ({ activePlayer }) =>
    sendMessage(`${activePlayer.username} has UNO!`)
};
