import { common } from './en/common';
import { settings } from './en/settings';
import { options } from './en/options';
import { action } from './en/action';
import { sidebar } from './en/sidebar';
import { popup } from './en/popup';
import { header } from './en/header';
import { player } from './en/player';
import { notices } from './en/notices';
import { anki } from './en/anki';
import { errors } from './en/errors';
import { grammar } from './en/grammar';
import { helpChat } from './en/help-chat';

/**
 * Every string on the interface, in English: the source each translation
 * follows, and what shows wherever a translation leaves one out.
 */
export const en = { common, settings, options, action, sidebar, popup, header, player, notices, anki, errors, grammar, helpChat };

export type Strings = typeof en;
