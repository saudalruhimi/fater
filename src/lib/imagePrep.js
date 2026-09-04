// Serverless request bodies arrive base64-encoded, which inflates them by ~33%.
// Netlify caps a function payload at 6MB, so anything past roughly 4.5MB of binary
// never reaches the API at all — and phone photos routinely exceed that.
//
// Scanning accuracy depends on small printed numbers staying legible, so files that
// already fit are passed through untouched. Only oversized ones get resized, and
// then as gently as possible: a generous long edge and high JPEG quality first,
// stepping down only if the result is still too big.

const SAFE_BYTES = 3.5 * 1024 * 1024   // stay clear of the base64-inflated ceiling
const STEPS = [
  { maxEdge: 2600, quality: 0.92 },
  { maxEdge: 2200, quality: 0.88 },
  { maxEdge: 1800, quality: 0.82 },
]

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('تعذّر فتح الصورة')) }
    img.src = url
  })
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/**
 * Returns a file small enough to survive the serverless payload limit.
 * Non-images and already-small files are returned unchanged.
 */
export async function prepareForUpload(file) {
  if (!file.type?.startsWith('image/')) return file      // PDFs can't be resized here
  if (file.size <= SAFE_BYTES) return file               // best accuracy: send as-is

  let img
  try {
    img = await loadImage(file)
  } catch {
    return file  // let the server reject it rather than losing the original
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  for (const { maxEdge, quality } of STEPS) {
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const blob = await toBlob(canvas, quality)
    if (blob && blob.size <= SAFE_BYTES) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      })
    }
  }

  return file  // couldn't get it under the bar — send the original and surface the error
}
