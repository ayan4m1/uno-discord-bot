import { SlashCommandBuilder } from '@discordjs/builders';

import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Shows the current game status');

export const handler = () => service.send('GAME_STATUS');
