import {
  REST,
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  GuildMember
} from 'discord.js';
import type {
  ChatInputCommandInteraction,
  TextChannel,
  AttachmentBuilder
} from 'discord.js';

import { discord as config } from './config.js';
import { getLogger } from './logging.js';

if (!config.botToken) {
  throw new Error('Invalid Discord bot token!');
}

export const client = new Client({
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
  ]
});
export const rest = new REST({ version: '9' }).setToken(config.botToken);
const log = getLogger('discord');

export const connectBot = () => {
  if (!config.botToken) {
    return log.error('No bot token, cannot connect to Discord!');
  }

  client.login(config.botToken);
};

export const disconnectBot = () => {
  client.destroy();
};

export const isAdmin = (member: ChatInputCommandInteraction['member']) =>
  member instanceof GuildMember &&
  config.adminRoleIds.some((role) => member.roles.cache.has(role));

const getNotificationChannel = () => {
  if (!config.guildId) {
    throw new Error('Invalid Discord guild ID!');
  }

  const guild = client.guilds.resolve(config.guildId);

  return guild?.channels?.cache?.find?.((chan) => chan.id === config.channelId);
};

const getPrivateMessageChannel = async (userId: string) => {
  if (!config.guildId) {
    throw new Error('Invalid Discord guild ID!');
  }

  const guild = client.guilds.resolve(config.guildId);

  const member = await guild?.members?.fetch?.(userId);

  if (!member) {
    return null;
  }

  return member.user.dmChannel || member.user.createDM();
};

export const replyMessage = (
  interaction?: ChatInputCommandInteraction,
  message?: string
) => interaction?.followUp?.({ content: message });

export const replyEmbed = (
  interaction?: ChatInputCommandInteraction,
  embed: EmbedBuilder = new EmbedBuilder(),
  files: AttachmentBuilder[] = []
) => interaction?.followUp?.({ embeds: [embed], files });

export const sendEmbed = (embed: EmbedBuilder) => {
  const channel = getNotificationChannel();
  const textChannel = channel as TextChannel;

  return textChannel?.send({ embeds: [embed] });
};

export const sendMessage = (message: string) => {
  const channel = getNotificationChannel();
  const textChannel = channel as TextChannel;

  return textChannel?.send({ content: message });
};

export const sendPrivateEmbed = async (
  userId: string,
  embed: EmbedBuilder,
  files: AttachmentBuilder[] = []
) => {
  const channel = await getPrivateMessageChannel(userId);

  return channel?.send({ embeds: [embed], files });
};

client.on(Events.ClientReady, async () => {
  const guilds = [...client.guilds.cache.values()];

  log.info(`Bot is connected to Discord, tracking ${guilds.length} servers!`);
});
