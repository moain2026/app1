/**
 * Metro config — العباسي تحصيل
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/** @type {import('metro-config').MetroConfig} */
const config = {
  resolver: {
    sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
