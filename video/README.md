# Video de la presentación (Hyperframes)

Composición HTML renderizada a MP4 con [Hyperframes](https://hyperframes.heygen.com). La locución se genera con la voz `Paulina` (es_MX) de macOS.

```bash
cd video
npm run audio    # genera audio/*.wav desde el guion de slides.mjs (requiere macOS y ffmpeg)
npm run build    # genera index.html con las duraciones reales del audio
npm run check    # valida la composición
npm run render   # renders/presentacion.mp4 (1080p)
```

El contenido de cada diapositiva y su guion están en `slides.mjs`. El MP4 y el audio no se versionan.
