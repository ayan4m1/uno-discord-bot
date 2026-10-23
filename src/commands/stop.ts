import { SlashCommandBuilder } from 'discord.js';

import { isAdmin } from '../modules/discord.js';
import { createInteractionHandler } from '../modules/interaction.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stops an active game');

export const handler = createInteractionHandler((interaction) => {
  if (!isAdmin(interaction.member)) {
    interaction.reply('You cannot stop games.');
    return null;
  }

  return {
    id: 'gameStop',
    type: 'GAME_STOP'
  };
});
