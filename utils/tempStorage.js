module.exports = {
  tempStorage: {
    set: (data) => {
      storage = data;
    },
    get: () => storage,
    clear: () => {
      storage = null;
    },
  },
};
