import { service } from './modules/game.js';
import { connectBot, registerCommands } from './modules/discord.js';

const execute = async () => {
  service.start();
  await registerCommands();
  connectBot();
};

execute();
