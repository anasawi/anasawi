/**
 * Recompression d'une vidéo — entièrement dans le navigateur.
 *
 * POURQUOI. Une vidéo de téléphone pèse 50 à 300 Mo, en HEVC que Chrome ne
 * lit pas toujours. Or l'envoi passe par une fonction serverless (6 Mo au
 * plus) et l'hébergeur n'a pas de ffmpeg. Le seul endroit où l'on peut
 * réencoder, c'est l'appareil d'Anne — qui vient de décoder cette vidéo
 * pour la lui montrer, donc qui sait le faire.
 *
 * COMMENT. La vidéo source joue, muette, dans un `<video>` hors écran ;
 * chaque image est dessinée sur un canvas à la taille voulue ; le flux du
 * canvas est enregistré par `MediaRecorder`, en H.264/MP4 là où le
 * navigateur sait le produire (Safari, Chrome récent), en WebM sinon
 * (Firefox). Le débit est choisi pour tenir sous la limite d'envoi quelle
 * que soit la durée, et la durée est bornée : une boucle « cinéma » dure
 * dix à vingt secondes, pas trois minutes.
 *
 * C'est un réencodage en temps réel : vingt secondes de vidéo prennent
 * vingt secondes. L'appelant reçoit la progression pour le dire.
 */

export type VideoPrete = {
  data: Blob
  mimeType: 'video/mp4' | 'video/webm'
  width: number
  height: number
  /** Première image, en vignette floue : l'affiche avant lecture. */
  blurDataUrl: string | null
  /** Durée retenue, en secondes. */
  duration: number
}

export type OptionsVideo = {
  /** Taille maximale du fichier produit, en octets. */
  maxBytes: number
  /** Durée maximale, en secondes — au-delà, la vidéo est coupée. */
  maxSeconds: number
  /** Plus grand côté, en pixels. */
  maxEdge: number
  onProgress?: (fraction: number) => void
}

/** Le format que ce navigateur sait produire — MP4 de préférence. */
function formatSupporte(): { mimeType: 'video/mp4' | 'video/webm'; codec: string } | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidats: { mimeType: 'video/mp4' | 'video/webm'; codec: string }[] = [
    { mimeType: 'video/mp4', codec: 'video/mp4;codecs=avc1.42E01E' },
    { mimeType: 'video/mp4', codec: 'video/mp4;codecs=avc1' },
    { mimeType: 'video/mp4', codec: 'video/mp4' },
    { mimeType: 'video/webm', codec: 'video/webm;codecs=vp9' },
    { mimeType: 'video/webm', codec: 'video/webm;codecs=vp8' },
    { mimeType: 'video/webm', codec: 'video/webm' },
  ]
  return candidats.find((c) => MediaRecorder.isTypeSupported(c.codec)) ?? null
}

function chargerLaSource(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = URL.createObjectURL(file)
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () =>
      reject(new Error('Ce navigateur ne sait pas lire cette vidéo.'))
  })
}

export function estUneVideo(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(file.name)
}

export async function preparerLaVideo(
  file: File,
  options: OptionsVideo,
): Promise<VideoPrete> {
  const format = formatSupporte()
  if (!format) {
    throw new Error(
      'Ce navigateur ne sait pas recompresser une vidéo. Essayez avec Safari ou Chrome.',
    )
  }

  const source = await chargerLaSource(file)
  try {
    const dureeSource = Number.isFinite(source.duration) ? source.duration : 0
    if (dureeSource <= 0) throw new Error('Vidéo vide ou illisible.')
    const duration = Math.min(dureeSource, options.maxSeconds)

    const scale = Math.min(
      1,
      options.maxEdge / Math.max(source.videoWidth, source.videoHeight),
    )
    /* Dimensions paires : H.264 l'exige. */
    const width = Math.max(2, Math.round((source.videoWidth * scale) / 2) * 2)
    const height = Math.max(2, Math.round((source.videoHeight * scale) / 2) * 2)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas indisponible.')

    /* Vignette de la première image, floue par sa taille (16 px). */
    await new Promise<void>((resolve) => {
      source.currentTime = 0
      source.onseeked = () => resolve()
      window.setTimeout(resolve, 500)
    })
    context.drawImage(source, 0, 0, width, height)
    const vignette = document.createElement('canvas')
    const echelle = 16 / Math.max(width, height)
    vignette.width = Math.max(1, Math.round(width * echelle))
    vignette.height = Math.max(1, Math.round(height * echelle))
    vignette.getContext('2d')?.drawImage(canvas, 0, 0, vignette.width, vignette.height)
    const blurDataUrl = vignette.toDataURL('image/webp', 0.6)

    /* Débit : ce que la limite autorise pour cette durée, plafonné à ce
       qu'un écran mérite (2,5 Mb/s en 720p, c'est déjà propre). 12 % de
       marge pour le conteneur et les images clés. */
    const bitsParSeconde = Math.floor(
      Math.min(2_500_000, (options.maxBytes * 8 * 0.88) / duration),
    )

    const flux = canvas.captureStream(30)
    const recorder = new MediaRecorder(flux, {
      mimeType: format.codec,
      videoBitsPerSecond: bitsParSeconde,
    })
    const morceaux: Blob[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) morceaux.push(event.data)
    }

    const fini = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () =>
        resolve(new Blob(morceaux, { type: format.mimeType }))
      recorder.onerror = () => reject(new Error('Enregistrement interrompu.'))
    })

    /* Lecture + dessin image par image, jusqu'à la durée retenue. */
    let animation = 0
    const dessiner = () => {
      context.drawImage(source, 0, 0, width, height)
      options.onProgress?.(Math.min(1, source.currentTime / duration))
      if (source.currentTime >= duration || source.ended) {
        recorder.stop()
        source.pause()
        return
      }
      animation = requestAnimationFrame(dessiner)
    }

    source.currentTime = 0
    recorder.start(250)
    await source.play()
    animation = requestAnimationFrame(dessiner)

    const data = await fini
    cancelAnimationFrame(animation)
    options.onProgress?.(1)

    if (data.size === 0) throw new Error('La recompression n’a rien produit.')

    return { data, mimeType: format.mimeType, width, height, blurDataUrl, duration }
  } finally {
    URL.revokeObjectURL(source.src)
    source.removeAttribute('src')
    source.load()
  }
}
