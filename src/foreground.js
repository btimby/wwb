const WWBBase = require('./base');

/* This class runs in the UI, it starts the Web Worker. */
class WWForeground extends WWBBase {
  constructor(options) {
    const {
      script, timeout, foreground, background,
    } = options;

    super(timeout, foreground, background);
    if (options.init) options.init.apply(this);
    if (foreground && foreground.init) {
      foreground.init.apply(this);
    }
    this._id = 1; // use odds.
    // Start the worker and listen for it's messages.
    this._worker = new Worker(script);
    this._worker.addEventListener('message', this._onMessage.bind(this));
  }

  /* Post a message _to_ the web worker. */
  _postMessage(id, ...args) {
    this._worker.postMessage([id, ...args]);
  }
}

module.exports = WWForeground;
