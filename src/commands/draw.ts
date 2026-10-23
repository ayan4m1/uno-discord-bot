import { SlashCommandBuilder } from 'discord.js';

import { createInteractionHandler } from '../modules/interaction.js';

export const data = new SlashCommandBuilder()
  .setName('draw')
  .setDescription('Draws a card from the discard pile');

export const handler = createInteractionHandler(({ user: { id } }) => ({
  type: 'PLAYER_DRAW',
  id
}));
