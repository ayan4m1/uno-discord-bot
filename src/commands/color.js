import { SlashCommandBuilder } from '@discordjs/builders';

import { createInteractionHandler } from '../modules/discord.js';
import { getCardColor } from '../modules/deck.js';

export const data = new SlashCommandBuilder()
  .setName('color')
  .setDescription('Changes the active color')
  .addStringOption((option) =>
    option
      .setName('color')
      .setDescription('Color to change to')
      .addChoices(
        { name: 'Green', value: 'G' },
        { name: 'Red', value: 'R' },
        { name: 'Blue', value: 'B' },
        { name: 'Yellow', value: 'Y' }
      )
  );

export const handler = createInteractionHandler((interaction) => {
  const {
    user: { id }
  } = interaction;

  return {
    type: 'COLOR_CHANGE',
    id,
    color: getCardColor(interaction.options.getString('color', true))
  };
});