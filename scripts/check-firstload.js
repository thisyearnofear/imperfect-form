#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const buildDir = path.resolve(process.cwd(), process.argv[2] || '.next');
const appDir = path.join(buildDir, 'server', 'app');

const dependencyChecks = [
  {
    name: 'ethers',
    // `ethers`, JsonRpcProvider, and BrowserProvider can legitimately remain
    // as dynamic-import callsites or unrelated chain metadata. These markers
    // are the library's heavier runtime surfaces and avoid those false hits.
    markers: [
      'HDNodeWallet',
      'HDNodeVoidWallet',
      'SigningKey',
      'AbiCoder',
      'TypedDataEncoder',
      'AbstractProvider',
    ],
    minimumMatches: 1,
  },
  {
    name: 'selfxyz',
    markers: ['SelfAppBuilder', 'SelfQRcodeWrapper', 'getUniversalLink', 'SelfBackendVerifier'],
    minimumMatches: 1,
  },
  {
    name: 'supabase',
    markers: [
      'SupabaseClient',
      'PostgrestClient',
      'RealtimeClient',
      'GoTrueClient',
      'supabase.co',
      'supabaseUrl',
    ],
    minimumMatches: 1,
  },
];

// This script intentionally assumes it is run immediately after `next build`.
// The `build` package script enforces that ordering; a manually reused .next
// directory is only checked for internal consistency (HTML → chunk files).
function findRootHtml() {
  const explicitHtml = process.env.FIRSTLOAD_HTML;
  const candidates = explicitHtml
    ? [path.resolve(process.cwd(), explicitHtml)]
    : [path.join(appDir, 'index.html'), path.join(appDir, 'page.html')];

  const html = candidates.find((candidate) => fs.existsSync(candidate));
  if (!html) {
    throw new Error(
      `Could not find the root route HTML under ${appDir}. ` +
        'Run `next build` before running this check.'
    );
  }
  return html;
}

function getChunkReferences(html) {
  const references = new Set();
  const pattern = /\/_next\/static\/chunks\/[^"'\s]+?\.js(?:[?#][^"'\s]*)?/g;

  for (const match of html.matchAll(pattern)) {
    const reference = match[0].split(/[?#]/, 1)[0];
    references.add(reference);
  }

  return [...references].sort();
}

function getChunkPath(reference) {
  const relativePath = reference.replace(/^\/_next\//, '');
  return path.join(buildDir, relativePath);
}

function findMatches(source, markers) {
  return markers.filter((marker) => source.includes(marker));
}

function main() {
  const rootHtml = findRootHtml();
  const html = fs.readFileSync(rootHtml, 'utf8');
  const references = getChunkReferences(html);

  if (references.length === 0) {
    throw new Error(`No root-route JavaScript chunks found in ${rootHtml}.`);
  }

  const violations = [];
  const missingChunks = [];

  for (const reference of references) {
    const chunkPath = getChunkPath(reference);
    if (!fs.existsSync(chunkPath)) {
      missingChunks.push(reference);
      continue;
    }

    const source = fs.readFileSync(chunkPath, 'utf8');
    for (const dependency of dependencyChecks) {
      const matches = findMatches(source, dependency.markers);
      if (matches.length >= dependency.minimumMatches) {
        violations.push({ dependency: dependency.name, reference, matches });
      }
    }
  }

  console.log(`[check-firstload] root HTML: ${path.relative(process.cwd(), rootHtml)}`);
  console.log(`[check-firstload] scanned ${references.length} first-load chunk(s)`);

  if (missingChunks.length > 0) {
    console.error('[check-firstload] Missing referenced chunk file(s):');
    for (const reference of missingChunks) console.error(`  - ${reference}`);
    process.exitCode = 1;
  }

  if (violations.length > 0) {
    console.error('[check-firstload] Heavy dependencies found in the / first load:');
    for (const violation of violations) {
      console.error(
        `  - ${violation.dependency}: ${violation.reference} ` +
          `(markers: ${violation.matches.join(', ')})`
      );
    }
    console.error('[check-firstload] Keep ethers, selfxyz, and supabase behind a lazy import.');
    process.exitCode = 1;
  }

  if (missingChunks.length === 0 && violations.length === 0) {
    console.log('[check-firstload] / first load is free of ethers, selfxyz, and supabase ✓');
  }
}

try {
  main();
} catch (error) {
  console.error(`[check-firstload] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
