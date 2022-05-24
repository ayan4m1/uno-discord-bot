import { Client, Collection, Intents } from 'discord.js';
import { isFunction } from 'lodash-es';

import { discord as config } from './config.js';
import { getLogger } from './logging.js';

export const client = new Client({
  intents: [
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES
  ]
});
const commands = new Collection();
const aliases = new Map();
const log = getLogger('discord');

export const fetchPartial = async (object) => {
  if (object.partial) {
    try {
      log.info('Fetching a partial object...');
      await object.fetch();
    } catch (error) {
      log.error(error.message);
    }
  }
};

const handleMessage = async (message) => {
  try {
    await fetchPartial(message);

    const { author, content } = message;

    if (author.bot || !content.startsWith(config.commandPrefix)) {
      return;
    }

    const args = content.split(/\s+/).map((arg) => arg.trim());
    const [command, ...otherArgs] = args;
    const commandWord = command.replace(config.commandPrefix, '').toLowerCase();

    if (!commands.has(commandWord) && !aliases.has(commandWord)) {
      return log.warn(
        `${author.username} tried to use an unrecognized command: ${command}!`
      );
    }

    const handler =
      commands.get(commandWord) || commands.get(aliases.get(commandWord));

    return await handler(message, otherArgs);
  } catch (error) {
    log.error(error.message);
    log.error(error.stack);
  }
};

export const postEmbed = async (channel, embed, elements = []) => {
  if (!channel || !embed || !Array.isArray(elements)) {
    log.warn('Invalid arguments supplied to postEmbed!');
    return;
  }

  let { description } = embed;

  if (!description) {
    description = '';
  }

  for (const element of elements) {
    if (element.length + description.length >= 2048) {
      embed.setDescription(description);
      await channel.send(embed);
      description = '';
    }

    description += element;
  }

  if (description !== '') {
    embed.setDescription(description);
    await channel.send(embed);
  }
};

export const connectBot = () => {
  if (!config.botToken) {
    return log.error('No bot token, cannot connect to Discord!');
  }

  client.login(config.botToken);
};

export const disconnectBot = () => {
  client.destroy();
};

export const registerCommands = (cmds) => {
  for (const [command, handler] of Object.entries(cmds)) {
    if (isFunction(handler)) {
      commands.set(command, handler);
    } else {
      commands.set(command, handler.handler);
      if (Array.isArray(handler?.aliases)) {
        for (const alias of handler.aliases) {
          aliases.set(alias, command);
        }
      }
    }
  }
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

export const sendEmbed = (embed) => {
  const channel = getNotificationChannel();

  return channel.send({ embeds: [embed] });
};

export const sendMessage = (message) => {
  const channel = getNotificationChannel();

  return channel.send({ content: message });
};

export const sendPrivateEmbed = async (userId, embed) => {
  const channel = await getPrivateMessageChannel(userId);

  return channel.send({ embeds: [embed] });
};

export const sendPrivateMessage = async (userId, message) => {
  const channel = await getPrivateMessageChannel(userId);

  return channel.send(message);
};

client.on('ready', async () => {
  const guilds = [...client.guilds.cache.values()];

  log.info(`Bot is connected to Discord, tracking ${guilds.length} servers!`);

  for (const handler of commands.values()) {
    if (handler.events && handler.events.connected) {
      await handler.events.connected(client);
    }
  }
});

// command processor
client.on('messageCreate', handleMessage);
