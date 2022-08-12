export default () => ({
  debug(data: {}) {
    console.debug(data); // eslint-disable-line no-console
  },
  error(e: Error, text?: string) {
    console.error(text || e.message, e); // eslint-disable-line no-console
  },
});
