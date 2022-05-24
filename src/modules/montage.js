import { basename } from 'path';
import gm from 'gm';

export const createCardMontage = (cards) =>
  new Promise((resolve, reject) => {
    const images = cards.map(
      (card) => `./src/assets/${basename(card.toUrl('M'))}`
    );

    const [firstImage, ...otherImages] = images;

    let operation = gm(firstImage);

    for (const image of otherImages) {
      operation = operation.montage(image);
    }

    operation
      .tile('x10')
      .geometry('128x186+2+2>')
      .toBuffer('PNG', (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
  });
