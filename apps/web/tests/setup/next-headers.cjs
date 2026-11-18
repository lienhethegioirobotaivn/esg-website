const jar = new Map();

globalThis.__testCookieJar = jar;

module.exports = {
  cookies: async () => ({
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name, value) => {
      jar.set(name, value);
    },
    delete: (name) => {
      jar.delete(name);
    },
  }),
};
