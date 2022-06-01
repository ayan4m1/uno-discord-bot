import { SlashCommandBuilder } from '@discordjs/builders';

import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('Leaves an active or pending game');

export const handler = ({ author: { id, username } }) =>
  service.send({
    type: 'PLAYER_REMOVE',
    id,
    username
  });
