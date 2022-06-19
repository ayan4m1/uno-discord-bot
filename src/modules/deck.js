import { uno as config } from './config.js';

export const HandSize = 7;
export const WildDrawSize = 4;
export const DrawSize = 2;

export const CardType = {
  NUMBER: 'number',
  WILD: 'wild',
  WILD_DRAW: 'wildDraw',
  SKIP: 'skip',
  DRAW: 'draw',
  REVERSE: 'reverse'
};

export const CardColor = {
  RED: 'Red',
  YELLOW: 'Yellow',
  GREEN: 'Green',
  BLUE: 'Blue'
};

export const hexColors = {
  [CardColor.RED]: '#ff0000',
  [CardColor.BLUE]: '#0000ff',
  [CardColor.GREEN]: '#00ff00',
  [CardColor.YELLOW]: '#ffff00'
};

export const getCardColor = (str) =>
  Object.values(CardColor).find(
    (val) => val?.toUpperCase?.()[0] === str?.trim?.()?.toUpperCase?.()[0]
  );

/**
 * Represents an individual game card.
 */
export class Card {
  value = null;
  color = null;
  type = null;

  /**
   * Constructs a card given a string identifier (e.g. "YS" or "G1").
   * @param {*} source Card string
   * @returns {Card|null} Card instance, or null if an invalid string was supplied
   */
  static fromString(source) {
    const result = new Card();
    const tokens = source.trim().toUpperCase().split('');

    if (tokens.length !== 2) {
      if (tokens[0] === 'W') {
        result.type = CardType.WILD;
        return result;
      } else {
        return null;
      }
    }

    if (tokens[0] === 'W' && tokens[1] === 'D') {
      result.type = CardType.WILD_DRAW;
      return result;
    }

    result.color = getCardColor(tokens[0]);

    switch (tokens[1]) {
      case 'D':
        result.type = CardType.DRAW;
        break;
      case 'S':
        result.type = CardType.SKIP;
        break;
      case 'R':
        result.type = CardType.REVERSE;
        break;
      default:
        result.type = CardType.NUMBER;
        result.value = parseInt(tokens[1], 10);
        break;
    }

    return result;
  }

  /**
   * Constructs a card given an index between 0 and 107.
   *
   * @param {*} index Index in the deck
   * @returns {Card|null} Card instance, or null if an invalid index was supplied
   */
  static fromIndex(index = 0) {
    const result = new Card();

    if (index > 107 || index < 0) {
      return null;
    } else if (index > 103) {
      result.type = CardType.WILD_DRAW;
      return result;
    } else if (index > 99) {
      result.type = CardType.WILD;
      return result;
    }

    const colorIndex = Math.floor(index / 25);
    const valueIndex = index % 25;

    result.type = CardType.NUMBER;
    result.color = [
      CardColor.RED,
      CardColor.YELLOW,
      CardColor.GREEN,
      CardColor.BLUE
    ][colorIndex];

    if (valueIndex < 10) {
      result.value = valueIndex;
    } else if (valueIndex < 19) {
      result.value = valueIndex - 9;
    } else {
      const typeIndex = (valueIndex - 19) % 3;

      result.type = [CardType.SKIP, CardType.DRAW, CardType.REVERSE][typeIndex];
    }

    return result;
  }

  /**
   * Returns a single character code representing the card color.
   */
  get colorCode() {
    return (this.color || '').substring(0, 1).toUpperCase();
  }

  /**
   * Returns one or two characters representing the card value/type.
   */
  get cardCode() {
    switch (this.type) {
      case CardType.WILD_DRAW:
        return 'WD';
      case CardType.WILD:
        return 'W';
      case CardType.SKIP:
        return 'S';
      case CardType.DRAW:
        return 'D';
      case CardType.REVERSE:
        return 'R';
      case CardType.NUMBER:
      default:
        return this.value;
    }
  }

  toUrl(size = 'S') {
    return `${config.cardBaseUrl}${this.toString()}_${size}.png`;
  }

  /**
   * Returns a shorthand string representation of the card.
   * @returns {string} describing the card
   */
  toString() {
    return `${this.colorCode}${this.cardCode}`;
  }

  /**
   * Compares one card to another, for sorting.
   * @param {*} other The other card
   * @returns 0 if cards are equal, -1 or 1 otherwise depending on their relative order
   */
  compareTo(other) {
    if (this.equals(other)) {
      return 0;
    } else {
      return this.color?.toUpperCase?.() > other?.color?.toUpperCase?.()
        ? 1
        : -1;
    }
  }

  /**
   * Determines if the supplied card is the same as this one.
   * @param {Card} other The card to compare to
   * @returns {boolean} True if the card is the same, false otherwise
   */
  equals(other) {
    return (
      this.type === other?.type &&
      this.color === other?.color &&
      this.value === other?.value
    );
  }

  /**
   * Determines if the supplied card is able to be played on top of this one.
   * @param {Card} other The card to compare to
   * @returns {boolean} True if the card can be played, false otherwise
   */
  validPlay(other) {
    if (!other.type) {
      return false;
    }

    switch (other.type) {
      case CardType.WILD_DRAW:
      case CardType.WILD:
        return true;
      case CardType.NUMBER:
        return this.color === other.color || this.value === other.value;
      default:
        return this.color === other.color || this.type === other.type;
    }
  }
}

/**
 * Create a complete game deck.
 * @returns {Array<Card>} Array of Card objects
 */
export const createDeck = () =>
  Array(108)
    .fill(undefined)
    .map((_, index) => Card.fromIndex(index));

export const createContext = () => ({
  deck: createDeck(),
  color: null,
  discardPile: [],
  hands: {},
  players: [],
  activePlayer: null,
  lastDrawPlayer: null,
  gameId: null
});

const scoreCard = (card) => {
  switch (card.type) {
    case CardType.NUMBER:
      return card.value;
    default:
      return 50;
  }
};

export const scoreHand = (hand) =>
  hand.reduce((score, card) => score + scoreCard(card), 0);
