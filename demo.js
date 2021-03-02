const { Wwb, isWorker } = require('./src/wwbridge');

function sleep(m) {
  return new Promise((resolve) => setTimeout(resolve, m));
}

function rand(n) {
  return Math.floor(Math.random() * n);
}

const WWB = new Wwb({
  /* The URL path of this file. If omitted this can be detected in all browsers save IE. */
  // script: 'demo.js',

  /*
    Cancel execution after this number of milliseconds. 0 = no timeout.
    TODO: use cancellable promises...
    */
  timeout: 0,

  /* This initializer will be called once in the worker and once in the ui. */
  init() {
    if (isWorker()) {
      console.log('init() in worker');
    } else {
      console.log('init() in ui');
    }
  },

  /*
    These functions will be proxied to the worker in the ui, but directly callable in the worker.
    */
  background: {
    /* This initializer will be called once in the worker. */
    init() {
      this.counter = 1000;
    },

    test1(a, b, c) {
      return new Promise((resolve) => {
        setTimeout(async () => {
          // This actually calls back to the UI.
          resolve(await this.tset1(a, b, c));
        }, rand(10000));
      });
    },

    async test2() {
      await sleep(rand(10000));
      throw new Error(`${this.counter++} Error in promise`);
    },

    test3(a, b, c) {
      return `${this.counter++} ${c}${b}${a}`;
    },

    test4() {
      throw new Error(`${this.counter++} Error in function`);
    },
  },

  /*
    These functions will be callable directly from the ui, but proxied to the ui from the worker.
    */
  foreground: {
    /* This initializer will be called once in the ui. */
    init() {
      this.counter = 2000;
    },

    async tset1(a, b, c) {
      return `${this.counter++} ${a}${b}${c}`;
    },
  },

});

if (typeof (window) !== 'undefined') {
  window.WWB = WWB;
  window.rand = rand;
}

module.exports = {
  WWB,
  rand,
};
