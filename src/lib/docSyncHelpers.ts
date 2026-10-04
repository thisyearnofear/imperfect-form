import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read a file from the repo root, so docs-sync tests resolve docs the same way
 * regardless of the test runner's working directory.
 */
export function readRepoFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}
