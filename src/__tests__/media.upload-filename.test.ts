import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../client.js", () => ({
  createFeishuClient: vi.fn(),
}));

import { createFeishuClient } from "../client.js";
import { uploadFileFeishu, uploadImageFeishu } from "../media.js";

describe("uploadFileFeishu file_name handling", () => {
  const cfg = {
    channels: {
      feishu: {
        appId: "cli_test",
        appSecret: "sec_test",
      },
    },
  } as any;

  let fileCreateSpy: ReturnType<typeof vi.fn>;
  let imageCreateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fileCreateSpy = vi.fn(async () => ({
      code: 0,
      file_key: "fk_test_123",
    }));
    imageCreateSpy = vi.fn(async () => ({
      code: 0,
      image_key: "img_test_123",
    }));
    vi.mocked(createFeishuClient).mockReturnValue({
      im: {
        file: { create: fileCreateSpy },
        image: { create: imageCreateSpy },
      },
    } as any);
  });

  it("passes ASCII filename as-is", async () => {
    await uploadFileFeishu({
      cfg,
      file: Buffer.from("hello"),
      fileName: "report.pdf",
      fileType: "pdf",
    });

    const data = fileCreateSpy.mock.calls[0][0].data;
    expect(data.file_name).toBe("report.pdf");
  });

  it("passes Chinese filename without percent-encoding", async () => {
    await uploadFileFeishu({
      cfg,
      file: Buffer.from("hello"),
      fileName: "测试文件1.txt",
      fileType: "stream",
    });

    const data = fileCreateSpy.mock.calls[0][0].data;
    expect(data.file_name).toBe("测试文件1.txt");
    expect(data.file_name).not.toContain("%");
  });

  it("passes filename with mixed scripts without encoding", async () => {
    const name = "プロジェクト—報告（最終版）.docx";
    await uploadFileFeishu({
      cfg,
      file: Buffer.from("hello"),
      fileName: name,
      fileType: "doc",
    });

    const data = fileCreateSpy.mock.calls[0][0].data;
    expect(data.file_name).toBe(name);
    expect(data.file_name).not.toContain("%");
  });

  it("passes Buffer directly for file uploads", async () => {
    const file = Buffer.from("hello");

    await uploadFileFeishu({
      cfg,
      file,
      fileName: "report.xlsx",
      fileType: "xls",
    });

    const data = fileCreateSpy.mock.calls[0][0].data;
    expect(data.file).toBe(file);
  });

  it("rejects empty file buffers before calling Feishu", async () => {
    await expect(
      uploadFileFeishu({
        cfg,
        file: Buffer.alloc(0),
        fileName: "empty.xlsx",
        fileType: "xls",
      }),
    ).rejects.toThrow('Feishu media upload failed: "empty.xlsx" is empty (0 bytes)');

    expect(fileCreateSpy).not.toHaveBeenCalled();
  });

  it("rejects empty image buffers before calling Feishu", async () => {
    await expect(
      uploadImageFeishu({
        cfg,
        image: Buffer.alloc(0),
      }),
    ).rejects.toThrow('Feishu media upload failed: "image" is empty (0 bytes)');

    expect(imageCreateSpy).not.toHaveBeenCalled();
  });
});
