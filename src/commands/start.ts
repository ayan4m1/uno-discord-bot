import { SlashCommandBuilder } from 'discord.js';

import { isAdmin } from '../modules/discord.js';
import { createInteractionHandler } from '../modules/interaction.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Starts the game');

export const handler = createInteractionHandler((interaction) => {
  if (!isAdmin(interaction.member)) {
    interaction.reply('You cannot start games.');
    return null;
  }

  return {
    id: 'gameStart',
    type: 'GAME_START'
  };
});
