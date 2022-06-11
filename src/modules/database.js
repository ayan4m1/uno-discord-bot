import { PrismaClient } from '@prisma/client';

import { getLogger } from './logging.js';

const log = getLogger('database');
const prisma = new PrismaClient();

export const mergeUser = async (user) => {
  try {
    const { id } = await prisma.user.findUnique({ where: { id: user.id } });

    if (id) {
      await prisma.user.update({
        where: {
          id
        },
        data: {
          username: user.username
        }
      });
    } else {
      await prisma.user.create({
        data: user
      });
    }
  } catch (error) {
    log.error(error.message);
  }
};

export const startGame = async (players) => {
  try {
    for (const player of players) {
      await mergeUser(player);
    }

    const { id } = await prisma.game.create({
      data: {
        started: new Date(),
        players: {
          create: players.map((player) => ({ userId: player.id }))
        }
      }
    });

    return id;
  } catch (error) {
    log.error(error.message);
  }
};

export const stopGame = async (id) => {
  try {
    await prisma.game.update({
      where: {
        id
      },
      data: {
        stopped: new Date()
      }
    });
  } catch (error) {
    log.error(error.message);
  }
};

export const createScore = async (gameId, user, score) => {
  try {
    await prisma.gameUser.create({
      data: {
        gameId,
        userId: user.id,
        score
      }
    });
  } catch (error) {
    log.error(error.message);
  }
};

export const getLeaderboard = async () => {
  try {
    // const players = await prisma.user.findMany({
    //   where: {
    //     playedGames:
    //   }
    // })
  } catch (error) {
    log.error(error.message);
  }

  return null;
};
