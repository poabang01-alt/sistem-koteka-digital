import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

async function startPage(hostname, pathname) {
  const redirects = [], registrations = [], loads = [];
  const location = {hostname, pathname, search: '', hash: '',
    href: `http://${hostname}:5501${pathname}`,
    replace: url => redirects.push(String(url))};
  const context = vm.createContext({URL, console,
    document: {createElement: () => ({relList: {supports: () => true}})},
    navigator: {serviceWorker: {register: async (...args) => registrations.push(args)}},
    window: {location, KotekaWorkspace: {startTracking() {}}, queueMicrotask() {},
      addEventListener: (type, callback) => {if (type === 'load') loads.push(callback);}}
  });
  const modules = new Map();
  async function load(url) {
    if (modules.has(url.href)) return modules.get(url.href);
    const source = url.pathname.endsWith('/koteka-workspace-sync.js') ? '' : await fs.readFile(url, 'utf8');
    const module = new vm.SourceTextModule(source, {context, identifier: url.href,
      initializeImportMeta: meta => {meta.url = `http://${hostname}:5501/assets/${url.pathname.split('/').at(-1)}`;}});
    modules.set(url.href, module);
    await module.link(name => load(new URL(name, url)));
    return module;
  }
  const module = await load(new URL('assets/index-B3BNhf1J.js', root));
  await module.evaluate();
  for (const callback of loads) await callback();
  return {redirects, registrations};
}

test('opening the editor-selected 404 file locally starts at the homepage', async () => {
  for (const host of ['127.0.0.1', 'localhost', '[::1]']) {
    const result = await startPage(host, '/404.html');
    assert.deepEqual(result.redirects, [`http://${host}:5501/`]);
  }
});

test('production 404 and unknown local URLs retain their error page', async () => {
  for (const [host, path] of [['kotekadigital.com', '/404.html'], ['127.0.0.1', '/missing-page/']]) {
    assert.deepEqual((await startPage(host, path)).redirects, []);
  }
});

test('service worker registration resolves to the deployed site root', async () => {
  const {registrations} = await startPage('kotekadigital.com', '/');
  assert.equal(new URL(registrations[0][0], 'http://kotekadigital.com:5501/').pathname, '/sw.js');
});

test('public image references resolve to files in the deployment', async () => {
  const missing = new Set();
  for (const name of await fs.readdir(new URL('assets/', root))) {
    if (!/\.(js|css)$/.test(name)) continue;
    const source = await fs.readFile(new URL(`assets/${name}`, root), 'utf8');
    for (const match of source.matchAll(/\/(?:sistem-koteka-digital\/)?img\/[\w./-]+\.(?:png|jpe?g|webp|avif|svg)\b/g)) {
      try {await fs.access(new URL(`.${match[0]}`, root));}
      catch {missing.add(match[0]);}
    }
  }
  assert.deepEqual([...missing], []);
});

test('public service worker loads and precaches existing public files', async () => {
  const listeners = {}, added = [];
  const cache = {addAll: async paths => {added.push(...paths);}};
  const context = vm.createContext({URL, Response,
    self: {location: {origin: 'https://kotekadigital.com'},
      registration: {scope: 'https://kotekadigital.com/'},
      addEventListener: (name, callback) => {listeners[name] = callback;}, skipWaiting() {}},
    caches: {open: async () => cache}
  });
  const source = await fs.readFile(new URL('sw.js', root), 'utf8');
  assert.doesNotThrow(() => vm.runInContext(source, context));
  let installed;
  listeners.install({waitUntil: promise => {installed = promise;}});
  await installed;
  assert.ok(added.includes('/'));
  assert.ok(added.includes('/offline.html'));
  for (const path of added.filter(path => path !== '/')) await fs.access(new URL(`.${path}`, root));
});
