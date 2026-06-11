/**
 * MotionRank AI — Voice Coach v2
 * 
 * Wraps browser SpeechSynthesis API for real-time workout coaching.
 * Supports: multiple languages, named voice personas, smart throttling,
 * form corrections, and motivational callouts.
 */

// Named persona preferences — maps persona name → voice name substrings to match
const PERSONA_HINTS = {
  'Auto':    [],
  'Sara':    ['Sara', 'Samantha', 'Zira', 'Female', 'Google UK English Female'],
  'Joe':     ['Daniel', 'David', 'James', 'Male', 'Google UK English Male'],
  'Emily':   ['Emily', 'Catherine', 'Google US English'],
  'Carlos':  ['Jorge', 'Pablo', 'Google español'],
  'Priya':   ['Lekha', 'Google हिन्दी', 'Hindi'],
};

class VoiceCoach {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.enabled = true;
    this.selectedVoice = null;
    this.language = 'en';
    this.persona = 'Auto';
    this.lastSpokenText = '';
    this.lastSpokenTime = 0;
    this.cooldownMs = 3200;

    this._loadVoices();
    if (this.synth?.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = this._loadVoices.bind(this);
    }
  }

  _loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.voices.length > 0) {
      this._pickVoice();
    }
  }

  /**
   * Pick the best voice matching current language + persona.
   */
  _pickVoice() {
    const matching = this.voices.filter(v => v.lang.startsWith(this.language));
    if (matching.length === 0) {
      this.selectedVoice = this.voices[0] || null;
      return;
    }

    // Try to match persona hints
    const hints = PERSONA_HINTS[this.persona] || [];
    if (hints.length > 0) {
      for (const hint of hints) {
        const found = matching.find(v => v.name.includes(hint));
        if (found) { this.selectedVoice = found; return; }
      }
    }

    // Fallback: prefer Google/premium voices
    const premium = matching.find(v => v.name.includes('Google') || v.name.includes('Premium'));
    this.selectedVoice = premium || matching[0];
  }

  /**
   * Get list of available voice personas for the current language.
   */
  getAvailablePersonas() {
    const matching = this.voices.filter(v => v.lang.startsWith(this.language));
    const available = ['Auto'];

    for (const [name, hints] of Object.entries(PERSONA_HINTS)) {
      if (name === 'Auto') continue;
      const found = hints.some(h => matching.some(v => v.name.includes(h)));
      if (found) available.push(name);
    }

    return available;
  }

  setLanguage(langCode) {
    this.language = langCode;
    this._pickVoice();
  }

  setPersona(personaName) {
    this.persona = personaName;
    this._pickVoice();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on && this.synth?.speaking) this.synth.cancel();
  }

  /**
   * Speak text with throttling. `force` bypasses cooldown.
   */
  async speak(text, force = false) {
    if (!this.enabled || !text || !this.synth) return;
    if (this.voices.length === 0) return;

    const now = Date.now();
    if (!force) {
      if (now - this.lastSpokenTime < this.cooldownMs) return;
      if (text === this.lastSpokenText && now - this.lastSpokenTime < 10000) return;
    }

    if (this.synth.speaking && force) {
      this.synth.cancel();
      // Small delay after cancel to avoid audio glitches
      await new Promise(r => setTimeout(r, 80));
    }

    const utt = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) utt.voice = this.selectedVoice;
    utt.rate = 0.95;   // Natural pace — clearer than fast
    utt.pitch = 1.0;   // Neutral pitch — no distortion
    utt.volume = 1.0;  // Full volume

    this.synth.speak(utt);
    this.lastSpokenText = text;
    this.lastSpokenTime = now;
  }

  // ── Coaching convenience ──────────────────────────

  correction(feedbackString) {
    if (!feedbackString || feedbackString === 'good' || feedbackString === 'Ready') return;
    let t = feedbackString.replace(/_/g, ' ');
    // Add punchy follow-ups for common issues
    if (t.toLowerCase().includes('hips') || t.toLowerCase().includes('sagging')) t += '. Tighten your core!';
    else if (t.toLowerCase().includes('straight') || t.toLowerCase().includes('back')) t += '. Keep it straight!';
    else if (t.toLowerCase().includes('lower') || t.toLowerCase().includes('deep')) t += '. Go lower!';
    else if (t.toLowerCase().includes('knee'))  t += '. Watch your knees!';
    this.speak(t, true);
  }

  motivation(repCount) {
    const pumps = [
      'Keep it up!', 'Great job!', 'Looking strong!',
      'Push it!', 'Awesome form!', "You're crushing it!",
      'Beast mode!', 'Nice!', "Don't stop now!"
    ];
    if (repCount > 0 && repCount % 10 === 0) {
      this.speak(`That's ${repCount}! ${pumps[Math.floor(Math.random() * pumps.length)]}`, true);
    } else if (repCount > 0 && repCount % 5 === 0) {
      this.speak(pumps[Math.floor(Math.random() * pumps.length)], false);
    }
  }

  welcome() {
    this.speak("Coach ready. Let's go!", true);
  }

  sessionEnd(reps) {
    if (reps > 0) {
      this.speak(`Workout done! ${reps} reps total. Great session!`, true);
    }
  }
}

const voiceCoach = new VoiceCoach();
export default voiceCoach;
export { PERSONA_HINTS };
