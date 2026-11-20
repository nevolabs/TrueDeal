import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compile } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';

test('Tailwind generates app utilities without watching build output or the repository root', async () => {
  const root = path.resolve('.');
  const cssPath = path.join(root, 'app/globals.css');
  const compiler = await compile(await readFile(cssPath, 'utf8'), {
    from: cssPath, base: path.dirname(cssPath), onDependency() {},
  });
  const sources = compiler.root === 'none' ? compiler.sources : [
    compiler.root || { base: root, pattern: '**/*', negated: false }, ...compiler.sources,
  ];
  const scanner = new Scanner({ sources: sources.map(source => ({ negated: false, ...source })) });
  const candidates = scanner.scan();
  assert.ok(candidates.includes('bg-neutral-900'));
  assert.ok(candidates.includes('rounded-full'));
  const allowed = ['app', 'components', 'lib'].map(directory => path.join(root, directory));
  for (const glob of scanner.globs.filter(glob => glob.pattern[0] !== '!')) {
    const base = path.resolve(glob.base);
    assert.ok(allowed.some(directory => base === directory || base.startsWith(directory + path.sep)), `Unexpected watched directory: ${base}`);
  }
  assert.ok(scanner.files.every(file => !path.resolve(file).includes(path.sep + '.next' + path.sep)));
});
