import { Client, Collection, Intents } from 'discord.js';
import { readdirSync } from 'fs';

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

  const commands = await loadCommands();

  for (const command of commands) {
    log.info(`Registered command ${command.data.name}`);

    client.commands.set(command.data.name, command);
  }
};

client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.isCommand()) {
      return;
    }

    const { commandName } = interaction;
    const command = client.commands.get(commandName);

    if (!command) {
      return log.warn(`Did not find a handler for ${commandName}`);
    }

    await command.handler(interaction);
  } catch (error) {
    log.error(error.message);
    log.error(error.stack);

    await interaction.reply({
      content: 'There was an error executing this command!',
      ephemeral: true
    });
  }
});

export const postEmbed = async (interaction, embed, elements = []) => {
  if (!interaction || !embed || !Array.isArray(elements)) {
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
      await interaction.followUp({ embeds: [embed] });
      description = '';
    }

    description += element;
  }

  if (description !== '') {
    embed.setDescription(description);
    await interaction.followUp({ embeds: [embed] });
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

export const sendPrivateEmbed = async (userId, embed, files = []) => {
  const channel = await getPrivateMessageChannel(userId);

  return channel.send({ embeds: [embed], files });
};

export const sendPrivateMessage = async (userId, message) => {
  const channel = await getPrivateMessageChannel(userId);

  return channel.send(message);
};

client.on('ready', async () => {
  const guilds = [...client.guilds.cache.values()];

  log.info(`Bot is connected to Discord, tracking ${guilds.length} servers!`);
});
