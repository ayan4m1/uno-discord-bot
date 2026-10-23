try {
  process.loadEnvFile();
} catch (error) {
  console.error(error);
}

import type { PrismaConfig } from 'prisma';
import { env } from 'prisma/config';

export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts'
  },
  datasource: {
    url: env('UNO_DB_URL')
  }
} satisfies PrismaConfig;
