import { negate, last } from 'lodash-es';

import { CardType, getCardColor } from '../modules/deck.js';

export default {
  canGameStart: ({ players }) => players.length > 1,
  isGameActive: ({ hands }) => Object.values(hands).length > 0,
  isGameOver: ({ hands }) =>
    Object.values(hands).some((hand) => hand.length === 0),
  isOnePlayerGame: ({ players }) => players.length === 1,
  isDeckEmpty: ({ deck }) => deck.length === 0,
  isPlayerInGame: ({ players }, { id }) =>
    Boolean(players.find((player) => player.id === id)),
  isPlayerNotInGame: negate(({ players }, { id }) =>
    Boolean(players.find((player) => player.id === id))
  ),
  isPlayerActive: ({ players, activePlayer }, { id }) =>
    players.find((player) => player.id === activePlayer.id).id === id,
  isPlayerInvalid: negate(({ activePlayer }, { id }) => activePlayer.id === id),
  isCardMissing: negate(({ activePlayer, hands }, { card }) =>
    hands[activePlayer.id].some((handCard) => handCard.equals(card))
  ),
  isCardInvalid: negate(({ color, discardPile }, { card }) => {
    const discard = last(discardPile);

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
  }),
  isColorInvalid: negate((_, { color }) => Boolean(getCardColor(color))),
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
    ].includes(last(discardPile).type),
  playerHasUno: ({ hands, activePlayer }) => hands[activePlayer.id].length === 1
};
