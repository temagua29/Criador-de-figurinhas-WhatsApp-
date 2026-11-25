# 🎬 Sticker Maker (Figurinha com áudio)

A small, dependency-free web app that turns a video into a WhatsApp-style sticker. Upload a clip, trim it, choose the square area that stays visible, and export a 512×512 sticker: with sound, animated without sound, or as a still image.

Everything runs in the browser. Your video is never uploaded to a server.

## Features

- **Three sticker modes**
  - 🔊 **With audio**: short clip plus its sound
  - 🎞 **Animated**: motion only, no audio track
  - 🖼 **Still**: a single frame, exported as WebP (PNG as fallback)
- **Trim tool**: start and end sliders, up to 10 seconds
- **Crop tool**: drag a square over the video and resize it with the zoom slider
- **Preview**: play the trimmed segment before exporting
- **Share or download**: opens the device share sheet (choose WhatsApp) or saves the file
- **Light and dark theme**, mobile-first layout

## Project structure

```
.
├── Index.html   # markup
├── style.css    # styles (light/dark theme via CSS variables)
├── script.js    # all app logic
└── README.md
```

No build step, no npm, no external libraries.

## Running it

**Locally**

Open `Index.html` in a modern browser. Trimming, cropping and exporting work this way.

The **Share** button needs a secure context (HTTPS or `localhost`), so for full functionality serve the folder:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open `http://localhost:8000`.

**Hosting**

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Upload the three files, keeping them in the same folder. File names are case-sensitive on most servers, so keep `Index.html`, `style.css` and `script.js` exactly as named.

## How to use

1. Tap **Choose video** and pick a file.
2. Select a mode: **With audio**, **Animated** or **Still**.
3. Drag the square to frame the part you want, and use **Crop size** to zoom.
4. Set **Start** and **End** (or the single **Frame** in still mode).
5. Tap **Preview** to check the result, then **Generate sticker**.
6. Tap **Send to WhatsApp** (opens the share sheet) or **Download**.

## How it works

| Step | Technique |
| --- | --- |
| Playback and seeking | HTML `<video>` element with a local object URL |
| Crop | A `<canvas>` of 512×512; each frame is drawn from the selected square region of the video |
| Audio | Web Audio API: the video's audio is routed into a `MediaStreamDestination` and added to the recording |
| Encoding | `MediaRecorder` records the canvas stream (plus audio in audio mode) |
| Still image | `canvas.toBlob()` as `image/webp`, falling back to PNG |
| Sharing | Web Share API with files (`navigator.share`) |

The output container is chosen at runtime: MP4 if the browser can record it, otherwise WebM.

## Limitations

- **WhatsApp import is not guaranteed.** WhatsApp offers no public web API for adding stickers, and audio stickers are a very recent feature that is rolling out gradually. The Share button hands the file to WhatsApp as a regular attachment. If WhatsApp does not accept it as a sticker, download the file and use WhatsApp's own sticker creation option.
- **Animated output is MP4/WebM, not animated WebP.** Browsers cannot encode animated WebP natively, and this project avoids external encoders. If you need animated WebP, convert the exported file (for example with `ffmpeg`).
- **Export runs in real time.** A 6 second clip takes about 6 seconds to record. Keep the tab in the foreground while exporting.
- **Size limits.** WhatsApp limits animated stickers (historically 500 KB and 10 seconds). The app shows the exported file size so you can check it. If the file is too large, shorten the clip or reduce the crop area.
- **Codec support varies.** Some videos (certain HEVC/H.265 files, for example) may not play in every browser.

## Browser support

| Browser | Status |
| --- | --- |
| Chrome / Edge (desktop and Android) | Supported |
| Safari 14.1+ (macOS and iOS) | Supported, exports MP4 |
| Firefox | Trim, crop and still export work; share-sheet support is limited on desktop |

Requires `MediaRecorder`, `canvas.captureStream`, and the Web Audio API.

## Customizing

- **Maximum duration**: change the `MAX` constant at the top of `script.js` (default `10`).
- **Output size**: the `512` values in the export code control the sticker dimensions.
- **Quality**: adjust `videoBitsPerSecond` (default `1400000`) in the `MediaRecorder` options. Lower it for smaller files.
- **Colors**: edit the CSS variables at the top of `style.css`.

## Privacy

All processing happens locally in your browser. No video, audio or image data leaves your device, and the app makes no network requests.

## License

Choose a license that fits your needs (for example MIT) and add a `LICENSE` file.
