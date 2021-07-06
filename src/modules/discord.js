import Discord from 'discord.js';
import { isBefore, subDays } from 'date-fns';

import { discord as config } from 'modules/config';
import { getLogger } from 'modules/logging';

export const client = new Discord.Client({
  ws: {
    intents: ['GUILD_MEMBERS', 'GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES']
  },
  partials: ['REACTION', 'MESSAGE', 'USER', 'GUILD_MEMBER']
});
const commands = new Discord.Collection();
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

    for (const handler of commands.values()) {
      if (handler.events && handler.events.message) {
        handler.events.message(message);
      }
    }

    const { content } = message;

    if (message.author.bot || !content.startsWith('!')) {
      return;
    }

    const args = content.split(/\s+/).map((arg) => arg.trim());
    const [command, subCommand, ...otherArgs] = args;
    const commandWord = command.replace('!', '').toLowerCase();

    if (!commands.has(commandWord)) {
      return log.info(
        `${message.author} tried to use an unrecognized command: ${command}!`
      );
    }

    const { handler, commands: commandMap } = commands.get(commandWord);

    if (handler) {
      return await handler(message, [subCommand, ...otherArgs]);
    }

    if (!commands) {
      return;
    }

    const { handler: subHandler } = commandMap[subCommand.toLowerCase()];

    if (!subHandler) {
      return message.reply('that command is not yet implemented!');
    }

    return await subHandler(message, otherArgs);
  } catch (error) {
    log.error(error.message);
    log.error(error.stack);
  }
};

const getMessages = (channel, before) =>
  channel.messages.fetch({
    limit: 100,
    before
  });

export const getAllMessages = async (channel) => {
  const messages = [];

  if (channel.type !== 'text' || !channel.viewable) {
    log.info(`Skipping channel ${channel.name} because it is not valid!`);
    return messages;
  }

  let lastId;

  do {
    log.info(`Fetching messages before ${lastId} for #${channel.name}`);
    const results = await getMessages(channel, lastId);

    if (results.size > 0) {
      messages.push(...results.array());

      const lastEntry = results.last();

      if (
        isBefore(lastEntry.createdAt, subDays(Date.now(), config.backfillDays))
      ) {
        log.info(
          `Stopping for #${channel.name} because we hit ${config.backfillDays} days`
        );
        break;
      }

      lastId = lastEntry.id;
    } else {
      lastId = null;
    }
  } while (lastId);

  return messages;
};

export const getNewestMessages = async (channel, newestMessages) => {
  const messages = await getAllMessages(channel);

  messages.forEach((message) => {
    const [id, date] = [message.author.id, message.createdAt];

    if (!newestMessages.has(id)) {
      newestMessages.set(id, date);
    } else if (isBefore(newestMessages.get(id), date)) {
      newestMessages.set(id, date);
    }
  });

  return newestMessages;
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

export const registerCommand = (command, handler) => {
  commands.set(command, handler);
};

export const isAdmin = (member) =>
  config.adminRoleIds.some((role) => member.roles.cache.has(role));

export const getNotificationChannel = (guildId, channelId) => {
  const guild = client.guilds.resolve(guildId);

  return guild.channels.cache.find((chan) => chan.id === channelId);
};

client.on('ready', async () => {
  const guilds = client.guilds.cache.array();

  log.info(`Bot is connected to Discord, tracking ${guilds.length} servers!`);

  for (const handler of commands.values()) {
    if (handler.events && handler.events.connected) {
      await handler.events.connected(client);
    }
  }
});

// command processor
client.on('message', handleMessage);
