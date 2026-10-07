import type { ChatViewLabels } from '@ds/desktop'

/** The chat's words, copied from desktop/src/i18n/en.ts so the film reads like the app. */
export const CHAT_LABELS: ChatViewLabels = {
  placeholder: 'Message Claude. Enter to send, Shift+Enter for a new line',
  send: 'Send',
  empty: 'Nothing said yet in this session.',
  greeting: 'Hello!',
  working: 'Claude is working…',
  loading: 'Loading the conversation…',
  waiting: 'Claude needs you in the terminal to carry on.',
  showTerminal: 'Open the terminal',
  interactiveCommand: 'Opens in the terminal',
  diffTruncated: 'Cut short here. The rest is in the file.',
  diffShowAll: 'Show all {count} lines',
  diffClose: 'Close',
  toolGroup: '{count} actions',
  earlier: 'Show earlier messages',
  attach: 'Attach files',
  removeAttachment: 'Remove',
  dropFiles: 'Drop to attach',
  queue: { open: 'Queued prompts', title: 'Queued', hint: 'Sent to Claude in this order as soon as it can take them.' },
  background: { open: 'Agents running in the background', title: 'In the background', hint: 'Each one reports back to Claude when it is done.' },
  question: {
    allow: 'Allow',
    deny: 'Deny',
    send: 'Send',
    multiHint: 'Pick any that apply',
    unsupported: 'This one has to be answered in the terminal.',
    other: 'Or type your own answer…',
  },
}
