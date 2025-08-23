import { readdirSync } from "node:fs";
import multer from "multer";
import path from "path";
const fileTypes = jsonRequire("src/config/supported-file-types.json");
const types = fileTypes.map((f) => f.ex.replace(".", ""));
let filesCounter = readdirSync(path.resolve("uploads")).length;

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads/"), // Uploads will be saved in the 'uploads' directory
  filename: (req, file, cb) => {
    filesCounter += 1;
    cb(null, filesCounter + "-" + Date.now() + path.extname(file.originalname));
  }, // Create a unique filename with the original extension
});

const fileFilter = async (req, file, cb) => {
  const filetypes = new RegExp(`${types.join("|")}`, "i"); // > /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  if (mimetype && extname) return cb(null, true);
  cb(new Error("Unsupported file type"));
};

const limits = { fileSize: 1024 * 1024 * 100 }; // 10MB limit
const fileParser = multer({ storage: storage, limits, fileFilter });

export default fileParser;
