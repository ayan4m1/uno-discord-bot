import { interpret } from 'xstate';

import { createGame } from 'modules/game';
import { connectBot, registerCommands, isAdmin } from 'modules/discord';
import { getLogger } from 'modules/logging';
import { Card, CardColor } from 'modules/deck';

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
  status: () => service.send('GAME_STATUS'),
  join: {
    aliases: ['j', 'jo'],
    handler: ({ author: { id, username } }) =>
      service.send({
        type: 'PLAYER_ADD',
        id,
        username
      })
  },
  leave: {
    aliases: ['l', 'lv'],
    handler: ({ author: { id, username } }) =>
      service.send({
        type: 'PLAYER_REMOVE',
        id,
        username
      })
  },
  hand: {
    aliases: ['h', 'hd', 'hnd'],
    handler: ({ author: { id } }) =>
      service.send({
        type: 'HAND_REQUEST',
        id
      })
  },
  draw: {
    aliases: ['d', 'dr', 'drw'],
    handler: ({ author: { id } }) =>
      service.send({
        type: 'CARD_DRAW',
        id
      })
  },
  play: {
    aliases: ['pl', 'ply'],
    handler: ({ author: { id } }, [card]) =>
      service.send({
        type: 'CARD_PLAY',
        id,
        card: Card.fromString(card)
      })
  },
  pass: {
    aliases: ['pa'],
    handler: ({ author: { id, username } }) =>
      service.send({
        type: 'PLAYER_PASS',
        id,
        username
      })
  },
  color: {
    aliases: ['c', 'col', 'clr'],
    handler: ({ author: { id } }, [color]) =>
      service.send({
        type: 'COLOR_CHANGE',
        id,
        color: CardColor.fromString(color)
      })
  }
});

connectBot();
