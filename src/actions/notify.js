import { MessageEmbed } from 'discord.js';
import { last } from 'lodash';
import { send } from 'xstate';

import { uno as config } from 'modules/config';
import { sendMessage, sendPrivateMessage } from 'modules/discord';
import { CardColor, CardType } from 'modules/deck';
// import { createCardMontage } from 'modules/montage';

export default {
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
  notifyGameStatus: ({ activePlayer, players, hands, discardPile, deck }) =>
    sendMessage(
      new MessageEmbed()
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
  notifyRoundStart: ({ color, discardPile, activePlayer }) => {
    const discard = last(discardPile);

    let embed = new MessageEmbed()
      .setTitle(`${activePlayer.username}'s turn!`)
      .setDescription(
        `You have ${config.roundDelay / 1e3} seconds to play or pass.`
      )
      .setImage(discard.toUrl('L'));

    switch (discard.type) {
      case CardType.WILD_DRAW:
      case CardType.WILD:
        embed = embed
          .setColor(color.toUpperCase())
          .setDescription(`Color is ${color.toLowerCase()}`);
        break;
      default:
        break;
    }

    return sendMessage(embed);
  },
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
  notifyPlay: ({ activePlayer }, { card }) =>
    sendMessage(
      new MessageEmbed()
        .setTitle(`${activePlayer.username} played ${card.toString()}!`)
        .setImage(card.toUrl())
    ),
  notifyDraw: ({ activePlayer }) =>
    sendMessage(`${activePlayer.username} drew a card!`),
  notifyPass: ({ activePlayer }) =>
    sendMessage(`${activePlayer.username} passed!`),
  notifyColorChange: ({ color, activePlayer }) =>
    sendMessage(
      `${activePlayer.username} chose ${CardColor.fromString(color)}!`
    ),
  notifyColorChangeNeeded: ({ activePlayer }) =>
    sendMessage(
      `${activePlayer.username} must select a new color! Use e.g. \`?color Red\``
    ),
  notifyAllHands: ({ players }) =>
    players.map((player) => send({ type: 'HAND_REQUEST', id: player.id })),
  notifyActivePlayerHand: send(({ activePlayer }) => ({
    type: 'HAND_REQUEST',
    id: activePlayer.id
  })),
  notifyHand: async ({ hands }, { id }) => {
    const hand = hands[id];
    // const montage = await createCardMontage(hand);
    const embed = new MessageEmbed()
      .setTitle('Your Hand')
      .setDescription(hand.map((card) => card.toString()).join(', '));
    // .attachFiles(new MessageAttachment(montage, 'montage.png'));

    await sendPrivateMessage(id, embed);
  }
};
