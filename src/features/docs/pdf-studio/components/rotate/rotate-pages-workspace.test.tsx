import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

vi.mock("@/features/docs/pdf-studio/utils/pdf-reader", () => ({
  readPdfPages: vi.fn(),
}));
const { mockExportPdfFromPageDescriptors } = vi.hoisted(() => ({
  mockExportPdfFromPageDescriptors: vi.fn().mockResolvedValue(new Uint8Array()),
}));
vi.mock("@/features/docs/pdf-studio/utils/pdf-page-operations", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/docs/pdf-studio/utils/pdf-page-operations")
  >("@/features/docs/pdf-studio/utils/pdf-page-operations");
  return {
    ...actual,
    exportPdfFromPageDescriptors: mockExportPdfFromPageDescriptors,
  };
});
vi.mock("@/features/docs/pdf-studio/utils/zip-builder", () => ({
  downloadPdfBytes: vi.fn(),
}));
vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics: () => ({
    trackUpload: vi.fn(),
    trackStart: vi.fn(),
    trackSuccess: vi.fn(),
    trackFail: vi.fn(),
  }),
}));
vi.mock("@dnd-kit/core", async () => {
  const React = await import("react");
  return {
    DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    closestCenter: vi.fn(),
    KeyboardSensor: class {},
    PointerSensor: class {},
    TouchSensor: class {},
    useSensor: vi.fn(),
    useSensors: vi.fn(() => []),
  };
});
vi.mock("@dnd-kit/sortable", async () => {
  const React = await import("react");
  return {
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSortable: () => ({
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
      attributes: {},
      listeners: {},
    }),
    sortableKeyboardCoordinates: vi.fn(),
    rectSortingStrategy: vi.fn(),
    arrayMove: vi.fn(),
  };
});

import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import { RotatePagesWorkspace } from "@/features/docs/pdf-studio/components/rotate/rotate-pages-workspace";

function makePdfPage(pageIndex: number) {
  return {
    pageIndex,
    previewBytes: 1,
    previewUrl: `data:image/png;base64,abc${pageIndex}`,
    widthPt: 400,
    heightPt: 600,
    sourcePdfName: "test.pdf",
  };
}

function makeReadResult(pageCount: number) {
  return {
    ok: true as const,
    data: Array.from({ length: pageCount }, (_, i) => makePdfPage(i)),
  };
}

async function loadFile(pageCount: number) {
  vi.mocked(readPdfPages).mockResolvedValueOnce(makeReadResult(pageCount));

  render(<RotatePagesWorkspace />);

  const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
  if (!input) {
    throw new Error("No file input rendered");
  }

  const file = new File(["pdf"], "test.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(new ArrayBuffer(0)),
    configurable: true,
  });

  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });

  await waitFor(() =>
    expect(screen.getByTestId("rotate-scope-indicator")).toBeInTheDocument()
  );
}

describe("RotatePagesWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExportPdfFromPageDescriptors.mockResolvedValue(new Uint8Array());
  });

  it("shows upload zone before a file is loaded", () => {
    render(<RotatePagesWorkspace />);
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it("scope indicator defaults to whole-document when no pages are selected", async () => {
    await loadFile(3);

    const label = screen.getByTestId("rotate-scope-label");
    expect(label.textContent).toMatch(/No pages selected/);
    expect(label.textContent).toMatch(/entire document/);
    expect(label.textContent).toContain("3 pages");
  });

  it("scope indicator updates to selection scope after Select all", async () => {
    await loadFile(3);

    fireEvent.click(screen.getByRole("button", { name: /select all/i }));

    const label = screen.getByTestId("rotate-scope-label");
    expect(label.textContent).toMatch(/selected pages only/);
    expect(label.textContent).toContain("3 of 3");
  });

  it("Clear selection reverts scope to whole-document", async () => {
    await loadFile(2);

    fireEvent.click(screen.getByRole("button", { name: /select all/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear selection/i }));

    const label = screen.getByTestId("rotate-scope-label");
    expect(label.textContent).toMatch(/No pages selected/);
    expect(label.textContent).toMatch(/entire document/);
  });

  it("Clear selection button is disabled when no selection exists", async () => {
    await loadFile(2);

    const clearBtn = screen.getByRole("button", { name: /clear selection/i });
    expect(clearBtn).toBeDisabled();
  });

  it("scope indicator shows rotate left and rotate right buttons", async () => {
    await loadFile(2);

    expect(screen.getByRole("button", { name: /rotate left/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rotate right/i })).toBeInTheDocument();
  });

  it("disables mutating controls while export is in progress", async () => {
    await loadFile(2);

    let resolveExport: ((value: Uint8Array) => void) | null = null;
    mockExportPdfFromPageDescriptors.mockImplementationOnce(
      () =>
        new Promise<Uint8Array>((resolve) => {
          resolveExport = resolve;
        })
    );

    fireEvent.click(screen.getByRole("button", { name: /download rotated pdf/i }));

    await waitFor(() =>
      expect(screen.getByText(/editing is temporarily disabled/i)).toBeInTheDocument()
    );

    expect(screen.getByRole("button", { name: /select all/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /clear selection/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /rotate left/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /rotate right/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /exporting/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /change file/i })).toBeDisabled();

    await act(async () => {
      resolveExport?.(new Uint8Array());
    });

    await waitFor(() =>
      expect(screen.queryByText(/editing is temporarily disabled/i)).not.toBeInTheDocument()
    );
  });

  it("freezes page selection while export is in progress", async () => {
    await loadFile(2);

    let resolveExport: ((value: Uint8Array) => void) | null = null;
    mockExportPdfFromPageDescriptors.mockImplementationOnce(
      () =>
        new Promise<Uint8Array>((resolve) => {
          resolveExport = resolve;
        })
    );

    fireEvent.click(screen.getByRole("button", { name: /download rotated pdf/i }));
    await waitFor(() =>
      expect(screen.getByText(/editing is temporarily disabled/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByAltText("Page 1"));
    expect(screen.getByTestId("rotate-scope-label").textContent).toMatch(/No pages selected/);

    await act(async () => {
      resolveExport?.(new Uint8Array());
    });
  });
});
