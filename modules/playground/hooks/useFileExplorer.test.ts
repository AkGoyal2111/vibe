import { describe, it, expect, beforeEach, vi } from "vitest";

// The store imports `toast` from sonner at module load; stub it so the tests
// run in a plain (non-React) environment.
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useFileExplorer } from "./useFileExplorer";
import type { TemplateFile, TemplateFolder } from "../lib/path-to-json";

const fileA: TemplateFile = { filename: "a", fileExtension: "ts", content: "AAA" };
const fileB: TemplateFile = { filename: "b", fileExtension: "ts", content: "BBB" };

const tree: TemplateFolder = {
  folderName: "root",
  items: [fileA, fileB],
};

const reset = () =>
  useFileExplorer.setState({
    templateData: tree,
    openFiles: [],
    activeFileId: null,
    editorContent: "",
    playgroundId: "",
  });

describe("useFileExplorer store", () => {
  beforeEach(() => reset());

  it("opens a file and makes it active", () => {
    useFileExplorer.getState().openFile(fileA);
    const state = useFileExplorer.getState();
    expect(state.openFiles).toHaveLength(1);
    expect(state.editorContent).toBe("AAA");
    expect(state.activeFileId).toBe(state.openFiles[0].id);
  });

  it("does not duplicate an already-open file but re-activates it", () => {
    const { openFile } = useFileExplorer.getState();
    openFile(fileA);
    openFile(fileB);
    openFile(fileA);
    const state = useFileExplorer.getState();
    expect(state.openFiles).toHaveLength(2);
    expect(state.editorContent).toBe("AAA");
  });

  it("tracks unsaved changes when content diverges from the original", () => {
    const { openFile, updateFileContent } = useFileExplorer.getState();
    openFile(fileA);
    const id = useFileExplorer.getState().openFiles[0].id;

    updateFileContent(id, "changed");
    let file = useFileExplorer.getState().openFiles[0];
    expect(file.hasUnsavedChanges).toBe(true);
    expect(useFileExplorer.getState().editorContent).toBe("changed");

    // Reverting to the original content clears the dirty flag.
    updateFileContent(id, "AAA");
    file = useFileExplorer.getState().openFiles[0];
    expect(file.hasUnsavedChanges).toBe(false);
  });

  it("closes the active file and falls back to the previous tab", () => {
    const { openFile, closeFile } = useFileExplorer.getState();
    openFile(fileA);
    openFile(fileB);
    const bId = useFileExplorer.getState().activeFileId!;

    closeFile(bId);
    const state = useFileExplorer.getState();
    expect(state.openFiles).toHaveLength(1);
    expect(state.openFiles[0].filename).toBe("a");
    expect(state.activeFileId).toBe(state.openFiles[0].id);
    expect(state.editorContent).toBe("AAA");
  });

  it("clears active state when the last file is closed", () => {
    const { openFile, closeFile } = useFileExplorer.getState();
    openFile(fileA);
    const id = useFileExplorer.getState().activeFileId!;
    closeFile(id);
    const state = useFileExplorer.getState();
    expect(state.openFiles).toHaveLength(0);
    expect(state.activeFileId).toBeNull();
    expect(state.editorContent).toBe("");
  });

  it("closes all files at once", () => {
    const { openFile, closeAllFiles } = useFileExplorer.getState();
    openFile(fileA);
    openFile(fileB);
    closeAllFiles();
    const state = useFileExplorer.getState();
    expect(state.openFiles).toHaveLength(0);
    expect(state.activeFileId).toBeNull();
    expect(state.editorContent).toBe("");
  });
});
