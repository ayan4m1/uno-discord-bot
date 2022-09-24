import { SlashCommandBuilder } from 'discord.js';

import { Card } from '../modules/deck.js';
import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Plays a card from your hand')
  .addStringOption((option) =>
    option.setName('card').setDescription('Card to play').setRequired(true)
  );

export const handler = createInteractionHandler((interaction) => {
  const {
    user: { id },
    options
  } = interaction;

  const card = Card.fromString(options.getString('card', true));

  if (!card) {
    interaction.reply('Invalid card!');
    return null;
  }

  return {
    type: 'CARD_PLAY',
    id,
    card
  };
});
