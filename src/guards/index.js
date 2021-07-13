import { negate, last } from 'lodash';

import { CardType, CardColor } from 'modules/deck';

export default {
  canGameStart: ({ players }) => players.length > 0,
  isGameOver: ({ hands }) =>
    Object.values(hands).some((hand) => hand.length === 0),
  isPlayerInvalid: negate(({ activePlayer }, { id }) => activePlayer.id === id),
  isCardMissing: negate(({ activePlayer, hands }, { card }) => {
    const hand = hands[activePlayer.id];

    return hand.some((handCard) => handCard.equals(card));
  }),
  isCardInvalid: negate(({ color, discardPile }, { card }) => {
    const discard = last(discardPile);

    switch (discard.type) {
      case CardType.WILD:
      case CardType.WILD_DRAW:
        return card.color === color;
      default:
        return discard.validPlay(card);
    }
  }),
  isColorInvalid: negate((_, { color }) =>
    Boolean(CardColor.fromString(color))
  ),
  isColorChangeNeeded: (_, { card }) =>
    [CardType.WILD_DRAW, CardType.WILD].includes(card.type),
  isPassInvalid: negate(
    ({ activePlayer, lastDrawPlayer }) => activePlayer.id === lastDrawPlayer?.id
  ),
  isSpecialCardPlayed: (_, { card }) =>
    [
      CardType.WILD_DRAW,
      CardType.WILD,
      CardType.DRAW,
      CardType.SKIP,
      CardType.REVERSE
    ].includes(card.type)
};
