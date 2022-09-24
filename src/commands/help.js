import { SlashCommandBuilder } from 'discord.js';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Messages you command/gameplay help');

export const handler = createInteractionHandler(() => ({
  type: 'HELP_REQUEST',
  ephemeral: true
}));
