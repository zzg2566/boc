import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const clientDir = resolve(root, "dist", "client");
const serverEntry = resolve(root, "dist", "server", "index.js");
const outputDir = resolve(root, "pages");
const sitePrefix = "/boc";

const renderHomePage = async () => {
  const workerUrl = pathToFileURL(serverEntry);
  workerUrl.searchParams.set("export", `${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request(`http://localhost${sitePrefix}/`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  if (response.status !== 200) {
    throw new Error(`Unable to render the home page (HTTP ${response.status})`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("text/html")) {
    throw new Error(`Expected an HTML response, received ${contentType || "no content type"}`);
  }
  return response.text();
};

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
for (const entry of await readdir(clientDir, { withFileTypes: true })) {
  if (entry.name === sitePrefix.slice(1)) continue;
  await cp(
    resolve(clientDir, entry.name),
    resolve(outputDir, entry.name),
    { recursive: entry.isDirectory(), force: true },
  );
}
await cp(
  resolve(clientDir, sitePrefix.slice(1), "_next"),
  resolve(outputDir, "_next"),
  { recursive: true, force: true },
);

const html = await renderHomePage();

await writeFile(resolve(outputDir, "index.html"), html, "utf8");
await writeFile(resolve(outputDir, "404.html"), html, "utf8");
await writeFile(resolve(outputDir, ".nojekyll"), "", "utf8");

console.log(`GitHub Pages export created at ${outputDir}`);
