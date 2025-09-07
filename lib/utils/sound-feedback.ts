/**
 * Sound Feedback System
 * Audio feedback utilities for user interactions
 */

interface SoundConfig {
  volume: number;
  enabled: boolean;
  muted: boolean;
}

interface SoundLibrary {
  success: string;
  error: string;
  warning: string;
  click: string;
  achievement: string;
  drop: string;
  pickup: string;
  score: string;
}

class SoundFeedbackSystem {
  private config: SoundConfig;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private gainNode: GainNode | null = null;
  
  // Sound file paths (using data URLs for simplicity)
  private soundLibrary: SoundLibrary = {
    // These are placeholder data URLs - in production, use actual sound files
    success: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACA',
    error: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAAA==',
    warning: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAAA==',
    click: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAAA==',
    achievement: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAAA==',
    drop: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAAA==',
    pickup: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAAA==',
    score: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAAA=='
  };

  constructor(config?: Partial<SoundConfig>) {
    this.config = {
      volume: 0.5,
      enabled: true,
      muted: false,
      ...config
    };

    // Initialize audio context on user interaction
    if (typeof window !== 'undefined') {
      this.initializeAudioContext();
    }
  }

  /**
   * Initialize Web Audio API context
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported');
        return;
      }

      this.audioContext = new AudioContextClass();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.updateVolume();

      // Pre-load sounds
      await this.preloadSounds();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  /**
   * Preload all sounds
   */
  private async preloadSounds(): Promise<void> {
    if (!this.audioContext) return;

    const loadPromises = Object.entries(this.soundLibrary).map(async ([key, url]) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.sounds.set(key, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load sound: ${key}`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Play a sound effect
   */
  public async play(soundName: keyof SoundLibrary, options?: { volume?: number; pitch?: number }): Promise<void> {
    if (!this.config.enabled || this.config.muted || !this.audioContext || !this.gainNode) {
      return;
    }

    // Ensure audio context is running (needed for user gesture requirement)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      
      // Apply pitch if specified
      if (options?.pitch) {
        source.playbackRate.value = options.pitch;
      }

      // Create a temporary gain node for individual volume control
      if (options?.volume !== undefined) {
        const tempGain = this.audioContext.createGain();
        tempGain.gain.value = options.volume;
        source.connect(tempGain);
        tempGain.connect(this.gainNode);
      } else {
        source.connect(this.gainNode);
      }

      source.start(0);
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  /**
   * Play success sound
   */
  public playSuccess(): void {
    this.play('success');
  }

  /**
   * Play error sound
   */
  public playError(): void {
    this.play('error');
  }

  /**
   * Play warning sound
   */
  public playWarning(): void {
    this.play('warning');
  }

  /**
   * Play click sound
   */
  public playClick(): void {
    this.play('click', { volume: 0.3 });
  }

  /**
   * Play achievement sound
   */
  public playAchievement(): void {
    this.play('achievement', { pitch: 1.2 });
  }

  /**
   * Play drop sound (for drag and drop)
   */
  public playDrop(): void {
    this.play('drop');
  }

  /**
   * Play pickup sound (for drag start)
   */
  public playPickup(): void {
    this.play('pickup', { volume: 0.4 });
  }

  /**
   * Play score increment sound
   */
  public playScore(points: number): void {
    const pitch = points > 0 ? 1 + (points / 100) : 0.8;
    this.play('score', { pitch });
  }

  /**
   * Set volume (0-1)
   */
  public setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.updateVolume();
  }

  /**
   * Update gain node volume
   */
  private updateVolume(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = this.config.volume;
    }
  }

  /**
   * Get current volume
   */
  public getVolume(): number {
    return this.config.volume;
  }

  /**
   * Toggle mute
   */
  public toggleMute(): boolean {
    this.config.muted = !this.config.muted;
    return this.config.muted;
  }

  /**
   * Set mute state
   */
  public setMute(muted: boolean): void {
    this.config.muted = muted;
  }

  /**
   * Check if muted
   */
  public isMuted(): boolean {
    return this.config.muted;
  }

  /**
   * Enable/disable sound system
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Generate a tone (for custom sounds)
   */
  public playTone(frequency: number, duration: number = 200, type: OscillatorType = 'sine'): void {
    if (!this.config.enabled || this.config.muted || !this.audioContext || !this.gainNode) {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const tempGain = this.audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      // Envelope for smooth sound
      tempGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      tempGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
      tempGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

      oscillator.connect(tempGain);
      tempGain.connect(this.gainNode);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.error('Failed to play tone:', error);
    }
  }

  /**
   * Play a sequence of tones (for melodies)
   */
  public playMelody(notes: Array<{ frequency: number; duration: number; delay?: number }>): void {
    if (!this.config.enabled || this.config.muted || !this.audioContext) {
      return;
    }

    let currentTime = 0;
    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.frequency, note.duration);
      }, currentTime);
      currentTime += note.duration + (note.delay || 0);
    });
  }

  /**
   * Play celebration melody
   */
  public playCelebration(): void {
    this.playMelody([
      { frequency: 523, duration: 100 },  // C
      { frequency: 587, duration: 100 },  // D
      { frequency: 659, duration: 100 },  // E
      { frequency: 784, duration: 200 },  // G
    ]);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.sounds.clear();
    this.gainNode = null;
  }
}

// Create singleton instance
let soundFeedbackInstance: SoundFeedbackSystem | null = null;

/**
 * Get or create sound feedback instance
 */
export function getSoundFeedback(config?: Partial<SoundConfig>): SoundFeedbackSystem {
  if (!soundFeedbackInstance) {
    soundFeedbackInstance = new SoundFeedbackSystem(config);
  }
  return soundFeedbackInstance;
}

/**
 * Export the class for testing
 */
export { SoundFeedbackSystem };

/**
 * Export types
 */
export type { SoundConfig, SoundLibrary };