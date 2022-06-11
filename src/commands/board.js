import { SlashCommandBuilder } from '@discordjs/builders';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('board')
  .setDescription('View the leaderboard');

export const handler = createInteractionHandler((interaction) => {
  const {
    user: { id }
  } = interaction;

  return {
    type: 'LEADERBOARD_REQUEST',
    id
  };
});
