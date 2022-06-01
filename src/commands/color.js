import { SlashCommandBuilder } from '@discordjs/builders';

import { getCardColor } from '../modules/deck.js';
import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('color')
  .setDescription('Changes the active color');

export const handler = ({ author: { id } }, [color]) =>
  service.send({
    type: 'COLOR_CHANGE',
    id,
    color: getCardColor(color)
  });
