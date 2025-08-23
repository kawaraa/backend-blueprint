import { unlink } from "node:fs/promises";
import path from "node:path";

export async function cleanUpOldFiles(filePath) {
  try {
    await unlink(path.resolve(filePath));
  } catch (error) {
    if (error.code !== "ENOENT") console.log("cleanUpOldFiles: ", error);
  }
}
