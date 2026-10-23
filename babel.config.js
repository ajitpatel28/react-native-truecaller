module.exports = {
  presets: [
    ['module:react-native-builder-bob/babel-preset', { modules: 'commonjs' }],
  ],
  overrides: [
    {
      // RN 0.88 ships Flow syntax bob's preset can't parse; only hit when jest transforms node_modules.
      test: /node_modules[\\/](react-native|@react-native)[\\/]/,
      presets: ['module:@react-native/babel-preset'],
    },
  ],
};
