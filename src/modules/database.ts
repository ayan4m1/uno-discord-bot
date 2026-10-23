import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { getLogger } from './logging.js';
import type { Player } from '../types.js';

const log = getLogger('database');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.UNO_DB_URL })
});

const logError = (error: unknown) =>
  log.error(error instanceof Error ? error.message : String(error));

export const mergeUser = async (user: Player) => {
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
        data: {
          id: user.id,
          username: user.username
        }
      });
    }
  } catch (error) {
    logError(error);
  }
};

export const startGame = async (players: Player[]) => {
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
    logError(error);
  }
};

export const stopGame = async (id: bigint) => {
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
    logError(error);
  }
};

export const setWinner = async (id: bigint, winnerId: string) => {
  try {
    await prisma.game.update({
      where: { id },
      data: { winnerId }
    });
  } catch (error) {
    logError(error);
  }
};

export const createScore = async (
  gameId: bigint,
  user: Pick<Player, 'id'>,
  score: number
) => {
  try {
    await prisma.gameUser.update({
      where: {
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
    logError(error);
  }
};

export type LeaderboardEntry = {
  score: number;
  games: number;
  won: number;
  ratio: number;
};

export const getLeaderboard = async (): Promise<
  Map<string, LeaderboardEntry>
> => {
  const scores = new Map<string, LeaderboardEntry>();

  try {
    const players = await prisma.user.findMany({
      take: 100,
      include: { playedGames: { include: { game: true } } }
    });

    for (const player of players) {
      let score = 0,
        won = 0,
        games = 0;

      for (const playedGame of player.playedGames.filter(
        ({ game }) => game.stopped !== null
      )) {
        score += playedGame.score ?? 0;
        games++;
        if (playedGame.game.winnerId === player.id) {
          won++;
        }
      }

      if (games > 0) {
        scores.set(player.username, {
          score,
          games,
          won,
          ratio: score / games
        });
      }
    }
  } catch (error) {
    logError(error);
  }

  return scores;
};
