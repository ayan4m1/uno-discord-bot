import { service } from './modules/game.js';
import { registerCommands } from './modules/commands.js';
import { connectBot } from './modules/discord.js';

const execute = async () => {
  service.start();
  await registerCommands();
  connectBot();
};

execute();
