import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, normalize, posix, sep } from 'node:path';

import { changeErrorMessage } from '../utils.js';

import { nodeResolve } from './node-resolve.js';

const createdPaths: string[] = [];

// Cleanup created files
afterAll(async () => {
  await Promise.all(
    createdPaths.map(async (path) => {
      await fs.rm(path, { recursive: true, force: true });
    }),
  );
});

const createFs = async (input: string) => {
  const dir = await fs.realpath(
    await fs.mkdtemp(join(tmpdir(), 'pleasantest-create-fs-')),
  );
  createdPaths.push(dir);
  const paths = input
    .trim()
    .split('\n')
    .map((line) => {
      const [, originalPath, contents] = /(\S*)(.*)/.exec(line.trim()) || [];
      const path = normalize(
        join(dir, originalPath.split(posix.sep).join(sep)),
      );
      return { path, contents };
    });

  await Promise.all(
    paths.map(async ({ path, contents }) => {
      await fs.mkdir(dirname(path), { recursive: true });
      await fs.writeFile(path, contents || '');
    }),
  );

  /** Replaces all instances of randomized tmp dir with "." */
  const unrandomizePath = (text: string) => text.split(dir).join('.');

  const resolve = async (id: string, { from }: { from?: string } = {}) => {
    const result = await nodeResolve(
      id,
      join(dir, from || 'index.js'),
      dir,
    ).catch((error) => {
      throw changeErrorMessage(error, (error) => unrandomizePath(error));
    });
    if (result)
      return unrandomizePath(typeof result === 'string' ? result : result.path);
  };

  return { resolve };
};

