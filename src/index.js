import uno from 'handlers/uno';
import { connectBot, registerCommands } from 'modules/discord';

registerCommands(uno);

connectBot();
