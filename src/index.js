import uno from 'handlers/uno';
import { connectBot, registerCommand } from 'modules/discord';

registerCommand('uno', uno);

connectBot();
