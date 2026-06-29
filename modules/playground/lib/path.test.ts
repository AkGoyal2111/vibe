import { describe, it, expect } from "vitest";
import { findFilePath, generateFileId } from "./index";
import type { TemplateFile, TemplateFolder } from "./path-to-json";

const tree: TemplateFolder = {
  folderName: "root",
  items: [
    { filename: "index", fileExtension: "ts", content: "" } as TemplateFile,
    {
      folderName: "src",
      items: [
        { filename: "app", fileExtension: "tsx", content: "" } as TemplateFile,
        {
          folderName: "utils",
          items: [
            { filename: "math", fileExtension: "ts", content: "" } as TemplateFile,
          ],
        } as TemplateFolder,
      ],
    } as TemplateFolder,
  ],
};

describe("findFilePath", () => {
  it("finds a file at the root", () => {
    const file = { filename: "index", fileExtension: "ts", content: "" };
    expect(findFilePath(file, tree)).toBe("index.ts");
  });

  it("finds a nested file with its full path", () => {
    const file = { filename: "app", fileExtension: "tsx", content: "" };
    expect(findFilePath(file, tree)).toBe("src/app.tsx");
  });

  it("finds a deeply nested file", () => {
    const file = { filename: "math", fileExtension: "ts", content: "" };
    expect(findFilePath(file, tree)).toBe("src/utils/math.ts");
  });

  it("returns null when the file is absent", () => {
    const file = { filename: "missing", fileExtension: "ts", content: "" };
    expect(findFilePath(file, tree)).toBeNull();
  });
});

describe("generateFileId", () => {
  it("produces a stable path-based id for nested files", () => {
    const file = { filename: "app", fileExtension: "tsx", content: "" };
    expect(generateFileId(file, tree)).toBe("src/app.tsx/app.tsx");
  });

  it("produces distinct ids for same-named files in different folders", () => {
    const a = { filename: "index", fileExtension: "ts", content: "" };
    const b = { filename: "math", fileExtension: "ts", content: "" };
    expect(generateFileId(a, tree)).not.toBe(generateFileId(b, tree));
  });

  it("handles files with no extension", () => {
    const treeNoExt: TemplateFolder = {
      folderName: "root",
      items: [{ filename: "Dockerfile", fileExtension: "", content: "" } as TemplateFile],
    };
    const file = { filename: "Dockerfile", fileExtension: "", content: "" };
    expect(generateFileId(file, treeNoExt)).toBe("Dockerfile/Dockerfile");
  });
});
