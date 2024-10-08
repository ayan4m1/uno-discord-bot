import {
  REST,
  Routes,
  Client,
  Collection,
  GatewayIntentBits,
  Events
} from 'discord.js';
import { readdirSync } from 'fs';

import { discord as config } from './config.js';
import { service } from './game.js';
import { getLogger } from './logging.js';

export const client = new Client({
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
  ]
});
const rest = new REST({ version: '9' }).setToken(config.botToken);
const log = getLogger('discord');
const commandDir = './src/commands';

export const loadCommands = async () =>
  await Promise.all(
    readdirSync(commandDir)
      .filter((file) => file.endsWith('.js'))
      .map(async (file) => await import(`../commands/${file}`))
  );

export const registerCommands = async () => {
  client.commands = new Collection();

  const commandData = [];
  const commands = await loadCommands();

  for (const command of commands) {
    log.info(`Registered command ${command.data.name}`);

    client.commands.set(command.data.name, command);
    commandData.push(command.data.toJSON());
  }

  try {
    log.info('Syncing slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      {
        body: commandData
      }
    );

    log.info('Synced slash commands!');
  } catch (error) {
    log.error(error.message);
    log.error(error.stack);
  }
};

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }

  try {
    const { commandName } = interaction;
    const command = client.commands.get(commandName);

    if (!command) {
      const message = `Did not find a handler for ${commandName}`;

      log.warn(message);
      throw new Error(message);
    }

    await command.handler(interaction);
  } catch (error) {
    log.error(error.message);
    log.error(error.stack);

    const message = {
      content: 'There was an error executing this command!',
      ephemeral: true
    };

    if (!interaction.replied) {
      await interaction.reply(message);
    } else {
      await interaction.followUp(message);
    }
  }
});

export const connectBot = () => {
  if (!config.botToken) {
    return log.error('No bot token, cannot connect to Discord!');
  }

  client.login(config.botToken);
};

export const disconnectBot = () => {
  client.destroy();
};

export const isAdmin = (member) =>
  config.adminRoleIds.some((role) => member.roles.cache.has(role));

const getNotificationChannel = () => {
  const guild = client.guilds.resolve(config.guildId);

  return guild.channels.cache.find((chan) => chan.id === config.channelId);
};

const getPrivateMessageChannel = async (userId) => {
  const guild = client.guilds.resolve(config.guildId);

  const member = await guild.members.fetch(userId);

  if (!member) {
    return null;
  }

  return member.user.dmChannel || member.user.createDM();
};

export const replyMessage = (interaction, message) =>
  interaction.followUp({ content: message });

export const replyEmbed = (interaction, embed, files = []) =>
  interaction.followUp({ embeds: [embed], files });

export const sendEmbed = (embed) => {
  const channel = getNotificationChannel();

  return channel.send({ embeds: [embed] });
};

export const createInteractionHandler = (handler) => async (interaction) => {
  const event = handler(interaction);

  if (!event) {
    return;
  }

  await interaction.deferReply({ ephemeral: event.ephemeral });
  service.send({ ...event, interaction });
};

export const sendMessage = (message) => {
  const channel = getNotificationChannel();

  return channel.send({ content: message });
};

export const sendPrivateEmbed = async (userId, embed, files = []) => {
  const channel = await getPrivateMessageChannel(userId);

  return channel.send({ embeds: [embed], files });
};

client.on(Events.ClientReady, async () => {
  const guilds = [...client.guilds.cache.values()];

  log.info(`Bot is connected to Discord, tracking ${guilds.length} servers!`);
});
