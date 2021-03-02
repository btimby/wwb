/* Converts an error instance into a plain object. */
function serializeError(e) {
  return {
    name: e.name,
    message: e.message,
    fileName: e.fileName,
    lineNumber: e.lineNumber,
    columnNumber: e.columnNumber,
    stack: e.stack,
  };
}

/* Converts a plain object into an error. */
function deserializeError(obj) {
  const e = new Error(obj.message);
  const attrs = Object.keys(obj);

  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    e[attr] = obj[attr];
  }

  return e;
}

/* The heart of this library. */
class WWBBase {
  constructor(timeout, methods, proxies) {
    this._callbacks = {};
    this._remote = {};
    // Create methods, these will run in the current environment.
    this._makeMethods(methods);
    // Create proxies, these will invoke functions in the _other_ environment via
    // postMessage().
    this._makeProxies(proxies);
  }

  /* Creates methods for the given functions. */
  _makeMethods(functions) {
    const names = Object.keys(functions);

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const f = functions[name];

      // Make the promise callable locally.
      const promise = this[name] = (...args) => new Promise((resolve, reject) => {
        try {
          resolve(f.apply(this, args));
        } catch (e) {
          reject(e);
        }
      });

      // Register promise here to handle backend calls.
      this._remote[name] = (id, args) => {
        promise(...args)
          .then((r) => {
            // Handle promise return.
            this._postMessage('return', name, id, r);
          })
          .catch((e) => {
            // Handle promise error.
            this._postMessage('error', name, id, serializeError(e));
          });
      };
    }
  }

  /* Creates proxies for the given functions. */
  _makeProxies(functions) {
    const names = Object.keys(functions);

    for (let i = 0; i < names.length; i++) {
      const name = names[i];

      this[name] = (...args) => {
        // We increment by two so the web worker uses even numbers and foreground odd.
        const id = this._id += 2;

        // Create a promise and store the resolve, reject callbacks. When we receive a
        // response, we will invoke one of them.
        return new Promise((resolve, reject) => {
          this._callbacks[id] = { resolve, reject };
          // Send a message to invoke the requested function. id will be echo'd back
          // with the return or error.
          this._postMessage('call', name, id, args);
        });
      };
    }
  }

  /* Handle incoming message. */
  _onMessage(ev) {
    const [op, name, id, ...args] = ev.data;

    if (op === 'call') {
      // Messages can be a call request.
      this._remote[name].apply(this, [id, ...args]);
    } else {
      // Or messages can be a return or error response.
      const callbacks = this._callbacks[id];
      if (!callbacks) {
        console.log('call timed out?');
        // No-one is waiting...
        return;
      }

      const { resolve, reject } = this._callbacks[id];
      delete this._callbacks[id];

      if (op === 'return') {
        // Normal return value.
        resolve(args[0]);
      } else {
        // We preserve the stack track etc. this way.
        reject(deserializeError(args[0]));
      }
    }
  }
}

module.exports = WWBBase;
