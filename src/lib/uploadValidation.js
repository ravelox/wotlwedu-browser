const configuredImageUploadBytes = Number(
  import.meta.env.VITE_WOTLWEDU_IMAGE_UPLOAD_MAX_BYTES
);
const MAX_IMAGE_UPLOAD_BYTES =
  Number.isFinite(configuredImageUploadBytes) && configuredImageUploadBytes > 0
    ? configuredImageUploadBytes
    : 5 * 1024 * 1024;

const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

export function getImageUploadExtension(file) {
  const name = file?.name || "";
  const extension = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  return ALLOWED_IMAGE_EXTENSIONS.has(extension) ? extension : "";
}

export function validateImageUploadFile(file) {
  if (!file) return "Choose a picture file to upload.";

  const extension = getImageUploadExtension(file);
  if (!extension) return "Picture files must be PNG or JPEG.";

  if (file.type && !ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return "Picture files must be PNG or JPEG.";
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    const maxMb = Math.floor(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024));
    return `Picture file is too large. Choose a file ${maxMb} MB or smaller.`;
  }

  return "";
}
