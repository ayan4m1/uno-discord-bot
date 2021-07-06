export const CardType = {
  NUMBER: 'number',
  WILD: 'wild',
  WILD_DRAW_FOUR: 'wildDrawFour',
  SKIP: 'skip',
  DRAW_TWO: 'drawTwo',
  REVERSE: 'reverse'
};

export const CardColor = {
  RED: 'Red',
  YELLOW: 'Yellow',
  GREEN: 'Green',
  BLUE: 'Blue'
};

class Card {
  value = null;
  color = null;
  type = null;

  /**
   * Constructs a card given an index between 0 and 107.
   *
   * @param {*} index Index in the deck
   */
  constructor(index) {
    if (index > 103) {
      this.type = CardType.WILD_DRAW_FOUR;
      return;
    } else if (index > 99) {
      this.type = CardType.WILD;
      return;
    }

    const colorIndex = Math.floor(index / 25);
    const valueIndex = index % 25;

    this.type = CardType.NUMBER;
    this.color = [
      CardColor.RED,
      CardColor.YELLOW,
      CardColor.GREEN,
      CardColor.BLUE
    ][colorIndex];

    if (valueIndex < 10) {
      this.value = valueIndex;
    } else if (valueIndex < 19) {
      this.value = valueIndex - 9;
    } else {
      const typeIndex = (valueIndex - 19) % 3;

      this.type = [CardType.SKIP, CardType.DRAW_TWO, CardType.REVERSE][
        typeIndex
      ];
    }
  }

  /**
   * Returns a single character code representing the card color.
   */
  get colorCode() {
    return this.color.substring(0, 1).toUpperCase();
  }

  /**
   * Returns a shorthand string representation of the card.
   * @returns String describing the card
   */
  toString() {
    switch (this.type) {
      case CardType.WILD_DRAW_FOUR:
        return 'WD4';
      case CardType.WILD:
        return 'W';
      case CardType.SKIP:
        return `${this.colorCode}S`;
      case CardType.DRAW_TWO:
        return `${this.colorCode}D2`;
      case CardType.REVERSE:
        return `${this.colorCode}R`;
      case CardType.NUMBER:
      default:
        return `${this.colorCode}${this.value}`;
    }
  }
}

export const createDeck = () =>
  Array(108)
    .fill(undefined)
    .map((_, index) => new Card(index));
