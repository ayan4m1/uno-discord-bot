import { basename } from 'path';
import canvas from 'canvas';

const { createCanvas, loadImage } = canvas;
const maxColumns = 10;
const cardWidth = 64;
const cardHeight = 93;
const cardPadding = 4;
const paddedWidth = cardWidth + cardPadding * 2;
const paddedHeight = cardHeight + cardPadding * 2;

export const createCardMontage = async (cards) => {
  const images = await Promise.all(
    cards.map((card) => loadImage(`./src/assets/${basename(card.toUrl('M'))}`))
  );

  const width = (images.length % maxColumns) * paddedWidth;
  const height = Math.ceil(images.length / maxColumns) * paddedHeight;

  const img = createCanvas(width, height);
  const ctx = img.getContext('2d');

  let i = 0;

  for (const image of images) {
    const row = Math.floor(i / maxColumns);
    const col = i % maxColumns;

    ctx.drawImage(
      image,
      col * paddedWidth,
      row * paddedHeight,
      cardWidth,
      cardHeight
    );
    i++;
  }

  return new Promise((resolve, reject) => {
    const buffers = [];
    const stream = img.createPNGStream();

    stream.on('error', reject);
    stream.on('data', (chunk) => buffers.push(chunk));
    stream.on('end', () =>
      resolve({
        height,
        width,
        buffer: Buffer.concat(buffers)
      })
    );
  });
};
