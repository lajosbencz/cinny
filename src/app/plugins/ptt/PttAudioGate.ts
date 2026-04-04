/**
 * Gates outgoing audio by routing the mic stream through a GainNode.
 * When PTT is active and key is released, gain is set to 0 (silence).
 * When PTT key is held, gain is set to 1 (live audio).
 *
 * This is transparent to Element Call — no mute status is broadcast.
 * The stream returned by getUserMedia already contains the processed
 * track, so no RTCRtpSender interception is needed.
 */
export class PttAudioGate {
  private audioCtx: AudioContext | null = null;

  private gainNode: GainNode | null = null;

  private active = false;

  private installed = false;

  /**
   * Inject a getUserMedia interceptor into the iframe's JS context.
   * Must be called after iframe loads but before getUserMedia is called.
   */
  install(iframeWindow: Window): void {
    if (this.installed) return;
    this.installed = true;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const gate = this;

    const origGUM = iframeWindow.navigator.mediaDevices.getUserMedia.bind(
      iframeWindow.navigator.mediaDevices
    );
    const { mediaDevices } = iframeWindow.navigator;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IframeAudioContext = (iframeWindow as any).AudioContext as typeof AudioContext;

    mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      const stream = await origGUM(constraints);
      if (constraints?.audio && stream.getAudioTracks().length > 0) {
        const ctx = new IframeAudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const gain = ctx.createGain();
        gain.gain.value = gate.active ? 0 : 1;
        source.connect(gain);
        const dest = ctx.createMediaStreamDestination();
        gain.connect(dest);

        gate.audioCtx = ctx;
        gate.gainNode = gain;

        const [originalTrack] = stream.getAudioTracks();
        const [processedTrack] = dest.stream.getAudioTracks();
        stream.removeTrack(originalTrack);
        stream.addTrack(processedTrack);
      }
      return stream;
    };
  }

  /** Enable PTT gating — silence the mic */
  enable(): void {
    this.active = true;
    this.audioCtx?.resume();
    if (this.gainNode) {
      this.gainNode.gain.value = 0;
    }
  }

  /** PTT key pressed — restore mic volume */
  press(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = 1;
    }
  }

  /** PTT key released — silence the mic */
  release(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = 0;
    }
  }

  /** Disable PTT gating — restore mic volume */
  disable(): void {
    this.active = false;
    if (this.gainNode) {
      this.gainNode.gain.value = 1;
    }
  }

  dispose(): void {
    this.disable();
    this.audioCtx?.close();
    this.gainNode = null;
    this.audioCtx = null;
    this.installed = false;
  }
}
