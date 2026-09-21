import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Načte TSX/TS modul bez Next serveru: přeloží ho a sám vyřeší `@/…`, `./…`
// i `.json`, které plain node neumí. Volitelně podstrčí upravený React, aby
// šlo vykreslit komponentu v jiném než počátečním stavu.
//
// Soubor nekončí na `.test.mjs`, takže ho běh testů nebere jako sadu.

const require = createRequire(import.meta.url);

export function zavadec(reactModul, nahrady = {}) {
  const cache = new Map();
  return function load(relative) {
    const filename = path.resolve(relative);
    if (cache.has(filename)) return cache.get(filename);
    if (filename.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      cache.set(filename, data);
      return data;
    }
    const { outputText, diagnostics } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      // `fileName` se schválně nepředává: podle přípony by TypeScript u `.mjs`
      // emitoval ESM bez ohledu na `module`, a `export` by spadl v `new Function`.
      reportDiagnostics: true,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        // Bez `target` překládá TypeScript do ES5: `for…of` nad Map nebo Set se
        // přepíše na indexaci polem a tiše iteruje naprázdno. Test by pak prošel
        // nad kódem, který v Node i v prohlížeči funguje jinak.
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    // Syntaktickou chybu jinak spolkne a soubor se vykreslí jako prázdný modul.
    if (diagnostics?.length) {
      const vypis = diagnostics
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '))
        .join('; ');
      throw new Error(`${relative}: ${vypis}`);
    }
    const modul = { exports: {} };
    cache.set(filename, modul.exports);
    new Function('require', 'module', 'exports', outputText)((specifier) => {
      if (specifier === 'react' && reactModul) return reactModul;
      if (Object.hasOwn(nahrady, specifier)) return nahrady[specifier];
      const target = specifier.startsWith('@/')
        ? specifier.replace('@/', 'src/')
        : specifier.startsWith('.')
          ? path.join(path.dirname(filename), specifier)
          : null;
      if (target === null) return require(specifier);
      for (const pripona of ['', '.tsx', '.ts', '.mjs', '.json']) {
        const kandidat = `${target}${pripona}`;
        if (fs.existsSync(kandidat) && !fs.statSync(kandidat).isDirectory()) return load(kandidat);
      }
      throw new Error(`nenalezeno: ${specifier}`);
    }, modul, modul.exports);
    cache.set(filename, modul.exports);
    return modul.exports;
  };
}
