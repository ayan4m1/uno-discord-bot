import game from 'handlers/game';
import { connectBot, registerCommands } from 'modules/discord';

registerCommands(game);
connectBot();
