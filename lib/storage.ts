import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

export interface StorageAdapter {
  save(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

class LocalAdapter implements StorageAdapter {
  private readonly uploadDir = path.join(process.cwd(), "uploads");

  async save(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const ext = path.extname(filename).toLowerCase();
    const key = `${uuidv4()}${ext}`;
    await fs.writeFile(path.join(this.uploadDir, key), buffer);
    return key;
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(this.uploadDir, key));
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

class R2Adapter implements StorageAdapter {
  async save(_buffer: Buffer, _filename: string, _mimeType: string): Promise<string> {
    // TODO: implement with @aws-sdk/client-s3 pointing at the R2 endpoint
    throw new Error("R2 adapter is not yet implemented");
  }

  async delete(_key: string): Promise<void> {
    throw new Error("R2 adapter is not yet implemented");
  }

  getUrl(key: string): string {
    const base = process.env.R2_PUBLIC_URL ?? "";
    return `${base}/${key}`;
  }
}

export const storage: StorageAdapter =
  process.env.STORAGE_ADAPTER === "r2" ? new R2Adapter() : new LocalAdapter();
