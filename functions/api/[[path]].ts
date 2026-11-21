import { handlePilot } from '../../server/http';
import type { PilotEnv } from '../../server/common';
export const onRequest = ({ request, env }: { request: Request; env: PilotEnv }) =>
  handlePilot(request, env);
