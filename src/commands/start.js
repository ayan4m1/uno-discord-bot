import { SlashCommandBuilder } from '@discordjs/builders';

import { createInteractionHandler, isAdmin } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Starts the game');

export const handler = createInteractionHandler((interaction) => {
  if (!isAdmin(interaction.member)) {
    interaction.reply('You cannot start games.');
    return null;
  }

  return {
    type: 'GAME_START'
  };
});
