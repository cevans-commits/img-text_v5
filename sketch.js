let media; 
let isVideo = false;
let asciiString = ""; 
let gfx; 
const PREVIEW_WIDTH = 600;

let recorder;
let chunks = [];
let isRecording = false;

function setup() {
  pixelDensity(1); 
  let canvas = createCanvas(PREVIEW_WIDTH, 400); 
  canvas.parent('canvas-container'); 
  
  background(255);
  fill(44, 44, 44);
  textAlign(CENTER, CENTER);
  textSize(16);
  textFont('Google Sans Code');
  text("UPLOAD MEDIA TO PREVIEW", width / 2, height / 2);
  
  document.getElementById('image-upload').addEventListener('change', handleUpload);
  document.getElementById('export-btn').addEventListener('click', handleExport);
  
  document.getElementById('fidelity-slider').addEventListener('input', () => { if(!isVideo) redraw(); });
  document.getElementById('char-input').addEventListener('input', () => { if(!isVideo) redraw(); });
}

function handleUpload(event) {
  let file = event.target.files[0];
  if (!file) return;
  let url = URL.createObjectURL(file);

  if (file.type.startsWith('video/')) {
    isVideo = true;
    if (media && media.remove) media.remove(); 
    media = createVideo(url, () => {
      media.volume(0); 
      media.loop();    
      media.hide();    
      setupMediaDimensions(media.width, media.height);
      
      // Monitor for the end of the video to stop recording
      media.elt.onended = () => {
        if (isRecording) {
          toggleRecording();
          media.loop(); // Resume looping for the browser preview
        }
      };

      loop();          
    });
  } else if (file.type.startsWith('image/')) {
    isVideo = false;
    if (media && media.remove) media.remove(); 
    media = loadImage(url, () => {
      setupMediaDimensions(media.width, media.height);
      noLoop(); 
      redraw(); 
    });
  }
}

function setupMediaDimensions(w, h) {
  let aspect = h / w;
  let newHeight = PREVIEW_WIDTH * aspect;
  resizeCanvas(PREVIEW_WIDTH, newHeight);
  gfx = createGraphics(PREVIEW_WIDTH, newHeight);
  gfx.pixelDensity(1); 
}

function draw() {
  if (!media || !gfx) return; 
  if (isVideo && media.elt.readyState < 2) return;

  background(244, 244, 240); 
  fill(44, 44, 44); 
  noStroke();
  textFont('Google Sans Code');
  textAlign(LEFT, TOP); 
  
  let stepSize = parseInt(document.getElementById('fidelity-slider').value, 10); 
  textSize(stepSize); 
  let density = document.getElementById('char-input').value || " ";
  
  gfx.image(media, 0, 0, gfx.width, gfx.height);
  gfx.loadPixels();
  
  asciiString = ""; 
  for (let y = 0; y < gfx.height; y += stepSize) {
    for (let x = 0; x < gfx.width; x += (stepSize * 0.6)) {
      const pixelIndex = (floor(x) + floor(y) * gfx.width) * 4;
      const avgBrightness = (gfx.pixels[pixelIndex] + gfx.pixels[pixelIndex+1] + gfx.pixels[pixelIndex+2]) / 3;
      const char = density.charAt(floor(map(avgBrightness, 0, 255, 0, density.length - 1)));
      text(char, x, y);
      asciiString += char;
    }
    asciiString += '\n';
  }
}

function handleExport() {
  if (!media) return;
  let format = document.getElementById('export-format').value;
  let scale = parseInt(document.getElementById('export-scale').value, 10);

  if (format === 'png' || format === 'jpg') {
    let hiRes = createGraphics(width * scale, height * scale);
    hiRes.pixelDensity(1);
    hiRes.background(244, 244, 240);
    hiRes.fill(44, 44, 44);
    hiRes.noStroke();
    hiRes.textFont('Google Sans Code');
    hiRes.textAlign(LEFT, TOP);
    
    let stepSize = parseInt(document.getElementById('fidelity-slider').value, 10) * scale; 
    hiRes.textSize(stepSize);
    let density = document.getElementById('char-input').value || " ";

    for (let y = 0; y < height * scale; y += stepSize) {
      for (let x = 0; x < width * scale; x += (stepSize * 0.6)) {
        const sX = floor(x / scale);
        const sY = floor(y / scale);
        const pIdx = (sX + sY * gfx.width) * 4;
        const avg = (gfx.pixels[pIdx] + gfx.pixels[pIdx+1] + gfx.pixels[pIdx+2]) / 3;
        hiRes.text(density.charAt(floor(map(avg, 0, 255, 0, density.length - 1))), x, y);
      }
    }
    save(hiRes, 'img-text_v4_export', format);
  } else if (format === 'webm') {
    // PRE-RECORDING SEQUENCE: Reset and play once
    if (!isRecording) {
      media.noLoop(); // Stop looping to allow 'onended' to fire
      media.stop();   // Jump to frame zero
      media.play();   // Start playback
      toggleRecording();
    } else {
      toggleRecording(); // Manual stop if user clicks button again
    }
  } else if (format === 'text') {
    copyToClipboard();
  }
}

function toggleRecording() {
  let btnSpan = document.querySelector('#export-btn span');
  if (isRecording) {
    recorder.stop();
    btnSpan.innerText = "EXPORT CANVAS";
    isRecording = false;
  } else {
    let canvasElement = document.querySelector('canvas');
    let stream = canvasElement.captureStream(30); 
    
    // High bitrate config
    recorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000 
    });
    
    chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      let blob = new Blob(chunks, { type: 'video/webm' });
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'img-text_v4_export.webm';
      a.click();
    };
    recorder.start();
    btnSpan.innerText = "RECORDING...";
    isRecording = true;
  }
}

function copyToClipboard() {
  if (asciiString === "") return;
  navigator.clipboard.writeText(asciiString).then(() => {
    alert("ASCII copied to clipboard!");
  });
}