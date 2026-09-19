import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environment';
import { convertBlobToWavPcm16kMono } from '../audio-utils';

/**
 * Estados posibles del dictado por voz. El consumidor los usa para pintar
 * el boton de microfono sin tener que replicar la maquina de estados.
 */
export type SpeechInputState =
  | 'unsupported'   // el navegador no expone getUserMedia / MediaRecorder
  | 'idle'          // listo para grabar
  | 'listening'     // grabando
  | 'processing'    // convirtiendo y transcribiendo
  | 'denied'        // el usuario nego el permiso de microfono
  | 'error';        // fallo la grabacion o la transcripcion

export class SpeechInputError extends Error {
  constructor(message: string, readonly state: SpeechInputState) {
    super(message);
  }
}

/**
 * Dictado por voz reutilizable: graba del microfono, normaliza a WAV PCM
 * 16kHz mono y lo transcribe contra `api/Speech/audio-to-text`.
 *
 * Se apoya en el mismo endpoint que ya usaba la creacion de cotizaciones por
 * audio, en vez de la Web Speech API, porque asi el comportamiento es identico
 * en todos los navegadores y no depende del reconocimiento local.
 */
@Injectable({ providedIn: 'root' })
export class SpeechInputService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  constructor(private http: HttpClient) {}

  /** True si el navegador puede grabar audio. */
  get isSupported(): boolean {
    return typeof navigator !== 'undefined'
      && !!navigator.mediaDevices?.getUserMedia
      && typeof MediaRecorder !== 'undefined';
  }

  /**
   * Pide permiso y empieza a grabar.
   * @throws SpeechInputError con state 'unsupported' o 'denied'.
   */
  async start(): Promise<void> {
    if (!this.isSupported) {
      throw new SpeechInputError(
        'Tu navegador no permite grabar audio. Escribe el mensaje a mano.',
        'unsupported'
      );
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // getUserMedia rechaza tanto por permiso denegado como por no haber
      // microfono; para el usuario la accion a tomar es la misma.
      throw new SpeechInputError(
        'No pudimos usar el microfono. Revisa los permisos del navegador.',
        'denied'
      );
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : 'audio/webm;codecs=opus';

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();
  }

  /**
   * Detiene la grabacion y devuelve el texto transcrito.
   * @throws SpeechInputError con state 'error' si no hay audio o falla la transcripcion.
   */
  async stopAndTranscribe(): Promise<string> {
    const recorder = this.mediaRecorder;
    if (!recorder) {
      throw new SpeechInputError('No habia ninguna grabacion en curso.', 'error');
    }

    await new Promise<void>(resolve => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    this.releaseStream();

    if (this.chunks.length === 0) {
      throw new SpeechInputError('No se grabo audio. Intentalo de nuevo.', 'error');
    }

    const raw = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
    this.chunks = [];
    this.mediaRecorder = null;

    let wav: Blob;
    try {
      wav = await convertBlobToWavPcm16kMono(raw);
    } catch {
      throw new SpeechInputError('No se pudo procesar el audio grabado.', 'error');
    }

    const form = new FormData();
    form.append('audioFile', wav, 'recording.wav');

    let text: string | undefined;
    try {
      const res = await firstValueFrom(
        this.http.post<{ text?: string }>(
          `${environment.apiUrl}/api/Speech/audio-to-text`,
          form,
          { headers: this.authHeaders() }
        )
      );
      text = res?.text;
    } catch {
      throw new SpeechInputError('No se pudo transcribir el audio. Intentalo de nuevo.', 'error');
    }

    if (!text || !text.trim()) {
      throw new SpeechInputError(
        'No entendimos el audio. Habla mas claro e intentalo de nuevo.',
        'error'
      );
    }
    return text.trim();
  }

  /** Aborta la grabacion sin transcribir (p. ej. al cerrar el chat). */
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.chunks = [];
    this.releaseStream();
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  /** El resto de servicios leen el token igual; no hay interceptor global. */
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
