import { describe, it, expect } from "vitest";
import {
  analyzeCodeContext,
  detectLanguage,
  detectFramework,
  detectInFunction,
  detectIncompletePatterns,
  detectAfterComment,
  buildPrompt,
} from "./code-context";

describe("detectLanguage", () => {
  it("detects language from the file extension", () => {
    expect(detectLanguage("", "index.tsx")).toBe("TypeScript");
    expect(detectLanguage("", "main.py")).toBe("Python");
    expect(detectLanguage("", "server.go")).toBe("Go");
    expect(detectLanguage("", "lib.rs")).toBe("Rust");
  });

  it("falls back to content-based detection", () => {
    expect(detectLanguage("interface Foo {}")).toBe("TypeScript");
    expect(detectLanguage("def main():")).toBe("Python");
    expect(detectLanguage("package main")).toBe("Go");
  });

  it("defaults to JavaScript", () => {
    expect(detectLanguage("const x = 1")).toBe("JavaScript");
  });
});

describe("detectFramework", () => {
  it("detects React", () => {
    expect(detectFramework("import React from 'react'")).toBe("React");
    expect(detectFramework("const [s, set] = useState(0)")).toBe("React");
  });

  it("detects Next.js, Vue and Angular", () => {
    expect(detectFramework("import x from 'next/link'")).toBe("Next.js");
    expect(detectFramework("<template></template>")).toBe("Vue");
    expect(detectFramework("@Component({})")).toBe("Angular");
  });

  it("returns None when no framework is present", () => {
    expect(detectFramework("const x = 1")).toBe("None");
  });
});

describe("detectInFunction", () => {
  it("returns true when the cursor is inside a function body", () => {
    const lines = ["function greet() {", "  ", "}"];
    expect(detectInFunction(lines, 1)).toBe(true);
  });

  it("returns false at the top level", () => {
    // Plain statements (no function/def/const=/let= heuristic match).
    const lines = ["return 1", "doThing()"];
    expect(detectInFunction(lines, 1)).toBe(false);
  });
});

describe("detectAfterComment", () => {
  it("recognises line comments before the cursor", () => {
    expect(detectAfterComment("// fix this", 11)).toBe(true);
    expect(detectAfterComment("# python comment", 16)).toBe(true);
  });

  it("returns false for plain code", () => {
    expect(detectAfterComment("const x = 1", 11)).toBe(false);
  });
});

describe("detectIncompletePatterns", () => {
  it("detects an open object literal", () => {
    expect(detectIncompletePatterns("const obj = {", 13)).toContain("object");
  });

  it("detects an open array and assignment", () => {
    expect(detectIncompletePatterns("const arr = [", 13)).toContain("array");
    expect(detectIncompletePatterns("const x =", 9)).toContain("assignment");
  });

  it("detects a method-call chain", () => {
    expect(detectIncompletePatterns("foo.", 4)).toContain("method-call");
  });

  it("returns an empty array for complete lines", () => {
    expect(detectIncompletePatterns("const x = 1;", 12)).toEqual([]);
  });
});

describe("analyzeCodeContext", () => {
  const content = [
    "import React from 'react'",
    "function App() {",
    "  const x = ",
    "  return null",
    "}",
  ].join("\n");

  it("captures the current line and cursor position", () => {
    const ctx = analyzeCodeContext(content, 2, 12, "App.tsx");
    expect(ctx.currentLine).toBe("  const x = ");
    expect(ctx.cursorPosition).toEqual({ line: 2, column: 12 });
  });

  it("derives language and framework", () => {
    const ctx = analyzeCodeContext(content, 2, 12, "App.tsx");
    expect(ctx.language).toBe("TypeScript");
    expect(ctx.framework).toBe("React");
  });

  it("includes before/after context windows", () => {
    const ctx = analyzeCodeContext(content, 2, 12, "App.tsx");
    expect(ctx.beforeContext).toContain("function App()");
    expect(ctx.afterContext).toContain("return null");
  });

  it("flags an incomplete assignment", () => {
    const ctx = analyzeCodeContext(content, 2, 12, "App.tsx");
    expect(ctx.incompletePatterns).toContain("assignment");
  });
});

describe("buildPrompt", () => {
  it("embeds a |CURSOR| marker and the suggestion type", () => {
    const ctx = analyzeCodeContext("const x = ", 0, 10, "a.ts");
    const prompt = buildPrompt(ctx, "completion");
    expect(prompt).toContain("|CURSOR|");
    expect(prompt).toContain("completion");
    expect(prompt).toContain("Language: TypeScript");
  });
});
