// Prepara la foto de una boleta antes de subirla: busca el papel en la
// foto, lo recorta con un pequeño margen, lo deja vertical y la achica a
// un tamaño razonable (menos datos móviles y menos espacio en Drive).
//
// La detección es simple y liviana (sin librerías): la boleta suele ser
// papel claro sobre un fondo más oscuro, así que se separan los píxeles
// claros de los oscuros y se toma la mancha clara más grande. Si no se
// encuentra un papel claro (fondo blanco, poca luz, foto ya recortada),
// se deja la foto completa: nunca se recorta "a ciegas".

const LADO_MAXIMO = 2000;   // px del lado mayor de la imagen final
const LADO_ANALISIS = 320;  // px del lado mayor de la copia chica que se analiza
const AREA_MINIMA = 0.12;   // el papel debe ocupar al menos el 12 % de la foto
const CASI_TODA = 0.92;     // si ya ocupa el 92 % de ancho y alto, no se recorta
const MARGEN = 0.02;        // margen alrededor del papel (2 % del lado mayor)

/**
 * Lee la foto y propone recorte y giro. Devuelve null si el navegador no
 * puede abrir la imagen (por ejemplo HEIC en una computadora): en ese
 * caso se sube el archivo tal cual y el servidor la convierte.
 */
export async function analizarFotoBoleta(archivo) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }
  let recorte = null;
  try {
    recorte = detectarPapel(bitmap);
  } catch {
    recorte = null;
  }
  const r = recorte || { w: bitmap.width, h: bitmap.height };
  const giro = r.w > r.h ? 90 : 0;
  return { bitmap, recorte, giro };
}

/** Dibuja la foto con el recorte y giro dados y la devuelve como JPG. */
export function dibujarFotoBoleta(bitmap, recorte, giro) {
  const r = recorte || { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
  const escala = Math.min(1, LADO_MAXIMO / Math.max(r.w, r.h));
  const ancho = Math.max(1, Math.round(r.w * escala));
  const alto = Math.max(1, Math.round(r.h * escala));
  const acostada = giro % 180 !== 0;

  const canvas = document.createElement('canvas');
  canvas.width = acostada ? alto : ancho;
  canvas.height = acostada ? ancho : alto;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((giro * Math.PI) / 180);
  ctx.drawImage(bitmap, r.x, r.y, r.w, r.h, -ancho / 2, -alto / 2, ancho, alto);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo preparar la foto.'))), 'image/jpeg', 0.88);
  });
}

function detectarPapel(bitmap) {
  const escala = LADO_ANALISIS / Math.max(bitmap.width, bitmap.height);
  const w = Math.max(1, Math.round(bitmap.width * escala));
  const h = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const total = w * h;
  const gris = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    gris[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
  }

  const umbral = umbralOtsu(gris);
  if (umbral === null) return null; // foto pareja, sin papel que se distinga del fondo

  // Mancha clara más grande (vecinos arriba/abajo/izquierda/derecha).
  const visto = new Uint8Array(total);
  const pila = new Int32Array(total);
  let mejor = null;
  for (let inicio = 0; inicio < total; inicio++) {
    if (visto[inicio] || gris[inicio] <= umbral) continue;
    let tope = 0;
    pila[tope++] = inicio;
    visto[inicio] = 1;
    let cantidad = 0;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    while (tope > 0) {
      const p = pila[--tope];
      const x = p % w;
      const y = (p - x) / w;
      cantidad++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const vecinos = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const v of vecinos) {
        if (v >= 0 && !visto[v] && gris[v] > umbral) {
          visto[v] = 1;
          pila[tope++] = v;
        }
      }
    }
    if (!mejor || cantidad > mejor.cantidad) mejor = { cantidad, minX, maxX, minY, maxY };
  }

  if (!mejor || mejor.cantidad < total * AREA_MINIMA) return null;
  const anchoPapel = mejor.maxX - mejor.minX + 1;
  const altoPapel = mejor.maxY - mejor.minY + 1;
  if (anchoPapel >= w * CASI_TODA && altoPapel >= h * CASI_TODA) return null;

  // Coordenadas en la foto original, con margen y sin salirse de ella.
  const margen = MARGEN * Math.max(w, h);
  const x0 = Math.max(0, (mejor.minX - margen) / escala);
  const y0 = Math.max(0, (mejor.minY - margen) / escala);
  const x1 = Math.min(bitmap.width, (mejor.maxX + 1 + margen) / escala);
  const y1 = Math.min(bitmap.height, (mejor.maxY + 1 + margen) / escala);
  return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
}

// Umbral que mejor separa claros de oscuros (método de Otsu). null si la
// foto casi no tiene contraste.
function umbralOtsu(gris) {
  const hist = new Array(256).fill(0);
  for (const g of gris) hist[g]++;
  const total = gris.length;
  let sumaTotal = 0;
  for (let i = 0; i < 256; i++) sumaTotal += i * hist[i];

  let sumaFondo = 0, pesoFondo = 0, mejorVarianza = 0, umbral = null;
  for (let t = 0; t < 256; t++) {
    pesoFondo += hist[t];
    if (!pesoFondo) continue;
    const pesoFrente = total - pesoFondo;
    if (!pesoFrente) break;
    sumaFondo += t * hist[t];
    const mediaFondo = sumaFondo / pesoFondo;
    const mediaFrente = (sumaTotal - sumaFondo) / pesoFrente;
    const varianza = pesoFondo * pesoFrente * (mediaFondo - mediaFrente) ** 2;
    if (varianza > mejorVarianza) {
      mejorVarianza = varianza;
      umbral = t;
    }
  }
  // Diferencia de medias menor a ~25 niveles de gris: no hay papel claro distinguible.
  if (umbral === null || mejorVarianza / (total * total) < (25 / 2) ** 2) return null;
  return umbral;
}
