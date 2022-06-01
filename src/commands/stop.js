import { SlashCommandBuilder } from '@discordjs/builders';

import { isAdmin } from '../modules/discord.js';
import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stops an active game');

export const handler = (message) => {
  if (!isAdmin(message.member)) {
    return message.reply('You cannot stop games.');
  }

  service.send('GAME_STOP');
};
