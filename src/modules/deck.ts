import { uno as config } from './config.js';

export const HandSize = 7;
export const WildDrawSize = 4;
export const DrawSize = 2;

export enum CardType {
  NUMBER = 'number',
  WILD = 'wild',
  WILD_DRAW = 'wildDraw',
  SKIP = 'skip',
  DRAW = 'draw',
  REVERSE = 'reverse'
}

export enum CardColor {
  RED = 'Red',
  YELLOW = 'Yellow',
  GREEN = 'Green',
  BLUE = 'Blue'
}

export const hexColors: Record<CardColor, number> = {
  [CardColor.RED]: 0xff0000,
  [CardColor.BLUE]: 0x0000ff,
  [CardColor.GREEN]: 0x00ff00,
  [CardColor.YELLOW]: 0xffff00
};

export const getCardColor = (str?: string) =>
  Object.values(CardColor).find(
    (val) => val?.toUpperCase?.()[0] === str?.trim?.()?.toUpperCase?.()[0]
  );

/**
 * Represents an individual game card.
 */
export class Card {
  value?: number;
  color?: CardColor;
  type?: CardType;

  /**
   * Constructs a card given a string identifier (e.g. "YS" or "G1").
   * @param {string} source Card string
   * @returns {Card|null} Card instance, or null if an invalid string was supplied
   */
  static fromString(source: string): Card | null {
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
   * @param {number} index Index in the deck
   * @returns {Card|null} Card instance, or null if an invalid index was supplied
   */
  static fromIndex(index: number = 0): Card | null {
    const result = new Card();

    // four wild draw, four wild
    if (index > 107 || index < 0) {
      return null;
    } else if (index > 103) {
      result.type = CardType.WILD_DRAW;
      return result;
    } else if (index > 99) {
      result.type = CardType.WILD;
      return result;
    }

    // 25 cards of each color
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
      // handle 0-9
      result.value = valueIndex;
    } else if (valueIndex < 19) {
      // handle 10-19 (0-9 again)
      result.value = valueIndex - 9;
    } else {
      // handle special cards
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
  get cardCode(): string {
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
        return String(this.value ?? '');
    }
  }

  toUrl(size = 'S') {
    return `${config.cardBaseUrl}${this.toString()}_${size}.png`;
  }

  /**
   * Returns a shorthand string representation of the card.
   * @returns {string} describing the card
   */
  toString(): string {
    return `${this.colorCode}${this.cardCode}`;
  }

  /**
   * Compares one card to another, for sorting.
   * @param {Card} other The other card
   * @returns {number} 0 if cards are equal, -1 or 1 otherwise depending on their relative order
   */
  compareTo(other: Card): number {
    if (this.equals(other)) {
      return 0;
    } else {
      return (this.color?.toUpperCase?.() ?? '') >
        (other?.color?.toUpperCase?.() ?? '')
        ? 1
        : -1;
    }
  }

  /**
   * Determines if the supplied card is the same as this one.
   * @param {Card} other The card to compare to
   * @returns {boolean} True if the card is the same, false otherwise
   */
  equals(other?: Card): boolean {
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
  validPlay(other: Card): boolean {
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
export const createDeck = (): Array<Card> =>
  Array(108)
    .fill(undefined)
    .flatMap((_, index) => {
      const card = Card.fromIndex(index);

      if (card) {
        return [card];
      } else {
        return [];
      }
    });

export const createContext = () => ({
  deck: createDeck(),
  discardPile: [] as Card[],
  hands: {} as Record<string, Card[]>,
  players: []
});

const scoreCard = (card: Card) => {
  switch (card.type) {
    case CardType.NUMBER:
      return card.value ?? 0;
    case CardType.DRAW:
    case CardType.SKIP:
    case CardType.REVERSE:
      return 10;
    case CardType.WILD:
      return 25;
    case CardType.WILD_DRAW:
    default:
      return 50;
  }
};

export const scoreHand = (hand: Card[]) =>
  hand.reduce((score, card) => score + scoreCard(card), 0);
