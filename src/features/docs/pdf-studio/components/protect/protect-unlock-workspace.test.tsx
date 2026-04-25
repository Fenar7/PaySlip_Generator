import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectUnlockWorkspaceWithOptions } from "./protect-unlock-workspace";

const { PDFDocument } = vi.hoisted(() => ({
  PDFDocument: {
    load: vi.fn(),
    create: vi.fn(),
  },
}));

const {
  openPdfJsDocument,
  destroyPdfJsDocument,
  normalizePdfJsError,
} = vi.hoisted(() => ({
  openPdfJsDocument: vi.fn(),
  destroyPdfJsDocument: vi.fn(),
  normalizePdfJsError: vi.fn((e) => ({
    code: "pdf-read-failed",
    message: String(e),
    cause: e,
  })),
}));

const { downloadPdfBytes } = vi.hoisted(() => ({
  downloadPdfBytes: vi.fn(),
}));

const { validatePdfStudioFiles } = vi.hoisted(() => ({
  validatePdfStudioFiles: vi.fn(() => ({ ok: true })),
}));

const { buildPdfStudioOutputName } = vi.hoisted(() => ({
  buildPdfStudioOutputName: vi.fn(({ baseName }) => `${baseName}.pdf`),
}));

const { encryptPdfViaApi, PdfEncryptionError, PDF_ENCRYPTION_ERROR_MESSAGES } = vi.hoisted(
  () => {
    class MockPdfEncryptionError extends Error {
      constructor(
        message: string,
        public readonly isNetworkError: boolean = false,
      ) {
        super(message);
        this.name = "PdfEncryptionError";
      }
    }

    return {
      encryptPdfViaApi: vi.fn(),
      PdfEncryptionError: MockPdfEncryptionError,
      PDF_ENCRYPTION_ERROR_MESSAGES: {
        passwordNotSet: "Encryption requested but password is not set.",
        passwordTooLong: "Password must be 32 characters or fewer.",
        rateLimited: "Too many requests. Please wait a moment and try again.",
        payloadTooLarge:
          "PDF is too large to encrypt. Try reducing image count or quality.",
        genericFailure: "PDF encryption failed. Please try again.",
        networkFailure:
          "Unable to reach the encryption service. Check your connection and try again.",
      },
    };
  },
);

vi.mock("pdf-lib", () => ({
  PDFDocument,
}));

vi.mock("@/features/docs/pdf-studio/utils/pdfjs-client", () => ({
  openPdfJsDocument,
  destroyPdfJsDocument,
  normalizePdfJsError,
}));

vi.mock("@/features/docs/pdf-studio/utils/zip-builder", () => ({
  downloadPdfBytes,
}));

vi.mock("@/features/docs/pdf-studio/lib/ingestion", () => ({
  validatePdfStudioFiles,
}));

vi.mock("@/features/docs/pdf-studio/lib/output", () => ({
  buildPdfStudioOutputName,
}));

vi.mock("@/features/docs/pdf-studio/utils/pdf-encryptor", () => ({
  encryptPdfViaApi,
  PdfEncryptionError,
  PDF_ENCRYPTION_ERROR_MESSAGES,
}));

vi.mock("@/features/docs/pdf-studio/lib/analytics", () => ({
  usePdfStudioAnalytics: () => ({
    trackStart: vi.fn(),
    trackSuccess: vi.fn(),
    trackFail: vi.fn(),
    trackUpload: vi.fn(),
  }),
}));

// Mock canvas for unlock image rendering
(HTMLCanvasElement.prototype.getContext as unknown as ReturnType<typeof vi.fn>) = vi.fn(() => ({
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  clearRect: vi.fn(),
} as unknown as CanvasRenderingContext2D));

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,abc");

describe("ProtectUnlockWorkspaceWithOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  function makePdfFile(name = "test.pdf") {
    return new File(["%PDF-1.4"], name, { type: "application/pdf" });
  }

  function getFileInput(container: HTMLElement) {
    return container.querySelector('input[type="file"]') as HTMLInputElement;
  }

  const passwordProtectedFailure = {
    code: "password-protected",
    message: "This PDF is password-protected. Unlock it first, then retry.",
  } as const;

  // ── Protect tab ───────────────────────────────────────────────────────

  it("shows password validation error for mismatching passwords", async () => {
    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="protect" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() => expect(screen.getByText(/Protect & Download/i)).toBeInTheDocument());

    const userPass = screen.getByPlaceholderText("Required — needed to open the PDF");
    const confirmPass = screen.getByPlaceholderText("Re-enter your password");

    fireEvent.change(userPass, { target: { value: "secret" } });
    fireEvent.change(confirmPass, { target: { value: "different" } });

    fireEvent.click(screen.getByRole("button", { name: /Protect & Download/i }));

    await waitFor(() =>
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument(),
    );
  });

  it("shows password validation error for password exceeding max length", async () => {
    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="protect" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() => expect(screen.getByText(/Protect & Download/i)).toBeInTheDocument());

    const longPassword = "a".repeat(33);
    const userPass = screen.getByPlaceholderText("Required — needed to open the PDF");
    const confirmPass = screen.getByPlaceholderText("Re-enter your password");

    fireEvent.change(userPass, { target: { value: longPassword } });
    fireEvent.change(confirmPass, { target: { value: longPassword } });

    fireEvent.click(screen.getByRole("button", { name: /Protect & Download/i }));

    await waitFor(() =>
      expect(screen.getByText(/Password must be 32 characters or fewer/i)).toBeInTheDocument(),
    );
  });

  it("calls encrypt API and downloads on successful protect", async () => {
    encryptPdfViaApi.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="protect" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile("doc.pdf")] } });

    await waitFor(() => expect(screen.getByText(/Protect & Download/i)).toBeInTheDocument());

    const userPass = screen.getByPlaceholderText("Required — needed to open the PDF");
    const confirmPass = screen.getByPlaceholderText("Re-enter your password");

    fireEvent.change(userPass, { target: { value: "secret123" } });
    fireEvent.change(confirmPass, { target: { value: "secret123" } });

    fireEvent.click(screen.getByRole("button", { name: /Protect & Download/i }));

    await waitFor(() => expect(encryptPdfViaApi).toHaveBeenCalledTimes(1));

    expect(encryptPdfViaApi).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.objectContaining({
        enabled: true,
        userPassword: "secret123",
        confirmPassword: "secret123",
        permissions: {
          printing: true,
          copying: true,
          modifying: true,
        },
      }),
    );
    expect(downloadPdfBytes).toHaveBeenCalled();
  });

  it("shows rate-limit error when API returns 429", async () => {
    encryptPdfViaApi.mockRejectedValue(
      new PdfEncryptionError(PDF_ENCRYPTION_ERROR_MESSAGES.rateLimited),
    );

    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="protect" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() => expect(screen.getByText(/Protect & Download/i)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Required — needed to open the PDF"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
      target: { value: "secret123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Protect & Download/i }));

    await waitFor(() =>
      expect(screen.getByText(/Too many requests\. Please wait a moment and try again\./i)).toBeInTheDocument(),
    );
  });

  it("clears password fields after successful protect", async () => {
    encryptPdfViaApi.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));

    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="protect" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() => expect(screen.getByText(/Protect & Download/i)).toBeInTheDocument());

    const userPass = screen.getByPlaceholderText("Required — needed to open the PDF") as HTMLInputElement;
    const confirmPass = screen.getByPlaceholderText("Re-enter your password") as HTMLInputElement;

    fireEvent.change(userPass, { target: { value: "secret123" } });
    fireEvent.change(confirmPass, { target: { value: "secret123" } });

    fireEvent.click(screen.getByRole("button", { name: /Protect & Download/i }));

    await waitFor(() => expect(downloadPdfBytes).toHaveBeenCalled());

    expect(userPass.value).toBe("");
    expect(confirmPass.value).toBe("");
  });

  // ── Unlock tab ────────────────────────────────────────────────────────

  it("detects non-protected PDF and shows info message", async () => {
    PDFDocument.load.mockResolvedValue({});

    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="unlock" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() =>
      expect(screen.getByText(/This PDF does not appear to be password-protected/i)).toBeInTheDocument(),
    );
  });

  it("detects protected PDF and prompts for password", async () => {
    PDFDocument.load
      .mockResolvedValueOnce({}) // ignoreEncryption: true succeeds
      .mockRejectedValueOnce(new Error("Password required")); // normal load fails
    openPdfJsDocument.mockRejectedValueOnce(passwordProtectedFailure);

    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="unlock" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() =>
      expect(screen.getByText(/Protected/i)).toBeInTheDocument(),
    );
  });

  it("shows malformed PDF upload errors instead of prompting for a password", async () => {
    PDFDocument.load.mockRejectedValueOnce(new Error("Broken xref table"));
    openPdfJsDocument.mockRejectedValueOnce({
      code: "pdf-read-failed",
      message: "This PDF appears malformed or unsupported.",
    });

    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="unlock" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() =>
      expect(
        screen.getByText(/This PDF appears malformed or unsupported\./i),
      ).toBeInTheDocument(),
    );

    expect(screen.queryByPlaceholderText("PDF password")).not.toBeInTheDocument();
    expect(screen.queryByText(/Protected/i)).not.toBeInTheDocument();
  });

  it("shows wrong-password error when pdfjs reports password-protected failure", async () => {
    PDFDocument.load
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Password required"));

    openPdfJsDocument
      .mockRejectedValueOnce(passwordProtectedFailure)
      .mockRejectedValueOnce(passwordProtectedFailure);

    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="unlock" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() => expect(screen.getByPlaceholderText("PDF password")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("PDF password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /Unlock as image-only PDF/i }));

    await waitFor(() =>
      expect(screen.getByText(/Incorrect password\. Please check your password and try again\./i)).toBeInTheDocument(),
    );
  });

  it("shows processing-failure error for non-password unlock errors", async () => {
    PDFDocument.load
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Password required"));

    openPdfJsDocument
      .mockRejectedValueOnce(passwordProtectedFailure)
      .mockRejectedValueOnce({
        code: "pdf-read-failed",
        message: "This PDF appears malformed or unsupported.",
      });

    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="unlock" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() => expect(screen.getByPlaceholderText("PDF password")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("PDF password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /Unlock as image-only PDF/i }));

    await waitFor(() =>
      expect(screen.getByText(/Unlock failed\. The PDF could not be rendered\. It may be corrupted or use unsupported features\./i)).toBeInTheDocument(),
    );
  });

  it("clears password after successful unlock", async () => {
    PDFDocument.load
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Password required"));

    const mockPdf = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
        cleanup: vi.fn(),
      }),
      cleanup: vi.fn(),
    };

    openPdfJsDocument
      .mockRejectedValueOnce(passwordProtectedFailure)
      .mockResolvedValueOnce({
        pdf: mockPdf,
        loadingTask: { destroy: vi.fn() },
      });

    const newDoc = {
      addPage: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
      embedPng: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    };
    PDFDocument.create.mockResolvedValue(newDoc);

    const { container } = render(<ProtectUnlockWorkspaceWithOptions initialTab="unlock" />);

    const fileInput = getFileInput(container);
    fireEvent.change(fileInput, { target: { files: [makePdfFile()] } });

    await waitFor(() => expect(screen.getByPlaceholderText("PDF password")).toBeInTheDocument());

    const passwordInput = screen.getByPlaceholderText("PDF password") as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: "secret" } });

    fireEvent.click(screen.getByRole("button", { name: /Unlock as image-only PDF/i }));

    await waitFor(() => expect(downloadPdfBytes).toHaveBeenCalled());

    expect(passwordInput.value).toBe("");
  });
});
