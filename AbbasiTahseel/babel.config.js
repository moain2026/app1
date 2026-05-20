/**
 * Babel config — العباسي تحصيل
 *
 * IMPORTANT — order matters:
 *  1. Decorators MUST come before class-properties (required by WatermelonDB Models).
 *  2. Reanimated plugin MUST be the LAST item in the plugins array.
 */

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // WatermelonDB requires legacy decorators on Model classes.
    ['@babel/plugin-proposal-decorators', { legacy: true }],

    // Path aliases — must mirror tsconfig.json "paths".
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@/app': './src/app',
          '@/ds': './src/design-system',
          '@/database': './src/database',
          '@/services': './src/services',
          '@/features': './src/features',
          '@/navigation': './src/navigation',
          '@/stores': './src/stores',
          '@/hooks': './src/hooks',
          '@/utils': './src/utils',
          '@/i18n': './src/i18n',
          '@/types': './src/types',
          '@/assets': './assets',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],

    // Reanimated — MUST be last.
    'react-native-reanimated/plugin',
  ],
};
