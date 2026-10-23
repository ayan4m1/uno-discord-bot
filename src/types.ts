import type { ChatInputCommandInteraction, User } from 'discord.js';
import type { EventObject } from 'xstate';

import type { Card, CardColor } from './modules/deck.js';

export type Player = Pick<User, 'id' | 'username'>;

export type GameContext = {
  deck: Card[];
  discardPile: Card[];
  hands: {
    [playerId: string]: Card[];
  };
  players: Player[];
  color?: CardColor;
  activePlayer?: Player;
  lastDrawPlayer?: Player;
  gameId?: bigint;
};

export type GameEvent = EventObject & {
  id?: string;
  card?: Card;
  interaction?: ChatInputCommandInteraction;
  ephemeral?: boolean;
  username?: string;
  color?: CardColor;
};
