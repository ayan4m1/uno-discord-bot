import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';

import { createInteractionHandler } from '../modules/interaction.js';

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