describe('resolving in node_modules', () => {
  test('throws a useful error for a node_module that does not exist', async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {}
    `);
    await expect(
      fs.resolve('not-existing'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not find not-existing in node_modules"`,
    );
  });

  test('resolves main field with higher priority than index.js', async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {"main": "entry.js"}
      ./node_modules/foo/entry.js
      ./node_modules/foo/index.js
    `);
    expect(await fs.resolve('foo')).toBe('./node_modules/foo/entry.js');
  });

  test("throws a useful error if the main field points to something that doesn't exist", async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {"main": "not-existing.js"}
      ./node_modules/foo/index.js
    `);
    await expect(fs.resolve('foo')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not resolve foo: ./node_modules/foo/not-existing.js does not exist"`,
    );
  });

  test('throws a useful error if there is no main field or index.js', async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {}
    `);
    await expect(fs.resolve('foo')).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not resolve foo: ./node_modules/foo exists but no package entrypoint was found"`,
    );
  });

  test('resolves index.js', async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {}
      ./node_modules/foo/index.js
    `);
    expect(await fs.resolve('foo')).toBe('./node_modules/foo/index.js');
  });

  test('resolves module field over main field and over index.js', async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {"main": "index.js", "module": "index.esm.js"}
      ./node_modules/foo/index.esm.js
      ./node_modules/foo/index.js
    `);
    expect(await fs.resolve('foo')).toBe('./node_modules/foo/index.esm.js');
  });

  test('resolves exports field', async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {"main": "index.js", "module": "index.esm.js", "exports": {".": "./index.exports.js"}}
      ./node_modules/foo/index.exports.js
      ./node_modules/foo/index.esm.js
      ./node_modules/foo/index.js
    `);
    expect(await fs.resolve('foo')).toBe('./node_modules/foo/index.exports.js');
  });

  test('resolves subpath directly if exports field is not present', async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {"main": "index.js"}
      ./node_modules/foo/index.js
      ./node_modules/foo/asdf.js
    `);
    expect(await fs.resolve('foo')).toBe('./node_modules/foo/index.js');
    expect(await fs.resolve('foo/asdf')).toBe('./node_modules/foo/asdf.js');
  });

  test("refuses to resolve subpath if exports field is present and doesn't allow", async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {"name": "foo", "main": "index.js", "exports": {".": "./index.js"}}
      ./node_modules/foo/index.js
      ./node_modules/foo/asdf.js
    `);
    expect(await fs.resolve('foo')).toBe('./node_modules/foo/index.js');
    await expect(fs.resolve('foo/asdf')).rejects.toThrow(
      'Missing "./asdf" export in "foo" package',
    );
  });

  test('resolves subpath via exports field', async () => {
    const fs = await createFs(`
      ./node_modules/foo/package.json {"name": "foo", "main": "index.js", "exports": {"./asdf": "./dist/asdf.mjs"}}
      ./node_modules/foo/dist/asdf.mjs
    `);
    expect(await fs.resolve('foo/asdf')).toEqual(
      './node_modules/foo/dist/asdf.mjs',
    );
  });

  test('resolves subpath via second package.json', async () => {
    const fs = await createFs(`
      ./node_modules/preact/package.json {}
      ./node_modules/preact/index.js
      ./node_modules/preact/hooks/package.json {"main": "../dist/hooks/index.js"}
      ./node_modules/preact/dist/hooks/index.js
    `);
    expect(await fs.resolve('preact')).toBe('./node_modules/preact/index.js');
    expect(await fs.resolve('preact/hooks')).toBe(
      './node_modules/preact/dist/hooks/index.js',
    );
  });

  test('resolves multiple versions of a package correctly', async () => {
    // A and B depend on different versions of C
    // So they each have a different copy of C in their node_modules
    const fs = await createFs(`
      ./node_modules/a/package.json {}
      ./node_modules/a/index.js
      ./node_modules/a/node_modules/c/package.json {}
      ./node_modules/a/node_modules/c/index.js
      ./node_modules/b/package.json {}
      ./node_modules/b/index.js
      ./node_modules/b/node_modules/c/package.json {}
      ./node_modules/b/node_modules/c/index.js
      ./node_modules/c/package.json {}
      ./node_modules/c/index.js {}
    `);
    expect(await fs.resolve('c', { from: './node_modules/b/index.js' })).toBe(
      './node_modules/b/node_modules/c/index.js',
    );
    expect(await fs.resolve('c', { from: './node_modules/a/index.js' })).toBe(
      './node_modules/a/node_modules/c/index.js',
    );
    expect(await fs.resolve('c')).toBe('./node_modules/c/index.js');
  });
});

describe('resolving relative paths', () => {
  test('throws a useful error for a relative path that does not exist', async () => {
    const fs = await createFs(`
      ./asdf2.js
    `);
    await expect(
      fs.resolve('./asdf'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Could not resolve ./asdf"`);
  });
  test('implicitly adds .js extension', async () => {
    const fs = await createFs(`
      ./other.js
    `);
    expect(await fs.resolve('./other')).toBe('./other.js');
  });

  test('implicitly adds .ts extension', async () => {
    const fs = await createFs(`
      ./other.ts
    `);
    expect(await fs.resolve('./other')).toBe('./other.ts');
  });

  test('implicitly adds .tsx extension', async () => {
    const fs = await createFs(`
      ./other.tsx
    `);
    expect(await fs.resolve('./other')).toBe('./other.tsx');
  });

  test('does not implicitly add .mjs or .cjs', async () => {
    const fs = await createFs(`
      ./other.mjs
      ./other.cjs
    `);
    await expect(
      fs.resolve('./other'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Could not resolve ./other"`);
  });

  test('extensions can be loaded explicitly', async () => {
    const fs = await createFs(`
      ./other.mjs
      ./other.cjs
      ./other.js
      ./other.jsx
      ./other.ts
      ./other.tsx
    `);
    expect(await fs.resolve('./other.mjs')).toBe('./other.mjs');
    expect(await fs.resolve('./other.cjs')).toBe('./other.cjs');
    expect(await fs.resolve('./other.js')).toBe('./other.js');
    expect(await fs.resolve('./other.jsx')).toBe('./other.jsx');
    expect(await fs.resolve('./other.ts')).toBe('./other.ts');
    expect(await fs.resolve('./other.tsx')).toBe('./other.tsx');
  });

  test('implicitly resolves folder/index.js', async () => {
    const fs = await createFs(`
      ./folder/index.js
    `);
    expect(await fs.resolve('./folder')).toBe('./folder/index.js');
  });

  test('implicitly resolves folder/index.ts', async () => {
    const fs = await createFs(`
      ./folder/index.ts
    `);
    expect(await fs.resolve('./folder')).toBe('./folder/index.ts');
  });

  test('does not implicitly resolve folder/index.cjs or folder/index.mjs', async () => {
    const fs = await createFs(`
      ./folder/index.mjs
      ./folder/index.cjs
    `);
    await expect(
      fs.resolve('./other'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Could not resolve ./other"`);
  });

  test('resolves folder with package.json in it with main/module field, and ignores exports field', async () => {
    const fs = await createFs(`
      ./folder/package.json {"main": "./cjs.js", "module": "./mjs.js", "exports": "./dont-use.js"}
      ./folder/mjs.js
    `);
    expect(await fs.resolve('./folder')).toBe('./folder/mjs.js');
  });
});

test.todo('LOAD_PACKAGE_SELF');
test.todo('LOAD_PACKAGE_IMPORTS');
