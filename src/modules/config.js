import 'dotenv/config';

export const discord = {
  adminRoleIds: (process.env.UNO_DISCORD_ADMIN_ROLE_IDS || '').split(/,/),
  botToken: process.env.UNO_DISCORD_BOT_TOKEN,
  channelId: process.env.UNO_DISCORD_CHANNEL_ID,
  guildId: process.env.UNO_DISCORD_GUILD_ID,
  commandPrefix: process.env.UNO_DISCORD_COMMAND_PREFIX || '?'
};

export const logging = {
  level: process.env.UNO_LOG_LEVEL || 'info',
  timestampFormat: process.env.UNO_LOG_TIME_FMT
};

export const uno = {
  endDelay: parseInt(process.env.UNO_GAME_END_DELAY || 20000, 10),
  solicitDelay: parseInt(process.env.UNO_GAME_SOLICIT_DELAY || 60000, 10),
  roundDelay: parseInt(process.env.UNO_GAME_ROUND_DELAY || 120000, 10),
  cardBaseUrl: process.env.UNO_GAME_CARD_BASE_URL,
  debugMode: process.env.UNO_GAME_DEBUG_MODE?.toLowerCase?.() === 'true'
};

export default {
  discord,
  logging,
  uno
};
