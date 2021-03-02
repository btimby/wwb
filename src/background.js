const WWBBase = require('./base');

/* This class runs in the Web Worker. */
class WWBackground extends WWBBase {
  constructor(options) {
    const { timeout, foreground, background } = options;

    super(timeout, background, foreground);
    if (options.init) options.init.apply(this);
    if (background && background.init) {
      background.init.apply(this);
    }
    this._id = 0; // Use evens.
    // Listen for messages from the UI.
    // eslint-disable-next-line no-restricted-globals
    self.addEventListener('message', this._onMessage.bind(this));
  }

  /* Post a message _from_ the web worker. */
  // eslint-disable-next-line class-methods-use-this
  _postMessage(dir, name, id, ...args) {
    // eslint-disable-next-line no-restricted-globals
    self.postMessage([dir, name, id, ...args]);
  }
}

module.exports = WWBackground;
