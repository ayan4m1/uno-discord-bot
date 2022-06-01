import { SlashCommandBuilder } from '@discordjs/builders';

import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('draw')
  .setDescription('Draws a card from the discard pile');

export const handler = ({ author: { id } }) =>
  service.send({
    type: 'CARD_DRAW',
    id
  });
