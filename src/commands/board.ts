import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

import { createInteractionHandler } from '../modules/discord.js';

export const data = new SlashCommandBuilder()
  .setName('board')
  .setDescription('View the leaderboard');

export const handler = createInteractionHandler(
  (interaction: ChatInputCommandInteraction) => {
    const {
      user: { id }
    } = interaction;

    return {
      type: 'LEADERBOARD_REQUEST',
      id
    };
  }
);
