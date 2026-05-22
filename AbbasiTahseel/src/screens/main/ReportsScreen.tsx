/**
 * ReportsScreen — Wave 6-Α entry point for the Reports tab.
 *
 * Re-exports the new `ReportsHubScreen` so the MainTabs navigator does not
 * need to change. The hub renders a grid of report cards, each navigating
 * to its dedicated sub-screen (BalanceHeaderReport, BondsHeaderReport, …).
 *
 * Wave 6-Β will wire each sub-screen to its WCF endpoint.
 */
export { ReportsHubScreen as ReportsScreen } from '@/screens/reports/ReportsHubScreen';
