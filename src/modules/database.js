import { PrismaClient } from '@prisma/client';

import { getLogger } from './logging.js';

const log = getLogger('database');
const prisma = new PrismaClient();

export const mergeUser = async (user) => {
  try {
    const foundUser = await prisma.user.findUnique({ where: { id: user.id } });

    if (foundUser) {
      await prisma.user.update({
        where: {
          id: foundUser.id
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
    await prisma.gameUser.update({
      where: {
        // eslint-disable-next-line camelcase
        gameId_userId: {
          gameId,
          userId: user.id
        }
      },
      data: {
        score
      }
    });
  } catch (error) {
    log.error(error.message);
  }
};

export const getLeaderboard = async () => {
  try {
    const players = await prisma.user.findMany({
      take: 100,
      include: { playedGames: true }
    });
    const scores = {};

    for (const player of players) {
      let score = 0,
        games = 0;

      for (const game of player.playedGames) {
        score += game.score;
        games++;
      }

      if (games > 0) {
        scores[player.username] = {
          score,
          games,
          ratio: score / games
        };
      }
    }

    return scores;
  } catch (error) {
    log.error(error.message);
  }

  return null;
};
