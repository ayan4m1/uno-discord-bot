import { SlashCommandBuilder } from '@discordjs/builders';

import { Card } from '../modules/deck.js';
import { service } from '../modules/game.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Plays a card from your hand');

export const handler = ({ author: { id } }, [card]) =>
  service.send({
    type: 'CARD_PLAY',
    id,
    card: Card.fromString(card)
  });
