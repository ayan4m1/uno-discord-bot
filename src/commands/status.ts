import { SlashCommandBuilder } from 'discord.js';

import { createInteractionHandler } from '../modules/interaction.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Shows the current game status');

export const handler = createInteractionHandler(() => ({
  id: 'gameStatus',
  type: 'GAME_STATUS'
}));
