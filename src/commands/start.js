import { SlashCommandBuilder } from '@discordjs/builders';

import { isAdmin } from '../modules/discord.js';
import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('start')
  .setDescription('Starts the game');

export const handler = (message) => {
  if (!isAdmin(message.member)) {
    return message.reply('You cannot start games.');
  }

  service.send('GAME_START');
};
