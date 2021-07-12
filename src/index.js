import { interpret } from 'xstate';

import { createGame } from 'modules/game';
import { connectBot, registerCommands, isAdmin } from 'modules/discord';
import { getLogger } from 'modules/logging';
import { Card } from 'modules/deck';

const log = getLogger('game');

const service = interpret(createGame()).onTransition((state) =>
  log.debug(JSON.stringify(state.context, null, 2))
);

service.start();

registerCommands({
  start: (message) => {
    if (!isAdmin(message.member)) {
      return message.reply('You cannot start games.');
    }

    service.send('GAME_START');
  },
  stop: (message) => {
    if (!isAdmin(message.member)) {
      return message.reply('You cannot stop games.');
    }

    service.send('GAME_STOP');
  },
  status: () => service.send('STATUS_SEND'),
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
  pass: ({ author: { id, username } }) =>
    service.send({
      type: 'PLAYER_PASS',
      id,
      username
    }),
  color: ({ author: { id } }, [color]) =>
    service.send({
      type: 'COLOR_CHANGE',
      id,
      color
    })
});

connectBot();
