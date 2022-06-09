import { PrismaClient } from '@prisma/client';

import { getLogger } from './logging.js';

const log = getLogger();
const prisma = new PrismaClient();

export const mergeUser = async (user) => {
  try {
    const id = await prisma.user.findUnique({ where: { id: user.id } });

    if (id) {
      await prisma.user.update({
        where: {
          id
        },
        data: {
          username: user.username,
          nickname: user.nickname
        }
      });
    } else {
      await prisma.user.create({
        data: user
      });
    }
  } catch (error) {
    log.error(error);
  }
};
