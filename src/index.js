import { interpret } from 'xstate';

import { createGame } from './modules/game.js';
import { connectBot, registerCommands, isAdmin } from './modules/discord.js';
import { Card, getCardColor } from './modules/deck.js';
import { getLogger } from './modules/logging.js';

const log = getLogger('game');

const service = interpret(createGame()).onTransition((state) => {
  log.debug(JSON.stringify(state.context, null, 2));
});

service.start();

registerCommands({
  start: {
    aliases: ['str', 'strt'],
    handler: (message) => {
      if (!isAdmin(message.member)) {
        return message.reply('You cannot start games.');
      }

      service.send('GAME_START');
    }
  },
  stop: {
    aliases: ['stp', 'sto'],
    handler: (message) => {
      if (!isAdmin(message.member)) {
        return message.reply('You cannot stop games.');
      }

      service.send('GAME_STOP');
    }
  },
  status: {
    aliases: ['sta', 'stat', 'stats'],
    handler: () => service.send('GAME_STATUS')
  },
  join: {
    aliases: ['j', 'jo', 'jn'],
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
    aliases: ['pa', 'pas'],
    handler: ({ author: { id, username } }) =>
      service.send({
        type: 'PLAYER_PASS',
        id,
        username
      })
  },
  color: {
    aliases: ['c', 'co', 'col', 'clr'],
    handler: ({ author: { id } }, [color]) =>
      service.send({
        type: 'COLOR_CHANGE',
        id,
        color: getCardColor(color)
      })
  }
});

connectBot();
