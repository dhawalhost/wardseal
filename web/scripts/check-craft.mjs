#!/usr/bin/env node
/**
 * Craft guard — fails when kit source (components, layouts, stories) uses the
 * visual patterns WardSeal has retired. Keeps the kit and every app that
 * consumes it on the same restrained style. See THEMES.md → "Craft rules".
 *
 * Usage: node scripts/check-craft.mjs [dir ...]   (default: src)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const B = String.raw`(?<=[\s"'\x60(])`;
const E = String.raw`(?=[\s"'\x60)])`;

const rules = [
  [new RegExp(`${B}(?:[a-z-]+:)*uppercase${E}`), "uppercase labels — use sentence case"],
  [new RegExp(`${B}(?:[a-z-]+:)*tracking-(?:wide|wider|widest)${E}`), "wide tracking — leave small text at 0"],
  [new RegExp(`${B}(?:[a-z-]+:)*font-(?:bold|extrabold|black)${E}`), "700+ weight — use 400–500, 600 rarely"],
  [new RegExp(`${B}transition-all${E}`), "transition-all — name the properties"],
  [new RegExp(`${B}(?:group-)?hover:(?:scale-|-?translate-)`), "hover movement — use a colour or surface step"],
  [new RegExp(`${B}(?:bg-gradient-|from-|via-)[\\w\\[]`), "hue gradient — one neutral surface"],
  [/text-transparent[^"'\x60]*bg-clip-text|bg-clip-text[^"'\x60]*text-transparent/, "gradient text — solid ink"],
  [/shadow-\[0_0_[1-9]/, "coloured glow — depth from surface steps and hairlines"],
  [new RegExp(`${B}animate-(?:ping|bounce)${E}`), "looping attention motion"],
  [/[\u{1F300}-\u{1FAFF}✨]/u, "emoji in UI — use a lucide icon or nothing"],
];

// Lines allowed to keep a pattern (e.g. Skeleton's loading pulse is meaningful).
const allow = [/animate-pulse/];

const exts = /\.(tsx|ts|css|mdx)$/;
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : exts.test(name) ? [p] : [];
  });

const roots = process.argv.slice(2);
const files = (roots.length ? roots : ["src"]).flatMap(walk);

let failures = 0;
for (const file of files) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments document the rules
      if (allow.some((a) => a.test(line)) && !rules.some(([r]) => r.test(line.replace(/animate-pulse/g, "")))) return;
      for (const [re, why] of rules) {
        if (re.test(line)) {
          failures++;
          console.error(`✗ ${relative(process.cwd(), file)}:${i + 1}  ${why}`);
        }
      }
    });
}

if (failures) {
  console.error(`\n${failures} craft check(s) failed.`);
  process.exit(1);
}
console.log(`✓ craft rules pass across ${files.length} files.`);
