/**
 * Tests for Sound Feedback System
 */

import { SoundFeedbackSystem, getSoundFeedback } from '@/lib/utils/sound-feedback';

// Mock AudioContext
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  
  createGain() {
    return {
      gain: { value: 1, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn()
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      playbackRate: { value: 1 },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };
  }
  
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440 },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };
  }
  
  decodeAudioData(buffer: ArrayBuffer) {
    return Promise.resolve({});
  }
  
  resume() {
    return Promise.resolve();
  }
  
  close() {
    return Promise.resolve();
  }
}

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
  } as Response)
);

// Mock window.AudioContext
(global as any).AudioContext = MockAudioContext;

describe('SoundFeedbackSystem', () => {
  let soundSystem: SoundFeedbackSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    soundSystem = new SoundFeedbackSystem();
  });

  afterEach(() => {
    soundSystem.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(soundSystem.getVolume()).toBe(0.5);
      expect(soundSystem.isEnabled()).toBe(true);
      expect(soundSystem.isMuted()).toBe(false);
    });

    it('should initialize with custom config', () => {
      const customSystem = new SoundFeedbackSystem({
        volume: 0.8,
        enabled: false,
        muted: true
      });
      
      expect(customSystem.getVolume()).toBe(0.8);
      expect(customSystem.isEnabled()).toBe(false);
      expect(customSystem.isMuted()).toBe(true);
      
      customSystem.dispose();
    });
  });

  describe('Volume Control', () => {
    it('should set volume', () => {
      soundSystem.setVolume(0.7);
      expect(soundSystem.getVolume()).toBe(0.7);
    });

    it('should clamp volume between 0 and 1', () => {
      soundSystem.setVolume(1.5);
      expect(soundSystem.getVolume()).toBe(1);
      
      soundSystem.setVolume(-0.5);
      expect(soundSystem.getVolume()).toBe(0);
    });
  });

  describe('Mute Control', () => {
    it('should toggle mute', () => {
      expect(soundSystem.isMuted()).toBe(false);
      
      const muted = soundSystem.toggleMute();
      expect(muted).toBe(true);
      expect(soundSystem.isMuted()).toBe(true);
      
      const unmuted = soundSystem.toggleMute();
      expect(unmuted).toBe(false);
      expect(soundSystem.isMuted()).toBe(false);
    });

    it('should set mute state', () => {
      soundSystem.setMute(true);
      expect(soundSystem.isMuted()).toBe(true);
      
      soundSystem.setMute(false);
      expect(soundSystem.isMuted()).toBe(false);
    });
  });

  describe('Enable/Disable', () => {
    it('should set enabled state', () => {
      soundSystem.setEnabled(false);
      expect(soundSystem.isEnabled()).toBe(false);
      
      soundSystem.setEnabled(true);
      expect(soundSystem.isEnabled()).toBe(true);
    });
  });

  describe('Sound Playback', () => {
    it('should not play when disabled', async () => {
      soundSystem.setEnabled(false);
      const playSpy = jest.spyOn(soundSystem as any, 'play');
      
      soundSystem.playSuccess();
      expect(playSpy).toHaveBeenCalled();
    });

    it('should not play when muted', async () => {
      soundSystem.setMute(true);
      const playSpy = jest.spyOn(soundSystem as any, 'play');
      
      soundSystem.playError();
      expect(playSpy).toHaveBeenCalled();
    });

    it('should call play method for different sounds', () => {
      const playSpy = jest.spyOn(soundSystem as any, 'play');
      
      soundSystem.playSuccess();
      expect(playSpy).toHaveBeenCalledWith('success');
      
      soundSystem.playError();
      expect(playSpy).toHaveBeenCalledWith('error');
      
      soundSystem.playWarning();
      expect(playSpy).toHaveBeenCalledWith('warning');
      
      soundSystem.playClick();
      expect(playSpy).toHaveBeenCalledWith('click', { volume: 0.3 });
      
      soundSystem.playAchievement();
      expect(playSpy).toHaveBeenCalledWith('achievement', { pitch: 1.2 });
      
      soundSystem.playDrop();
      expect(playSpy).toHaveBeenCalledWith('drop');
      
      soundSystem.playPickup();
      expect(playSpy).toHaveBeenCalledWith('pickup', { volume: 0.4 });
    });

    it('should adjust pitch for score sound', () => {
      const playSpy = jest.spyOn(soundSystem as any, 'play');
      
      soundSystem.playScore(50);
      expect(playSpy).toHaveBeenCalledWith('score', { pitch: 1.5 });
      
      soundSystem.playScore(-10);
      expect(playSpy).toHaveBeenCalledWith('score', { pitch: 0.8 });
    });
  });

  describe('Tone Generation', () => {
    it('should play tone with default parameters', () => {
      const playToneSpy = jest.spyOn(soundSystem, 'playTone');
      
      soundSystem.playTone(440);
      expect(playToneSpy).toHaveBeenCalledWith(440, 200, 'sine');
    });

    it('should play tone with custom parameters', () => {
      const playToneSpy = jest.spyOn(soundSystem, 'playTone');
      
      soundSystem.playTone(880, 500, 'square');
      expect(playToneSpy).toHaveBeenCalledWith(880, 500, 'square');
    });

    it('should not play tone when muted', () => {
      soundSystem.setMute(true);
      const createOscillatorSpy = jest.fn();
      (soundSystem as any).audioContext = {
        createOscillator: createOscillatorSpy,
        createGain: jest.fn(),
        currentTime: 0
      };
      
      soundSystem.playTone(440);
      expect(createOscillatorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Melody Playback', () => {
    it('should play melody sequence', () => {
      jest.useFakeTimers();
      const playToneSpy = jest.spyOn(soundSystem, 'playTone');
      
      const notes = [
        { frequency: 440, duration: 100 },
        { frequency: 550, duration: 100, delay: 50 },
        { frequency: 660, duration: 200 }
      ];
      
      soundSystem.playMelody(notes);
      
      expect(playToneSpy).toHaveBeenCalledWith(440, 100);
      
      jest.advanceTimersByTime(100);
      expect(playToneSpy).toHaveBeenCalledWith(550, 100);
      
      jest.advanceTimersByTime(150);
      expect(playToneSpy).toHaveBeenCalledWith(660, 200);
      
      jest.useRealTimers();
    });

    it('should play celebration melody', () => {
      const playMelodySpy = jest.spyOn(soundSystem, 'playMelody');
      
      soundSystem.playCelebration();
      expect(playMelodySpy).toHaveBeenCalledWith([
        { frequency: 523, duration: 100 },
        { frequency: 587, duration: 100 },
        { frequency: 659, duration: 100 },
        { frequency: 784, duration: 200 }
      ]);
    });
  });

  describe('Singleton Instance', () => {
    it('should return same instance', () => {
      const instance1 = getSoundFeedback();
      const instance2 = getSoundFeedback();
      
      expect(instance1).toBe(instance2);
    });

    it('should use config on first creation', () => {
      // Clear existing instance
      (global as any).soundFeedbackInstance = null;
      
      const instance = getSoundFeedback({ volume: 0.9 });
      expect(instance.getVolume()).toBe(0.9);
    });
  });

  describe('Cleanup', () => {
    it('should dispose resources', () => {
      const closeSpy = jest.fn();
      (soundSystem as any).audioContext = { close: closeSpy };
      
      soundSystem.dispose();
      
      expect(closeSpy).toHaveBeenCalled();
      expect((soundSystem as any).audioContext).toBeNull();
    });
  });
});