import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { prepareWorkspaceProvision } from '../server/provision';

const origin = process.argv[2] ?? 'http://127.0.0.1:8788';
const output = resolve(process.argv[3] ?? '.pilot-private/e2e');
if (!output.startsWith(resolve('.pilot-private') + sep))
  throw new Error('Output must be inside .pilot-private/');
const suffix = crypto.randomUUID().slice(0, 8);
const primary = await prepareWorkspaceProvision({
  origin,
  email: `admin-${suffix}@example.com`,
  name: 'Gestora de teste',
  companyName: `Teste de fluxo ${suffix}`,
});
const other = await prepareWorkspaceProvision({
  origin,
  email: `other-${suffix}@example.com`,
  name: 'Outra gestora',
  companyName: `Empresa isolada ${suffix}`,
});
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'seed.sql'), primary.sql + '\n' + other.sql, { flag: 'wx' });
await writeFile(
  resolve(output, 'fixture.json'),
  JSON.stringify(
    {
      origin,
      primary: { ...primary, sql: undefined },
      other: { ...other, sql: undefined },
      password: `Trial-${crypto.randomUUID()}`,
      operatorEmail: `operator-${suffix}@example.com`,
      suffix,
    },
    null,
    2,
  ),
  { flag: 'wx' },
);
console.log(JSON.stringify({ prepared: true, disposableWorkspaces: 2, origin, output }));
