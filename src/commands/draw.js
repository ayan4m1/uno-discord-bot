import { SlashCommandBuilder } from '@discordjs/builders';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('draw')
  .setDescription('Draws a card from the discard pile');

export const handler = createInteractionHandler(({ user: { id } }) => ({
  type: 'PLAYER_DRAW',
  id
}));
