import { SlashCommandBuilder } from '@discordjs/builders';

import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('pass')
  .setDescription('Pass your turn to the next player');

export const handler = ({ author: { id, username } }) =>
  service.send({
    type: 'PLAYER_PASS',
    id,
    username
  });
