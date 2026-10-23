const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

const config = getConfig(getDefaultConfig(__dirname), {
  root,
  pkg,
  project: __dirname,
});

// Resolve the library to its TypeScript source so JS edits show up without rebuilding lib/.
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === pkg.name
    ? { type: 'sourceFile', filePath: path.join(root, pkg.source) }
    : (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);

module.exports = config;
