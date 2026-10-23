import { SlashCommandBuilder } from 'discord.js';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('Leaves a game');

export const handler = createInteractionHandler(
  ({ user: { id, username } }) => ({
    type: 'PLAYER_REMOVE',
    id,
    username
  })
);
