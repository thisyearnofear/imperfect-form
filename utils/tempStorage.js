let storage = null;

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
