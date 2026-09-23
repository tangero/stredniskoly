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

/**
 * `globalni` podstrčí modulu vlastní `window`, `Date`, `setInterval` a
 * podobně: jména se stanou parametry obalové funkce, takže zastíní skutečné
 * globály jen uvnitř načteného modulu, ne v testu.
 */
export function zavadec(reactModul, nahrady = {}, globalni = {}) {
  const jmenaGlobalu = Object.keys(globalni);
  const hodnotyGlobalu = Object.values(globalni);
  const cache = new Map();
  return function load(relative) {
    const filename = path.resolve(relative);
    if (cache.has(filename)) return cache.get(filename);
    if (filename.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      cache.set(filename, data);
      return data;
    }
    const zdroj = fs.readFileSync(filename, 'utf8');
    // `import.meta` v CommonJS výstupu projde překladem bez chyby a spadne až
    // v `new Function` hláškou bez jména souboru. Radši to říct rovnou.
    if (/\bimport\s*\.\s*meta\b/.test(zdroj)) {
      throw new Error(`${relative}: obsahuje import.meta, které zavaděč testů neumí přeložit do CommonJS`);
    }
    // Přípona rozhoduje dvakrát. Pro `.tsx` je potřeba `jsx`; jenže se zapnutým
    // `jsx` a bez `fileName` bere TypeScript jako TSX i obyčejné `.ts`, kde pak
    // generikum `<T>(x: T) => x` skončí jako „JSX element 'T' has no closing tag“.
    // A `fileName` s příponou `.mjs` by zase vynutilo ESM bez ohledu na `module`,
    // takže `export` spadne v `new Function`. Syntetické jméno řeší obojí.
    const jeTsx = filename.endsWith('.tsx');
    const { outputText, diagnostics } = ts.transpileModule(zdroj, {
      fileName: jeTsx ? 'modul.tsx' : 'modul.ts',
      reportDiagnostics: true,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        // Bez `target` překládá TypeScript do ES5: `for…of` nad Map nebo Set se
        // přepíše na indexaci polem a tiše iteruje naprázdno. Test by pak prošel
        // nad kódem, který v Node i v prohlížeči funguje jinak.
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        ...(jeTsx ? { jsx: ts.JsxEmit.ReactJSX } : {}),
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
    new Function('require', 'module', 'exports', ...jmenaGlobalu, outputText)((specifier) => {
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
    }, modul, modul.exports, ...hodnotyGlobalu);
    cache.set(filename, modul.exports);
    return modul.exports;
  };
}

/** Text bez značek a atributů — na hledání vět ve vykresleném HTML, ne na hledání `class`. */
export function text(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
