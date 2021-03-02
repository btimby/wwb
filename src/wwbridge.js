const WWForeground = require('./foreground');
const WWBackground = require('./background');

/* Detects the environment. */
function isWorker() {
  return (typeof window === 'undefined');
}

/* Checks our options for validity. */
function validate(options) {
  const { foreground, background } = options;

  if (!foreground && !background) return;

  const fgNames = Object.keys(foreground);
  const bgNames = Object.keys(background);

  for (let i = 0; i < fgNames.length; i++) {
    const name = fgNames[i];

    if (name === 'init') continue;

    if (bgNames.indexOf(name) !== -1) {
      throw new Error(`foreground function ${name} found in background as well. Names must be unique.`);
    }

    if (typeof foreground[name] !== 'function') {
      throw new Error('All items in foreground must be functions.');
    }
  }

  for (let i = 0; i < bgNames.length; i++) {
    const name = bgNames[i];

    if (name === 'init') continue;

    if (fgNames.indexOf(name) !== -1) {
      throw new Error(`background function ${name} found in foreground as well. Names must be unique.`);
    }

    if (typeof background[name] !== 'function') {
      throw new Error('All items in background must be functions.');
    }
  }

  if (!options.script && typeof document !== 'undefined') {
    options.script = document.currentScript.src;
  }

  if (!options.script && !isWorker()) {
    throw new Error('Wwb instance requires script option in this browser. This option '
                        + 'should provide the url of the worker javascript module.');
  }
}

/* This factory creates the correct object for the current environment. */
function Wwb(options) {
  validate(options);

  if (!isWorker()) {
    return new WWForeground(options);
  }
  return new WWBackground(options);
}

module.exports = {
  Wwb,
  isWorker,
};
