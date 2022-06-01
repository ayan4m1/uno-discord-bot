import { SlashCommandBuilder } from '@discordjs/builders';

import { createInteractionHandler, isAdmin } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stops an active game');

export const handler = createInteractionHandler((interaction) => {
  if (!isAdmin(interaction.member)) {
    interaction.editReply('You cannot stop games.');
    return {};
  }

  return {
    type: 'GAME_STOP'
  };
});
