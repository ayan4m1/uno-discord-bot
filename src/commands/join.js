import { SlashCommandBuilder } from '@discordjs/builders';

import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('join')
  .setDescription('Joins a pending game');

export const handler = ({ author: { id, username } }) =>
  service.send({
    type: 'PLAYER_ADD',
    id,
    username
  });
