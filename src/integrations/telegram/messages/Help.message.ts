import { AppUrl } from 'utils/func-helper';
import { mainnet } from 'viem/chains';

export function HelpMessage(handles: string[], chatSubs: { [handle: string]: boolean }): string {
	const subTo = handles.filter((h) => chatSubs[h.replace('/', '')]);

	return `
*Hello again, from the Frankencoin API Bot!*

I am listening to changes within the Frankencoin ecosystem.

*Available subscription handles*
${handles.join('\n')}

*Subscripted to*
${subTo.length > 0 ? subTo.join('\n') : 'Not subscripted to any handles.'}

*Environment*
Api Version: ${process.env.npm_package_version}
Chain/Network: ${mainnet.name} (${mainnet.id})
Time: ${new Date().toString().split(' ').slice(0, 5).join(' ')}

[Goto App](${AppUrl('')})
[Github Api](https://github.com/Frankencoin-ZCHF/frankencoin-api)
`;
}
