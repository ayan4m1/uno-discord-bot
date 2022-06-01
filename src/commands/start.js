import { SlashCommandBuilder } from '@discordjs/builders';

import { createInteractionHandler, isAdmin } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Starts the game');

export const handler = createInteractionHandler((interaction) => {
  if (!isAdmin(interaction.member)) {
    interaction.editReply('You cannot start games.');
    return {};
  }

  return {
    type: 'GAME_START'
  };
});
