import { AppUrl } from 'utils/func-helper';

export function WelcomeGroupMessage(group: string | number): string {
	return `👋 *Welcome to Frankencoin Bot*

This chat (\`${group}\`) is now connected to the Frankencoin ecosystem.

*/start* — Subscribe to all alerts (Governance + All Positions)
*/start GOV* | */stop GOV* — Toggle Governance alerts
*/start ALL* | */stop ALL* — Toggle All Positions alerts
*/start <owner>* — Subscribe to Governance + track an owner
*/stop <owner>* — Stop tracking an owner
*/status* — Show your active subscriptions

v${process.env.npm_package_version} · [🌐 App](${AppUrl('')}) · [📦 GitHub](https://github.com/Frankencoin-ZCHF/frankencoin-api)`;
}
