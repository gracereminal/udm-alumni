const MAX_BYTES = 5 * 1024 * 1024;

/** Read an image file as a (downscaled) data URL so it fits in browser storage. */
export function readImage(file, maxDim = 1200) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type)) { reject(new Error('Choose an image file (JPG or PNG).')); return; }
    if (file.size > MAX_BYTES) { reject(new Error('That image is larger than 5 MB. Choose a smaller one.')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 400 * 1024) { resolve(reader.result); return; }
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
