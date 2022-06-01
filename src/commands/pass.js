import { SlashCommandBuilder } from '@discordjs/builders';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('pass')
  .setDescription('Pass your turn to the next player');

export const handler = createInteractionHandler(
  ({ user: { id, username } }) => ({
    type: 'PLAYER_PASS',
    id,
    username
  })
);
