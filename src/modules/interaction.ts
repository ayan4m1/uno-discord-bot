import type { ChatInputCommandInteraction } from 'discord.js';

import { service } from './game.js';
import type { GameEvent } from '../types.js';

export const createInteractionHandler =
  (handler: (interaction: ChatInputCommandInteraction) => GameEvent | null) =>
  async (interaction: ChatInputCommandInteraction) => {
    const event = handler(interaction);

    if (!event) {
      return;
    }

    await interaction.deferReply({ ephemeral: event.ephemeral });
    service.send({ ...event, interaction });
  };
