import { MessageEmbed } from 'discord.js';
import { last } from 'lodash';
import { send } from 'xstate';

import { uno as config } from 'modules/config';
import { sendMessage, sendPrivateMessage } from 'modules/discord';
import { CardColor, CardType } from 'modules/deck';
// import { createCardMontage } from 'modules/montage';

export default {
  notifySolicit: async () =>
    await sendMessage(
      new MessageEmbed().setTitle('Join Uno!').setDescription(
        `Say \`?join\` to join the game!
      Starting in ${config.solicitDelay / 1e3} seconds...`
      )
    ),
  notifyGameStart: async ({ players }) =>
    await sendMessage(
      new MessageEmbed()
        .setTitle('Game starting!')
        .setDescription(`Dealing cards to ${players.length} players...`)
    ),
  notifyGameStop: async () =>
    await sendMessage(
      new MessageEmbed()
        .setTitle('Game stopped!')
        .setDescription('The game was aborted.')
    ),
  notifyGameStatus: async ({
    activePlayer,
    players,
    hands,
    discardPile,
    deck
  }) =>
    await sendMessage(
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
        : 'Not playing a game!'
    ),
  notifyAddPlayer: async (_, event) =>
    await sendMessage(
      new MessageEmbed()
        .setTitle('New player!')
        .setDescription(`${event.username} has joined the game!`)
    ),
  notifyRemovePlayer: async (_, event) =>
    await sendMessage(
      new MessageEmbed()
        .setTitle('Lost player!')
        .setDescription(`${event.username} has left the game!`)
    ),
  notifyRoundStart: async ({ color, discardPile, activePlayer }) => {
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
          embed = embed
            .setColor(color.toUpperCase())
            .setDescription(`Color is ${color.toLowerCase()}`);
        }
        break;
      default:
        break;
    }

    return await sendMessage(embed);
  },
  notifyNoPlayers: async () =>
    await sendMessage('Cancelled the game because no players joined!'),
  notifyWinner: async ({ players, hands }) => {
    const [winnerId] = Object.entries(hands).find(
      ([, hand]) => hand.length === 0
    );
    const winner = players.find((player) => player.id === winnerId);

    return await sendMessage(`${winner.username} is the winner!`);
  },
  notifyInvalidPlayer: async () => await sendMessage("It's not your turn!"),
  notifyInvalidPass: async () =>
    await sendMessage(
      "You can't pass without first drawing a card using `?draw`."
    ),
  notifyMissingCard: async () =>
    await sendMessage("You can't play a card you don't have!"),
  notifyInvalidCard: async ({ discardPile }, { card }) =>
    await sendMessage(
      `You cannot play ${card.toString()} on ${last(discardPile).toString()}!`
    ),
  notifyInvalidColor: async (_, { color }) =>
    await sendMessage(`${color} is not a valid color (R, G, B, or Y)`),
  notifySkipPlayer: async ({ activePlayer }) =>
    await sendMessage(`Skipping ${activePlayer.username}`),
  notifyPlay: async ({ activePlayer, discardPile }) => {
    const card = last(discardPile);

    return await sendMessage(
      new MessageEmbed()
        .setTitle(`${activePlayer.username} played ${card.toString()}!`)
        .setImage(card.toUrl())
    );
  },
  notifyDraw: async ({ activePlayer }) =>
    await sendMessage(`${activePlayer.username} drew a card!`),
  notifyPass: async ({ activePlayer }) =>
    await sendMessage(`${activePlayer.username} passed!`),
  notifyColorChange: async ({ color, activePlayer }) =>
    await sendMessage(
      `${activePlayer.username} chose ${CardColor.fromString(color)}!`
    ),
  notifyColorChangeNeeded: async ({ activePlayer }) =>
    await sendMessage(
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

    return await sendPrivateMessage(id, embed);
  }
};
