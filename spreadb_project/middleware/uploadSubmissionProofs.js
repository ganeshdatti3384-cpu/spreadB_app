import multer from "multer";
import path from "path";
import multerS3 from "multer-s3";
import { s3, s3BucketName } from "../utils/s3Config.js";

const storage = multerS3({
  s3: s3,
  bucket: s3BucketName,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `submissionProofs/${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "video/mp4",
    "video/mov",
  ];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Invalid file type"), false);
  }
  cb(null, true);
};

const uploadSubmissionProofs = multer({
  storage,
  fileFilter,
  limits: { files: 5 },
});

export default uploadSubmissionProofs;
