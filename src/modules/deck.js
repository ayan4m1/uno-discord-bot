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
  BLUE: 'Blue',
  fromString: (str) => Object.values(CardColor).find((val) => val[0] === str)
};

export class Card {
  value = null;
  color = null;
  type = null;

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

    result.color = CardColor.fromString(tokens[0]);

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

  /**
   * Returns a shorthand string representation of the card.
   * @returns String describing the card
   */
  toString() {
    return `${this.colorCode}${this.cardCode}`;
  }

  equals(other) {
    return (
      this.type === other.type &&
      this.color === other.color &&
      this.value === other.value
    );
  }

  validPlay(other) {
    switch (other.type) {
      case CardType.WILD_DRAW:
      case CardType.WILD:
        return true;
      case CardType.NUMBER:
        return this.color === other.color || this.value === other.value;
      default:
        return this.color === other.color;
    }
  }
}

export const createDeck = () =>
  Array(108)
    .fill(undefined)
    .map((_, index) => Card.fromIndex(index));