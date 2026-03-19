import type { Plugin } from 'vite';
import { init, parse } from 'es-module-lexer';
import MagicString from 'magic-string';

/**
 * Vite plugin that rewrites `import x from 'obsidian'` (and variants) to use
 * `globalThis.__obsidian__`, which is set by the development loader when running in Obsidian.
 */
export default function obsidianShimPlugin(): Plugin {
  return {
    name: 'obsidian-shim',
    enforce: 'post',
    apply: 'serve',
    async transform(code: string, id: string) {
      const isShim = id.includes('obsidian-shim.js') || id.includes('obsidian-shim.ts');
      if (isShim) {
        return null;
      }

      await init;
      let imports: ReturnType<typeof parse>[0];
      try {
        [imports] = parse(code);
      } catch {
        return null;
      }
      if (imports.length === 0) return null;

      const s = new MagicString(code);

      for (const imp of imports) {
        if (imp.n === 'obsidian') {
          const importStatement = code.substring(imp.ss, imp.se);
          const namedMatch = importStatement.match(/import\s+\{(.+)\}\s+from/s);
          const wildcardMatch = importStatement.match(
            /import\s+\*\s+as\s+(.+)\s+from/
          );

          let replacement: string;
          if (namedMatch) {
            const members = namedMatch[1].replace(/\s+as\s+/g, ': ');
            replacement = `const { ${members} } = globalThis.__obsidian__;`;
          } else if (wildcardMatch) {
            replacement = `const ${wildcardMatch[1]} = globalThis.__obsidian__;`;
          } else {
            replacement = `const obsidian = globalThis.__obsidian__;`;
          }
          s.overwrite(imp.ss, imp.se, replacement);
        }
      }

      if (!s.hasChanged()) return null;

      return {
        code: s.toString(),
        map: s.generateMap({ source: id, hires: true }),
      };
    },
  };
}
