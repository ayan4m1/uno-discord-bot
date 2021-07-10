import { interpret } from 'xstate';

import { Card } from 'modules/deck';
import { isAdmin } from 'modules/discord';
import { getLogger } from 'modules/logging';
import { createGame } from 'modules/uno';

const log = getLogger('uno');

const service = interpret(createGame(config));

service.start();

export default {
  start: (message) => {
    if (!isAdmin(message.member)) {
      return message.reply('You cannot start games.');
    }

    service.send('START');
  },
  stop: (message) => {
    if (!isAdmin(message.member)) {
      return message.reply('You cannot stop games.');
    }

    service.send('STOP');
  },
  status: (message) => {
    log.info(message);
  },
  join: ({ author: { id, username } }) =>
    service.send({
      type: 'PLAYER_ADD',
      id,
      username
    }),
  leave: ({ author: { id, username } }) =>
    service.send({
      type: 'PLAYER_REMOVE',
      id,
      username
    }),
  hand: ({ author: { id } }) =>
    service.send({
      type: 'HAND_REQUEST',
      id
    }),
  draw: ({ author: { id } }) =>
    service.send({
      type: 'CARD_DRAW',
      id
    }),
  play: ({ author: { id } }, [card]) =>
    service.send({
      type: 'CARD_PLAY',
      id,
      card: Card.fromString(card)
    }),
  color: ({ author: { id } }, [color]) =>
    service.send({
      type: 'COLOR_CHANGE',
      id,
      color
    })
};