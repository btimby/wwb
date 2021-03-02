const DEFAULT_TIMEOUT = 0;


/* Detects the environment. */
function isWorker() {
    return (typeof window === 'undefined');
}

/* Converts an error instance into a plain object. */
function serializeError(e) {
    return {
        name: e.name,
        message: e.message,
        fileName: e.fileName,
        lineNumber: e.lineNumber,
        columnNumber: e.columnNumber,
        stack: e.stack,
    }
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
}

/* The heart of this library. */
class WWB {
    constructor(timeout, methods, proxies) {
        this._callbacks = {};
        this._remote = {};
        this._timeout = (timeout === undefined) ? DEFAULT_TIMEOUT : timeout;
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
            }
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

                    if (this._timeout === 0) return;

                    // Implement the timeout.
                    setTimeout(() => {
                        const callbacks =  this._callbacks[id];
                        delete this._callbacks[id];

                        if (!callbacks) {
                            return;
                        }
    
                        const { resolve, reject } = callbacks;
    
                        reject(new Error('Call timed out'));
                    }, this._timeout);
                })
            }
        }
    }

    /* Handle incoming message. */
    _onMessage(ev) {
        const [op, name, id, ...args] = ev.data;

        if (op == 'call') {
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

/* This class runs in the Web Worker. */
class WWBackground extends WWB {
    constructor(options) {
        const { timeout, foreground, background } = options;

        super(timeout, background, foreground);
        if (options.init) options.init.apply(this);
        if (background && background.init) {
            background.init.apply(this);
        }
        this._id = 0;  // Use evens.
        // Listen for messages from the UI.
        self.addEventListener('message', this._onMessage.bind(this));
    }

    /* Post a message _from_ the web worker. */
    _postMessage(dir, name, id, ...args) {
        self.postMessage([dir, name, id, ...args]);
    }
}

/* This class runs in the UI, it starts the Web Worker. */
class WWForeground extends WWB {
    constructor(options) {
        const { script, timeout, foreground, background } = options;

        super(timeout, foreground, background);
        if (options.init) options.init.apply(this);
        if (foreground && foreground.init) {
            foreground.init.apply(this);
        }
        this._id = 1;  // use odds.
        // Start the worker and listen for it's messages.
        this._worker = new Worker(script);
        this._worker.addEventListener('message', this._onMessage.bind(this));
    }

    /* Post a message _to_ the web worker. */
    _postMessage(id, ...args) {
        this._worker.postMessage([id, ...args]);
    }
}

/* This factory creates the correct object for the current environment. */
function Wwb(options) {
    validate(options)

    if (!isWorker()) {
        return new WWForeground(options);
    } else {
        return new WWBackground(options);
    }
}

module.exports = {
    Wwb,
    isWorker,
};
