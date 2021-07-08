import { interpret } from 'xstate';

import { uno as config } from 'modules/config';
import { getLogger } from 'modules/logging';
import { createGame } from 'modules/uno';
import { isAdmin } from 'modules/discord';

const log = getLogger('uno');

const service = interpret(createGame(config));

service.start();

export default {
  start: (message) => {
    if (!isAdmin(message.member)) {
      return message.reply('You cannot start games.');
    }

    service.send({ type: 'START' });
  },
  stop: (message) => {
    if (!isAdmin(message.member)) {
      return message.reply('You cannot stop games.');
    }

    service.send({ type: 'STOP' });
  },
  status: (message) => {
    log.info(message);
  },
  join: ({ author: { id, username } }) => {
    service.send({
      type: 'PLAYER_ADD',
      id,
      username
    });
  },
  leave: ({ author: { id, username } }) => {
    service.send({
      type: 'PLAYER_REMOVE',
      id,
      username
    });
  },
  hand: async ({ author: { id } }) => {
    service.send({
      type: 'PLAYER_REQUEST_HAND',
      id
    });
  }
};
