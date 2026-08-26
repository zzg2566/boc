import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/boc/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the 青鉴实干 H5", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>青鉴实干｜青年政绩观｜中国银行益阳分行<\/title>/);
  assert.match(html, /青鉴实干/);
  assert.match(html, /以实干立身/);
  assert.match(html, /以实绩检验/);
  assert.match(html, /12(?:<!-- -->)?\s*位青年/);
  assert.ok(html.indexOf("<small>刘娟") < html.indexOf("<small>陈诗婕"));
  assert.match(html, /<span class="profile-role">行长<\/span>/);
  assert.match(html, /<span>编辑<\/span>曾子刚、周冰玉/);
  assert.match(html, /<span>审核<\/span>刘娟/);
  assert.doesNotMatch(html, /笃行者|奋斗者/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/);
});
