import { negate, last } from 'lodash-es';
import type { ConditionPredicate } from 'xstate';

import type { GameContext, GameEvent } from '../types.js';
import { CardType, getCardColor } from '../modules/deck.js';
import type { Card } from '../modules/deck.js';

export default {
  canGameStart: ({ players }: GameContext) => players.length > 1,
  isGameActive: ({ hands }: GameContext) => Object.values(hands).length > 0,
  isGameOver: ({ hands }: GameContext) =>
    Object.values(hands).some((hand) => hand.length === 0),
  isTwoPlayerGame: ({ players }: GameContext) => players.length === 2,
  isDeckEmpty: ({ deck }: GameContext) => deck.length === 0,
  isPlayerInGame: ({ players }: GameContext, { id }: GameEvent) =>
    Boolean(players.find((player) => player.id === id)),
  isPlayerNotInGame: negate(({ players }: GameContext, { id }: GameEvent) =>
    Boolean(players.find((player) => player.id === id))
  ),
  isPlayerActive: ({ players, activePlayer }: GameContext, { id }: GameEvent) =>
    players.find((player) => player.id === activePlayer?.id)?.id === id,
  isPlayerInvalid: negate(
    ({ activePlayer }: GameContext, { id }: GameEvent) =>
      !activePlayer || activePlayer.id === id
  ),
  isCardMissing: negate(
    ({ activePlayer, hands }: GameContext, { card }: GameEvent) =>
      !activePlayer
        ? false
        : hands[activePlayer.id].some((handCard: Card) => handCard.equals(card))
  ),
  isCardInvalid: negate(
    ({ color, discardPile }: GameContext, { card }: GameEvent) => {
      const discard = last(discardPile);

      if (!discard || !card) {
        return true;
      }

      switch (discard.type) {
        case CardType.WILD:
        case CardType.WILD_DRAW:
          return (
            card?.color === color ||
            card?.type === CardType.WILD ||
            card?.type === CardType.WILD_DRAW
          );
        default:
          return discard.validPlay(card);
      }
    }
  ),
  isColorInvalid: negate((_, { color }: GameEvent) =>
    Boolean(getCardColor(color))
  ),
  isColorChangeNeeded: ({ discardPile }: GameContext) => {
    const discard = last(discardPile);

    if (!discard || !discard.type) {
      return false;
    }

    return [CardType.WILD_DRAW, CardType.WILD].includes(discard.type);
  },
  isPassInvalid: negate(
    ({ activePlayer, lastDrawPlayer }: GameContext) =>
      activePlayer?.id === lastDrawPlayer?.id
  ),
  isSpecialCardPlayed: ({ discardPile }: GameContext) => {
    const discard = last(discardPile);

    if (!discard || !discard.type) {
      return false;
    }

    return [
      CardType.WILD_DRAW,
      CardType.WILD,
      CardType.DRAW,
      CardType.SKIP,
      CardType.REVERSE
    ].includes(discard.type);
  },
  playerHasUno: ({ hands, activePlayer }: GameContext) =>
    !activePlayer || hands[activePlayer.id].length === 1
} satisfies Record<string, ConditionPredicate<GameContext, GameEvent>>;
