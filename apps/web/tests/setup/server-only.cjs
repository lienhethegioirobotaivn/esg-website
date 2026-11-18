const Module = require("node:module");

const resolve = Module._resolveFilename;
Module._resolveFilename = function patched(request, ...rest) {
  if (request === "server-only") {
    return require.resolve("./empty.cjs");
  }
  return resolve.call(this, request, ...rest);
};
