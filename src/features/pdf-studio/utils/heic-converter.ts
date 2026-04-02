export async function convertHeicToJpeg(heicFile: File): Promise<File> {
  if (typeof window === "undefined") {
    // This function should only run on the client
    throw new Error("HEIC conversion can only be done on the client-side.");
  }

  const { default: libheif } = await (eval("import('libheif-js')") as Promise<typeof import("libheif-js")>);
  const heif = new libheif();

  const arrayBuffer = await heicFile.arrayBuffer();
  const imageHandles = heif.decode(arrayBuffer);
  const primaryImage = imageHandles[0];

  if (!primaryImage) {
    throw new Error("No primary image found in HEIC file");
  }

  const image = await primaryImage.to_rgba8();
  const { width, height, data } = image;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  const imageData = new ImageData(data, width, height);
  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return reject(new Error("Failed to create blob from canvas"));
        }
        const jpegFile = new File(
          [blob],
          `${heicFile.name.split(".").slice(0, -1).join(".")}.jpeg`,
          {
            type: "image/jpeg",
            lastModified: heicFile.lastModified,
          }
        );
        resolve(jpegFile);
      },
      "image/jpeg",
      0.92
    );
  });
}
