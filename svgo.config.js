module.exports = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          removeUselessDefs: false,
          cleanupIds: false,
          removeViewBox: false,
        },
      },
    },
    'removeXMLNS',
  ],
};
