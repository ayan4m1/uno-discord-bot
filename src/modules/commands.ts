import { Collection, Events, Routes } from 'discord.js';
import type {
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandOptionsOnlyBuilder
} from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { discord as config } from './config.js';
import { client, rest } from './discord.js';
import { getLogger } from './logging.js';

type Command = {
  data: SlashCommandOptionsOnlyBuilder;
  handler: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

const log = getLogger('commands');
const clientCommands = new Collection<string, Command>();
// resolves to lib/commands when running the built bot
const commandDir = fileURLToPath(new URL('../commands/', import.meta.url));

const isCommand = (module: Partial<Command>): module is Command =>
  Boolean(module.data && typeof module.handler === 'function');

export const loadCommands = async (): Promise<Command[]> => {
  const modules = await Promise.all(
    readdirSync(commandDir)
      .filter((file) => file.endsWith('.js'))
      .map(async (file) => {
        const module: Partial<Command> = await import(
          pathToFileURL(join(commandDir, file)).href
        );

        if (!isCommand(module)) {
          log.warn(`Skipping ${file}, it does not export data and handler`);
          return [];
        }

        return [module];
      })
  );

  return modules.flat();
};

export const registerCommands = async () => {
  const commandData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
  const commands = await loadCommands();

  for (const command of commands) {
    log.info(`Registered command ${command.data.name}`);

    clientCommands.set(command.data.name, command);
    commandData.push(command.data.toJSON());
  }

  try {
    log.info('Syncing slash commands...');

    if (!config.clientId || !config.guildId) {
      throw new Error('Invalid Discord client ID!');
    }

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      {
        body: commandData
      }
    );

    log.info('Synced slash commands!');
  } catch (error) {
    if (error instanceof Error) {
      log.error(error.message);
      log.error(error.stack);
    }
  }
};

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    const { commandName } = interaction;
    const command = clientCommands.get(commandName);

    if (!command) {
      const message = `Did not find a handler for ${commandName}`;

      log.warn(message);
      throw new Error(message);
    }

    await command.handler(interaction);
  } catch (error) {
    if (error instanceof Error) {
      log.error(error.message);
      log.error(error.stack);
    }

    const message = {
      content: 'There was an error executing this command!',
      ephemeral: true
    };

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(message);
    } else {
      await interaction.followUp(message);
    }
  }
});
