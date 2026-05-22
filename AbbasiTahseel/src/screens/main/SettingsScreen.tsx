/**
 * SettingsScreen — Wave 6-Α entry point for the Settings drawer entry.
 *
 * Re-exports the new SettingsHubScreen so DrawerContent / MainStack do not
 * need to change. The hub renders a list of settings sections, each
 * navigating to its dedicated screen (CompanyInfo, PrinterSettings,
 * ServerSettings, Permissions, About).
 */
export { SettingsHubScreen as SettingsScreen } from '@/screens/settings/SettingsHubScreen';
