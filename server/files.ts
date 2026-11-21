import type { AppStateData } from '../src/types/domain';
import { digest, invalid, missing, type PilotEnv } from './common';
const filePattern = /^\/api\/files\/([a-f0-9]{64})$/;
export function attachmentManifest(state: AppStateData): string[] {
  const files = new Set<string>();
  function include(path?: string) {
    if (path && filePattern.test(path)) files.add(path);
  }
  for (const asset of state.assets) {
    include(asset.photoDataUrl);
    for (const file of asset.files) include(file.dataUrl);
  }
  for (const record of state.records)
    for (const answer of record.answers) include(answer.photoDataUrl);
  for (const issue of state.issues) {
    include(issue.photoDataUrl);
    include(issue.treatmentPhotoDataUrl);
    for (const event of issue.timeline ?? []) include(event.photoDataUrl);
  }
  return [...files].sort();
}
const limit = 5 * 1024 * 1024;
function imageType(b: Uint8Array) {
  if (
    b.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v) &&
    String.fromCharCode(...b.slice(12, 16)) === 'IHDR'
  )
    return 'image/png';
  if (b.length >= 4 && b[0] === 255 && b[1] === 216 && b[2] === 255) return 'image/jpeg';
  if (
    b.length >= 20 &&
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP' &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(String.fromCharCode(...b.slice(12, 16)))
  )
    return 'image/webp';
}
export class Files {
  private pending = new Map<string, { bytes: Uint8Array<ArrayBuffer>; type: string }>();
  constructor(
    private env: PilotEnv,
    private workspace: string,
  ) {}
  async resolve(value?: string) {
    if (!value) return undefined;
    const ref = filePattern.exec(value);
    if (ref) {
      if (!(await this.env.PILOT_FILES.head(this.workspace + '/' + ref[1]))) missing();
      return value;
    }
    const separator = value.indexOf(',');
    const prefix = value.slice(0, separator);
    if (
      !['data:image/jpeg;base64', 'data:image/png;base64', 'data:image/webp;base64'].includes(
        prefix,
      )
    )
      invalid('Use uma imagem PNG, JPEG ou WebP.');
    const encoded = value.slice(separator + 1);
    if (encoded.length > 4 * Math.ceil(limit / 3) || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
      invalid('Arquivo de imagem inválido ou muito grande.');
    let binary: string;
    try {
      binary = atob(encoded);
    } catch {
      invalid('Arquivo de imagem inválido.');
    }
    if (binary.length > limit) invalid('A imagem excede 5 MB.');
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    const type = imageType(bytes);
    if (!type || prefix !== 'data:' + type + ';base64')
      invalid('O conteúdo não corresponde ao formato da imagem.');
    const id = await digest(this.workspace + '/' + (await digest(bytes)));
    this.pending.set(id, { bytes, type });
    return '/api/files/' + id;
  }
  async flush() {
    for (const [id, { bytes, type }] of this.pending) {
      await this.env.PILOT_FILES.put(this.workspace + '/' + id, bytes, {
        httpMetadata: { contentType: type },
      });
    }
  }
}
export async function readFile(env: PilotEnv, workspace: string, path: string) {
  const id = filePattern.exec(path)?.[1];
  if (!id) missing();
  const file = await env.PILOT_FILES.get(workspace + '/' + id);
  if (!file) missing();
  return new Response(file.body as unknown as ReadableStream, {
    headers: {
      'content-type': file.httpMetadata?.contentType ?? 'application/octet-stream',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'",
    },
  });
}
