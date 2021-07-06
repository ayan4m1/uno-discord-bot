import { interpret } from 'xstate';

import { uno as config } from 'modules/config';
import { getLogger } from 'modules/logging';
import { createGame } from 'modules/uno';
import { isAdmin } from 'modules/discord';

const log = getLogger('uno');

const service = interpret(createGame(config));

service.start();

const handleStart = async (message) => {
  if (!isAdmin(message.member)) {
    return message.reply('You cannot start games.');
  }

  service.send({ type: 'START' });
};
const handleStop = async (message) => {
  if (!isAdmin(message.member)) {
    return message.reply('You cannot stop games.');
  }

  service.send({ type: 'STOP' });
};
const handleStatus = async (message) => {
  log.info(message);
};
const handleJoin = async (message) => {
  const {
    author: { id, username }
  } = message;

  service.send({
    type: 'PLAYER_ADD',
    id,
    username
  });
};
const handleLeave = async (message) => {
  const {
    author: { id, username }
  } = message;

  service.send({
    type: 'PLAYER_REMOVE',
    id,
    username
  });
};

export default {
  help: '!uno <start|stop|status|join|leave>',
  commands: {
    start: {
      help: '!uno start',
      handler: handleStart
    },
    stop: {
      help: '!uno stop',
      handler: handleStop
    },
    status: {
      help: '!uno status',
      handler: handleStatus
    },
    join: {
      help: '!uno join',
      handler: handleJoin
    },
    leave: {
      help: '!uno leave',
      handler: handleLeave
    }
  }
};
