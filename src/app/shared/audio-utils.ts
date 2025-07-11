// Utilidad para convertir audio a WAV PCM 16kHz, 16bit, mono
// Basado en Web Audio API

export async function convertBlobToWavPcm16kMono(blob: Blob): Promise<Blob> {
  // Crear un contexto de audio offline para resamplear y convertir a mono
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // Resamplear a 16kHz y convertir a mono
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * 16000), 16000);
  const source = offlineCtx.createBufferSource();

  // Si el audio es estéreo, mezclar a mono
  let monoBuffer: AudioBuffer;
  if (audioBuffer.numberOfChannels > 1) {
    const channelData = new Float32Array(audioBuffer.length);
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const data = audioBuffer.getChannelData(i);
      for (let j = 0; j < data.length; j++) {
        channelData[j] += data[j] / audioBuffer.numberOfChannels;
      }
    }
    monoBuffer = offlineCtx.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
    monoBuffer.copyToChannel(channelData, 0);
  } else {
    monoBuffer = audioBuffer;
  }

  source.buffer = monoBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBuffer = encodeWAV(renderedBuffer);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function encodeWAV(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1;
  const sampleRate = 16000;
  const format = 1; // PCM
  const bitDepth = 16;
  const samples = audioBuffer.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // Escribir encabezado RIFF
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true); // ByteRate
  view.setUint16(32, numChannels * bitDepth / 8, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Escribir datos PCM
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
} 