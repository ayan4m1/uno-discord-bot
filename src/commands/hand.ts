import { SlashCommandBuilder } from 'discord.js';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('hand')
  .setDescription('Messages you your current hand');

export const handler = createInteractionHandler(({ user: { id } }) => ({
  type: 'HAND_REQUEST',
  id,
  ephemeral: true
}));
