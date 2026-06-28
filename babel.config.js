module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin MUST be last (replaces the old reanimated plugin in RNR 4+)
    plugins: ['react-native-worklets/plugin'],
  };
};
