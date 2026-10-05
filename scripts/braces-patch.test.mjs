import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("eslint-config-next"));
const pluginRequire = createRequire(nextRequire.resolve("@next/eslint-plugin-next"));
const globRequire = createRequire(pluginRequire.resolve("fast-glob"));
const micromatchRequire = createRequire(globRequire.resolve("micromatch"));
const braces = micromatchRequire("braces");
const depthError = "Pattern nesting depth exceeds maximum of 100";

describe("patched braces dependency used by ESLint", () => {
  const methods = {
    default: braces,
    parse: braces.parse,
    compile: braces.compile,
    expand: braces.expand,
    stringify: braces.stringify,
  };

  it.each(Object.entries(methods))("rejects deeply nested patterns through %s", (_name, method) => {
    const pattern = "{".repeat(4000) + "x" + "}".repeat(4000);
    expect(pattern.length).toBeLessThan(10_000);
    expect(() => method(pattern)).toThrow(depthError);
  });

  it("bounds parentheses and mixed nesting as well as braces", () => {
    expect(() => braces.compile("(".repeat(4000) + "x" + ")".repeat(4000))).toThrow(depthError);
    expect(() => braces.parse("{(".repeat(51) + "x" + ")}".repeat(51))).toThrow(depthError);
    expect(() => braces.parse("{".repeat(101))).toThrow(depthError);
  });

  it.each(["compile", "expand", "stringify"])("validates AST inputs passed directly to %s", (method) => {
    let node = { type: "text", value: "x" };
    for (let depth = 0; depth < 4000; depth += 1) {
      node = { type: "root", nodes: [node] };
    }
    expect(() => braces[method](node)).toThrow(depthError);
  });

  it.each(["compile", "expand", "stringify"])("rejects cyclic AST inputs passed to %s", (method) => {
    const node = { type: "root", nodes: [] };
    node.nodes.push(node);
    expect(() => braces[method](node)).toThrow(depthError);
  });

  it("accepts patterns at the nesting boundary", () => {
    const pattern = "(".repeat(100) + "x" + ")".repeat(100);
    expect(braces.compile(pattern)).toBe(pattern);
    expect(braces.stringify(pattern)).toBe(pattern);
    expect(braces.expand(pattern)).toEqual([pattern]);
    expect(() => braces.parse("(".repeat(101) + "x" + ")".repeat(101))).toThrow(depthError);
  });

  it("preserves normal glob alternatives, ranges, quotes and escaped braces", () => {
    expect(braces.compile("src/{app,{lib,components}}/**/*.ts")).toBe("src/(app|(lib|components))/**/*.ts");
    expect(braces.expand("file-{01..03}.ts")).toEqual(["file-01.ts", "file-02.ts", "file-03.ts"]);
    const nestedLiteral = "{".repeat(1000) + "x" + "}".repeat(1000);
    expect(braces.stringify(`'${nestedLiteral}'`)).toBe(nestedLiteral);
    expect(braces.stringify("\\{".repeat(1000) + "x" + "\\}".repeat(1000))).toBe(nestedLiteral);
    expect(braces.compile("{a,b}".repeat(1000))).toBe("(a|b)".repeat(1000));
  });
});
