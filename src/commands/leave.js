import { SlashCommandBuilder } from '@discordjs/builders';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('Leaves an active or pending game');

export const handler = createInteractionHandler(
  ({ user: { id, username } }) => ({
    type: 'PLAYER_REMOVE',
    id,
    username
  })
);
