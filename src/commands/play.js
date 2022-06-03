import { SlashCommandBuilder } from '@discordjs/builders';

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

  return {
    type: 'CARD_PLAY',
    id,
    card: Card.fromString(options.getString('card', true))
  };
});
