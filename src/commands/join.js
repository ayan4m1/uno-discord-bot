import { SlashCommandBuilder } from 'discord.js';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('join')
  .setDescription('Joins a pending game');

export const handler = createInteractionHandler(
  ({ user: { id, username } }) => ({
    type: 'PLAYER_ADD',
    id,
    username
  })
);
