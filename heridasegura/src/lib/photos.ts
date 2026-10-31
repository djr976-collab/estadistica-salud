import type { WoundPhoto } from './types';
/** Para cada toma, la foto a mostrar: versión editada si existe; si no, el original. */
export function displayPhotos(photos: WoundPhoto[]) {
  const derivedOf = new Set(photos.filter((p) => p.derived_from_id).map((p) => p.derived_from_id));
  return photos.filter((p) => !derivedOf.has(p.id));
}
