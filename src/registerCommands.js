import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

import { loadCommands } from './modules/discord.js';
import { getLogger } from './modules/logging.js';
import { discord as config } from './modules/config.js';

const log = getLogger('register');
const rest = new REST({ version: '9' }).setToken(config.botToken);

(async () => {
  try {
    log.info('Syncing slash commands...');

    const commands = (await loadCommands()).map((command) =>
      command.data.toJSON()
    );

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      {
        body: commands
      }
    );

    log.info('Synced slash commands!');
  } catch (error) {
    log.error(error.message);
    log.error(error.stack);
  }
})();
