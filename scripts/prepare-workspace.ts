import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { prepareWorkspaceProvision } from '../server/provision';

// Keep both the input identity and the one-time link outside tracked source.
const [inputPath, outputPath = '.pilot-private/provision'] = process.argv.slice(2);
if (!inputPath)
  throw new Error(
    'Usage: node --import tsx scripts/prepare-workspace.ts <private-input.json> [private-output-directory]',
  );
const privateRoot = resolve('.pilot-private');
const output = resolve(outputPath);
if (!output.startsWith(privateRoot + sep)) throw new Error('Output must be inside .pilot-private/');
const input = JSON.parse(await readFile(inputPath, 'utf8'));
const result = await prepareWorkspaceProvision(input);
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'provision.sql'), result.sql, { flag: 'wx' });
const { sql: _sql, ...activation } = result;
await writeFile(resolve(output, 'activation.json'), JSON.stringify(activation, null, 2), {
  flag: 'wx',
});
console.log(
  JSON.stringify({
    prepared: true,
    workspaceId: result.workspaceId,
    expiresAt: result.expiresAt,
    output,
  }),
);
