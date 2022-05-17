import { negate, last } from 'lodash-es';

import { uno as config } from '../modules/config.js';
import { CardType, CardColor } from '../modules/deck.js';

export default {
  // debugMode allows game to start with 1 player
  canGameStart: ({ players }) => players.length > (config.debugMode ? 0 : 1),
  isGameOver: ({ hands }) =>
    Object.values(hands).some((hand) => hand.length === 0),
  isPlayerInvalid: negate(({ activePlayer }, { id }) => activePlayer.id === id),
  isCardMissing: negate(({ activePlayer, hands }, { card }) =>
    hands[activePlayer.id].some((handCard) => handCard.equals(card))
  ),
  isCardInvalid: negate(({ color, discardPile }, { card }) => {
    const discard = last(discardPile);

    switch (discard.type) {
      case CardType.WILD:
      case CardType.WILD_DRAW:
        return card?.color === color;
      default:
        return discard.validPlay(card);
    }
  }),
  isColorInvalid: negate((_, { color }) =>
    Boolean(CardColor.fromString(color))
  ),
  isColorChangeNeeded: ({ discardPile }) =>
    [CardType.WILD_DRAW, CardType.WILD].includes(last(discardPile).type),
  isPassInvalid: negate(
    ({ activePlayer, lastDrawPlayer }) => activePlayer.id === lastDrawPlayer?.id
  ),
  isSpecialCardPlayed: ({ discardPile }) =>
    [
      CardType.WILD_DRAW,
      CardType.WILD,
      CardType.DRAW,
      CardType.SKIP,
      CardType.REVERSE
    ].includes(last(discardPile).type)
};
