import { SlashCommandBuilder } from '@discordjs/builders';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Shows the current game status');

export const handler = createInteractionHandler(() => ({
  type: 'GAME_STATUS'
}));
