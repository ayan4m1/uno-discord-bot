import { SlashCommandBuilder } from '@discordjs/builders';

import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('hand')
  .setDescription('Messages you your current hand');

export const handler = ({ author: { id } }) =>
  service.send({
    type: 'HAND_REQUEST',
    id
  });
