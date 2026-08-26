import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.resolve(root, "pages");
const chunksDir = path.resolve(outputDir, "_next", "static", "chunks");
const sitePrefix = "/boc/";

const localAssetPath = (reference, fromFile = outputDir) => {
  const withoutQuery = reference.split("?", 1)[0];
  if (withoutQuery.startsWith(sitePrefix)) {
    return path.resolve(outputDir, withoutQuery.slice(sitePrefix.length));
  }
  if (withoutQuery.startsWith("./") || withoutQuery.startsWith("../")) {
    return path.resolve(path.dirname(fromFile), withoutQuery);
  }
  return null;
};

test("the GitHub Pages entry script and stylesheet exist", async () => {
  const html = await readFile(path.resolve(outputDir, "index.html"), "utf8");
  const references = [
    ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g),
  ].map((match) => match[1]);

  assert.ok(references.length >= 2, "expected an entry script and stylesheet");
  for (const reference of references) {
    const assetPath = localAssetPath(reference);
    assert.ok(assetPath, `asset must use the ${sitePrefix} prefix: ${reference}`);
    await access(assetPath);
  }
});

test("every local JavaScript module imported by a shipped chunk exists", async () => {
  const chunkNames = (await readdir(chunksDir)).filter((name) => name.endsWith(".js"));
  assert.ok(chunkNames.length > 5, "expected runtime helper chunks as well as the main bundles");

  for (const chunkName of chunkNames) {
    const chunkPath = path.resolve(chunksDir, chunkName);
    const source = await readFile(chunkPath, "utf8");
    const imports = [
      ...source.matchAll(/(?:from\s*|import\s*)["'`]([^"'`]+\.js(?:\?[^"'`]*)?)["'`]/g),
      ...source.matchAll(/import\(["'`]([^"'`]+\.js(?:\?[^"'`]*)?)["'`]\)/g),
    ].map((match) => match[1]);

    for (const reference of imports) {
      const dependencyPath = localAssetPath(reference, chunkPath);
      if (!dependencyPath) continue;
      await access(dependencyPath);
    }
  }
});

test("runtime preload URLs include the GitHub Pages base path", async () => {
  const indexName = (await readdir(chunksDir)).find((name) => name.startsWith("index-") && name.endsWith(".js"));
  assert.ok(indexName, "expected an index chunk");
  const source = await readFile(path.resolve(chunksDir, indexName), "utf8");

  assert.match(source, /\/boc\/_next\/static\/chunks\//);
  assert.doesNotMatch(source, /["'`]\/?_next\/static\/chunks\//);
  assert.doesNotMatch(source, /["'`]boc\/_next\/static\/chunks\//);
});
