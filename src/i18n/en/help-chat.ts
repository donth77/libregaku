/** Ask the help a question, answered by the model Chrome carries. */
export const helpChat = {
  heading: 'Ask a question',
  placeholder: 'Ask about a setting or how to do something',
  /** What a screen reader calls the box. */
  label: 'Your question',
  send: 'Ask',
  thinking: 'Thinking…',
  /** Under an answer: who gave it, and that it can be wrong. */
  note: 'Answered on your device by Gemini Nano, from this help. It can be wrong.',
  /** When nothing in the help is near the question. */
  noMatch: 'The help does not say. Try the search above.',
  failed: 'Gemini Nano could not answer. Try again.',
  /** The callout where the model can be had. */
  installHeading: 'Ask a question',
  install:
    'Gemini Nano is a small AI model that runs inside Chrome, on your computer. Download it once and you can ask ' +
    'questions here. Nothing you type leaves your device.',
  download: 'Download Gemini Nano',
  downloading: (percent: number): string => `Downloading… ${percent}%`,
  /** Where Chrome is too old to carry it. */
  update:
    'Chrome has a small AI model built in, Gemini Nano, that can answer questions here. Update Chrome to use it.',
  /** Where the browser has the model but reports it not ready: it may need turning on. */
  unavailable:
    'Chrome has a small AI model, Gemini Nano, that can answer questions here, but it is not ready on ' +
    'this computer. It needs free disk space and may need turning on at chrome://flags.',
  learnMore: 'About Gemini Nano',
};
