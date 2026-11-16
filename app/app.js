/* ============================================================
   Recall — working mobile app built from the Figma file "Recall"
   ============================================================ */
'use strict';

/* ---------- icons ---------- */
/* I.* comes from reicon-icons.js — real Reicon artwork (https://reicon.dev, MIT).
   The binoculars empty-state is a custom illustration, kept here. */
const IL = {
  zenBell: `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="36" fill="var(--accent-soft)" />
    <path d="M40 18c-7.5 0-13.5 6-13.5 13.5v9.5l-3.8 6c-.9 1.4.1 3.2 1.8 3.2h31c1.7 0 2.7-1.8 1.8-3.2l-3.8-6v-9.5C53.5 24 47.5 18 40 18Z" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M35 50.2a5 5 0 0 0 10 0" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M40 14v4" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M22 28c-2.4 2.4-3.5 5.8-3.5 9.2" stroke="var(--ink-40)" stroke-width="2" stroke-linecap="round"/>
    <path d="M58 28c2.4 2.4 3.5 5.8 3.5 9.2" stroke="var(--ink-40)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="21" cy="22" r="1.5" fill="var(--accent)"/>
    <circle cx="59" cy="22" r="1.5" fill="var(--accent)"/>
  </svg>`,
  binoculars: '',
  /* the icon set's plus is a hairline cross that disappears at button sizes,
     so the add-reminder controls use a properly weighted one */
  plus: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5.4v13.2M5.4 12h13.2"/></svg>`
};
IL.binoculars = IL.zenBell;

/* ---------- constants ---------- */
const DAY_MS = 864e5, WEEKDAYS = ['S','M','T','W','T','F','S'], WD_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WD3 = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const WD_FULL_NAMES = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  pt: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
};

const WD_SHORT = {
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  es: ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'],
  fr: ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'],
  de: ['SO',  'MO',  'DI',  'MI',  'DO',  'FR',  'SA'],
  pt: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
};

const CAL_DOWS = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  es: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  fr: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  de: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
  pt: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
};

const MONTH_NAMES = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
  pt: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
};

function fullDayName(d) {
  const l = state?.settings?.lang || 'en';
  const list = WD_FULL_NAMES[l] || WD_FULL_NAMES.en;
  return list[d] || WD_FULL[d];
}
const LS_KEY = 'recall.v1';
const RANGES = { 'In 30 minutes': 30 * 6e4, 'In 1 hour': 60 * 6e4 };

/* ---------- state ---------- */
const defaults = () => ({
  settings: { name: 'Kanyinsola', voice: true, personality: 'warm', lang: 'en', pace: 'normal', theme: 'system', themeExplicit: false, defaultTiming: 'At the time', notifications: false, seenBanner: false, seenPermissionPrompt: false },
  reminders: [],
  log: [],
  activeId: null
});
let state = defaults();
try {
  const saved = JSON.parse(localStorage.getItem(LS_KEY));
  if (saved && saved.settings) {
    state = Object.assign(defaults(), saved);
    if (!saved.settings.themeExplicit) {
      state.settings.theme = 'system';
    }
  }
} catch (e) {}
state.settings = Object.assign(defaults().settings, state.settings);
const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} };

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const uid = () => Date.now() + Math.floor(Math.random() * 1e4);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const R = () => state.reminders;
const find = id => state.reminders.find(r => String(r.id) === String(id));

function fmtTime(ts) {
  const d = new Date(ts);
  let h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
function fmtDay(ts, now) {
  const d = new Date(ts), t = new Date(now);
  if (d.toDateString() === t.toDateString()) return T('today');
  const tm = new Date(t.getTime() + DAY_MS);
  if (d.toDateString() === tm.toDateString()) return T('tomorrow');
  return d.toLocaleDateString(LANG_BCP[state.settings.lang || 'en'] || undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtWhen(ts) {
  const now = Date.now();
  const sameDay = new Date(ts).toDateString() === new Date(now).toDateString();
  if (sameDay) return fmtTime(ts);
  return `${fmtDay(ts, now)} · ${fmtTime(ts)}`;
}
function greeting() {
  const h = new Date().getHours();
  return (h < 12 ? T('goodMorning') : h < 18 ? T('goodAfternoon') : T('goodEvening'));
}
function weekStart(now = Date.now()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY_MS).getTime();
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  $('#overlays').appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2400);
}

/* ---------- Web Audio signature earcons for unique voice branding ---------- */
const earconAudio = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },
  play(personalityKey) {
    try {
      const ctx = this.init();
      if (!ctx) return;
      const t = ctx.currentTime;
      if (personalityKey === 'warm') {
        // Cocoa: Warm Rhodes/marimba dual chord (soft low-pass acoustic resonance)
        [349.23, 440.0, 523.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, t);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.04);
          gain.gain.setValueAtTime(0, t + idx * 0.04);
          gain.gain.linearRampToValueAtTime(0.12, t + idx * 0.04 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.04 + 0.55);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.04);
          osc.stop(t + idx * 0.04 + 0.6);
        });
      } else if (personalityKey === 'buttery') {
        // Oak: Deep resonant cello chime / warm gong
        [146.83, 220.0, 293.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.14 / (idx + 1), t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.8);
        });
      } else if (personalityKey === 'airy') {
        // Skye: Bright crystal sparkle bell arpeggio
        [659.25, 830.61, 987.77, 1318.51].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + idx * 0.04);
          gain.gain.setValueAtTime(0, t + idx * 0.04);
          gain.gain.linearRampToValueAtTime(0.09, t + idx * 0.04 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.04 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + idx * 0.04);
          osc.stop(t + idx * 0.04 + 0.45);
        });
      } else if (personalityKey === 'bold') {
        // Cedar: Crisp modern acoustic snap / woodblock strike
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, t);
        osc.frequency.exponentialRampToValueAtTime(293.66, t + 0.08);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      } else if (personalityKey === 'mellow') {
        // Willow: Gentle singing bowl / zen resonance
        [392.0, 784.0, 1176.0].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq + (idx === 1 ? 1.5 : 0), t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.1 / (idx + 1), t + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 1.0);
        });
      }
    } catch (e) {}
  }
};

/* ---------- voice personalities, languages, pace ---------- */
/* each voice has its own tone + tempo (pitch/rate), a short personality tag, an
   audition line, and a preferred device voice: an accent plus a slot that keeps
   two same-gender characters off the same speaker where the device allows it.
   rate carries the character on phones, since many mobile engines ignore pitch. */
const PERSONALITIES = {
  warm:    { name: 'Cocoa',  gender: 'female', desc: 'Warm calm',    pitch: 1.02, rate: 0.95, color: '#F6D9CE', slot: 0,
             locale: 'en-US', hint: 'samantha|aria|jenny|karen|sonia|ava|allison|susan|joanna|nicky|emily|monica|paulina|helena|laura|carmen|lucia|celine|anna|luciana',
             line: "Hi, I'm Cocoa. Take a breath — I'll keep you on track, gently.",
             due: (t, task) => `Take a gentle breath. It's ${t}, and time to ${task}. Whenever you're ready, let's begin.`,
             ping: task => `Gently checking in: whenever you're ready, remember ${task}.` },
  buttery: { name: 'Oak',    gender: 'male',   desc: 'Deep smooth',  pitch: 0.96, rate: 0.94, color: '#EDE6D8', slot: 0,
             locale: 'en-US', hint: 'alex|daniel|george|thomas|guy|fred|arthur|tom|aaron|rishi|nathan|jorge|diego|carlos|paul|henri|markus|felipe',
             line: 'Hello. Oak here. I will be the steady voice in the room.',
             due: (t, task) => `Steady now. It's ${t}. Time to focus on ${task}. Let's get it done.`,
             ping: task => `Oak here. Keeping ${task} on your radar.` },
  airy:    { name: 'Skye',   gender: 'female', desc: 'Bright airy',  pitch: 1.04, rate: 1.02, color: '#E4E9F5', slot: 1,
             locale: 'en-GB', hint: 'libby|sonia|hazel|kate|serena|victoria|tessa|amelia|joanna|martha|matilda|stephanie|carmen|lucia|audrey|petra|vitoria',
             line: "Hey! Skye here. I'll keep things moving — quick, bright, and cheerful!",
             due: (t, task) => `Ding! It's ${t}! Ready to tackle ${task}? Let's do this!`,
             ping: task => `Quick ping! Don't forget about ${task}!` },
  bold:    { name: 'Cedar',  gender: 'male',   desc: 'Bold brisk',   pitch: 1.00, rate: 1.04, color: '#F3E0D3', slot: 1,
             locale: 'en-GB', hint: 'ryan|oliver|james|brian|liam|mark|daniel|arthur|alex|tom|aaron|miguel|javier|nicolas|stefan|thiago',
             line: "Hi, Cedar here. Let's get moving.",
             due: (t, task) => `It's ${t}. Time to ${task}. Let's get straight to it.`,
             ping: task => `Heads up: ${task}.` },
  mellow:  { name: 'Willow', gender: 'female', desc: 'Soft mellow',  pitch: 0.98, rate: 0.92, color: '#E2E8DE', slot: 2,
             locale: 'en-AU', hint: 'natasha|nicole|catherine|moira|fiona|karen|ingrid|matilda|martha|samantha|paulina|sofia|amelie|hedda|ines',
             line: 'Hi. I am Willow. We can take this slowly, no rush at all.',
             due: (t, task) => `${t} is here. In your own time, ${task} is waiting for you.`,
             ping: task => `A soft reminder: ${task} is still here for you.` },
};
/* the order the cast claims device voices in, so no two characters share one
   while a spare speaker is still free */
const VOICE_ORDER = ['warm', 'buttery', 'airy', 'bold', 'mellow'];
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent || '') ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const MALE_HINTS = /\b(male|man|david|mark|daniel|george|fred|alex|alexander|guy|brian|james|diego|jorge|thomas|hans|carlos|paul|ricardo|liam|oliver|ryan|william|eric|arthur|nathan|connor|tom|aaron|rishi|gordon|grandpa|felipe|marcos|thiago|bruno)\b/i;
const FEMALE_HINTS = /\b(female|woman|samantha|karen|moira|tessa|serena|allison|susan|ava|zira|hazel|fiona|victoria|joanna|amelie|anna|alice|kathy|shelley|nicky|paulina|helena|ingrid|amelia|catherine|sonia|monica|libby|natasha|nicole|kate|jenny|aria|michelle|emily|olivia|zoe|ivy|salli|kimberly|martha|matilda|grandma|amy|emma|stephanie|veena|luciana|joana|vitoria|maria|ines|google us english|google uk english female)\b/i;
const LANGUAGES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
};
const PACES = { slow: 'Slow', normal: 'Normal', fast: 'Fast' };
const PACE_RATE = { slow: 0.88, normal: 1, fast: 1.16 };
/* BCP-47 tags so the engine picks/right-voice per chosen language */
const LANG_BCP = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR' };

/* Complete UI translations for supported languages */
const UI_STRINGS = {
  en: {
    home: 'Home',
    reflect: 'Reflect',
    settings: 'Settings',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    today: 'Today',
    tomorrow: 'Tomorrow',
    emptyTitle: 'Nothing planned yet.',
    emptySub: 'Add something you want Recall to remember.',
    addReminder: 'Add reminder',
    addReminderDesc: 'Spoken nudge at the exact moment you need it',
    startFocus: 'Start Focus',
    startFocusDesc: 'Timed concentration with calming ambient soundscapes',
    thisWeek: 'This week',
    seeHowWent: 'See how things went',
    view: 'View',
    upcoming: 'Upcoming',
    completed: 'Completed',
    allCaughtUp: "You're all caught up. Add what you want to remember.",
    nothingCompleted: 'Nothing completed yet today.',
    missedTap: 'Missed — tap to revisit',
    snoozed: 'Snoozed',
    voice: 'Voice',
    theme: 'Theme',
    language: 'Language',
    notificationAlerts: 'Notification alerts',
    alertsPermissions: 'Alerts & phone permissions',
    aboutRecall: 'About Recall',
    allowed: 'Allowed',
    howToAllow: 'How to allow',
    notifOffBanner: 'Notifications are off. Tap to view phone setup & permissions.',
    focusMode: 'Focus mode',
    readyToFocus: 'Ready to focus',
    focusDuration: 'Focus duration',
    ambientSoundscape: 'Ambient soundscape',
    startFocusSession: 'Start focus session',
    endFocusSession: 'End focus session',
    focusPaused: 'Focus paused',
    focusComplete: 'Focus session complete',
    focusMindfulTitle: 'Mindful Focus',
    focusMindfulDesc: 'Recall protects your concentration with synthesized soothing soundscapes. When you finish, you can return to your tasks refreshed.',
    yourWeek: 'Your week',
    remindersCount: 'reminders',
    completedStat: 'COMPLETED',
    snoozedStat: 'SNOOZED',
    missedStat: 'MISSED',
    hearReflection: 'Hear weekly reflection',
    pauseReflection: 'Pause reflection',
    playingReflectionToast: name => `Playing weekly reflection in ${name}’s voice…`,
    reflectionPausedToast: 'Weekly reflection paused.',
    mindfulMomentum: 'Mindful Momentum',
    mindfulMomentumDesc: 'Recall measures presence, not perfection. Whether you completed, snoozed, or rescheduled — you gave conscious attention to what matters in your life.',
    newReminder: 'New reminder',
    whatToRemember: 'What do you want to remember?',
    when: 'When',
    alert: 'Alert',
    repeat: 'Repeat',
    saveReminder: 'Save reminder',
    cancel: 'Cancel',
    pick: 'Pick',
    never: 'Never',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    custom: 'Custom',
    customRepeat: 'Custom repeat',
    tryDateLike: 'Try a date like "Mon, Aug 17".',
    atTheTime: 'At the time',
    in30Min: 'In 30 minutes',
    in1Hour: 'In 1 hour',
    pickTime: 'Pick a time',
    voiceDesc_warm: 'Warm calm',
    voiceDesc_buttery: 'Deep smooth',
    voiceDesc_airy: 'Bright airy',
    voiceDesc_bold: 'Bold brisk',
    voiceDesc_mellow: 'Soft mellow',
    aboutTagline: 'Quiet reminders & mindful focus',
    philosophy: 'Philosophy',
    philosophyDesc: 'Recall is a calm reminder companion designed to protect your attention. Instead of loud alarms, streak counters, or overwhelming task lists, Recall speaks to you in a human voice at the exact moment you planned — nudging you once, cleanly, without guilt or clutter.',
    coreFeatures: 'Core Features',
    featVoiceTitle: 'Spoken Reminders & Voice Memos',
    featVoiceDesc: 'Phrased with natural cadence and tone, or recorded in your own voice as personal audio memos.',
    featSoundTitle: 'Ambient Soundscapes',
    featSoundDesc: 'Procedurally synthesized audio (Brown Noise, Soft Rain, Lo-Fi Warmth, Forest Stream) to keep you centered while focusing.',
    featReflectTitle: 'Anti-Guilt Reflection',
    featReflectDesc: 'A weekly summary that honors presence rather than perfection, whether you completed, snoozed, or rescheduled.',
    connectSocial: 'Connect With Recall',
    craftedForCalm: 'Crafted with care for calm minds.',
    minutes: 'minutes',
    soundBrownNoise: 'Brown Noise',
    soundSoftRain: 'Soft Rain',
    soundLoFi: 'Lo-Fi Warmth',
    soundStream: 'Forest Stream',
    soundSilent: 'Silent Timer',
    editReminder: 'Edit reminder',
    reminder: 'Reminder',
    startsWhen: 'Starts when?',
    pickDate: 'Pick a date',
    remindMe: 'Remind me',
    placeholderTask: 'e.g. Call Mom tomorrow at 4pm',
    attachVoiceNote: "Attach personal / loved one's voice note",
    personalVoiceNote: 'Personal Voice Note',
    recordingAttached: 's recording attached',
    recordingTapStop: 'Recording',
    tapToStop: 'Tap to stop',
    reminderFiresAt: 'Reminder fires at',
    status: 'Status',
    upcomingSingle: 'Upcoming',
    completedSingle: 'Completed',
    missedSingle: 'Missed',
    snoozedSingle: 'Snoozed',
    playVoiceNote: 'Play voice note',
    hearReminder: 'Hear reminder',
    remindAgain: 'Remind me again',
    notToday: 'Not today',
    done: 'Done',
    deleteReminder: 'Delete reminder',
    deleteConfirmTitle: 'Delete reminder?',
    deleteConfirmDesc: 'This will remove it from your list.',
    delete: 'Delete',
    snooze: 'Snooze',
    snoozeFor: 'Snooze for',
    orPickTime: 'Or pick a time',
    snooze10m: '10 minutes',
    snooze30m: '30 minutes',
    snooze1h: '1 hour',
    remindAgainTitle: 'Remind me again in',
    itsTime: "It's time",
    listeningBadge: 'Listening: say "Done", "Snooze for 5 mins", or "Not today"',
    autoTheme: 'Auto',
    voiceReminders: 'Voice reminders',
    auditionDelivery: 'Audition reminder delivery',
    pace: 'Pace',
    slow: 'Slow',
    normal: 'Normal',
    fast: 'Fast',
    defaultTiming: 'Default reminder timing',
    whatRecallDoes: 'What Recall Does',
    aboutRecallDesc: 'Recall is a calm reminder companion designed to protect your attention. Instead of loud alarms, streak counters, or overwhelming task lists, Recall speaks to you in a human voice at the exact moment you planned — nudging you once, cleanly, without guilt or clutter.',
    allowReminderAlerts: 'Allow reminder alerts',
    allowAlertsDesc: "Let Recall wake your screen and alert your phone when it's time for what matters in your day.",
    alertOnLockScreen: 'Alerts on lock screen & over other apps',
    spokenAndVoiceMemos: 'Spoken voice reminders & personal voice memos',
    allowAlertsBtn: 'Allow reminder alerts',
    maybeLater: 'Maybe later',
    phoneStatus: 'Phone Status',
    allowedActive: 'Allowed & Active',
    blockedByBrowser: 'Blocked by browser',
    notEnabled: 'Not enabled',
    allowAlertsNow: 'Allow alerts now',
    sendTestReminder: 'Send test reminder',
    testSoundVoice: 'Test sound & voice',
    doneBtn: 'Done',
    tonight: 'Tonight',
    weekSoFarPlanned: n => `Week so far: ${n} reminders planned.`,
    completedWeekSummary: (done, total) => `You completed ${done} of the ${total} things you planned this week.`,
    insightEmpty: 'Complete reminders this week and your rounded-up summary will appear here.',
    insightMorning: 'Your mornings tend to go smoother than your evenings.',
    insightEvening: 'Your evenings tend to go smoother than your mornings.',
    insightEven: 'Mornings and evenings are about even so far.',
    inSession: 'In session',
    tapTimeToEdit: 'Tap time to edit duration',
    pause: 'Pause',
    resume: 'Resume',
    hour: 'Hour',
    minute: 'Minute',
    soundBrownNoiseDesc: 'Deep soothing low-frequency rumble for deep concentration',
    soundSoftRainDesc: 'Gentle steady rainfall synthesizer to ease mental tension',
    soundLoFiDesc: 'Warm analog chords for creative flow',
    soundStreamDesc: 'Crisp natural babbling water through woodland',
    soundSilentDesc: 'Peaceful silent countdown without ambient audio',
    alertsPermissionsDesc: 'Make sure Recall has permission to alert you and show reminders on your phone when due.',
    howToAllowAndDraw: 'How to allow & draw over apps',
    androidPermHeading: 'Android (Display Over Apps & Background)',
    ifPromptMissed: 'If prompt was missed',
    androidStep1: 'Tap the lock icon 🔒 beside the website address in Chrome → Permissions → Notifications → Allow.',
    displayOverApps: 'Display over other apps',
    androidStep2: 'Open phone Settings → Apps → Chrome (or Recall) → Display over other apps (or Appear on top) → Allow.',
    neverMissAlerts: 'Never miss alerts',
    androidStep3: "In Settings → Apps → Chrome (or Recall) → Battery, select Unrestricted so Android doesn't sleep Recall when locked.",
    iosPermHeading: 'iPhone (Lock Screen & Banners)',
    iosStep1: 'Go to iPhone Settings → Safari (or Chrome) → Notifications and enable Allow Notifications.',
    iosStep2: 'Ensure Lock Screen, Notification Center, and Banners are all checked.',
    addToHomeScreen: 'Add to Home Screen',
    iosStep3: 'In Safari, tap the Share button → Add to Home Screen for the best standalone experience.',
    theme_light: 'Light',
    theme_dark: 'Dark',
    theme_ogshine: 'Aurora',
    theme_peach: 'Apricot',
    theme_midnight: 'Harbor',
    theme_lilac: 'Iris',
    theme_dusk: 'Ember',
    theme_seafoam: 'Fern',
    theme_graphite: 'Slate',
    theme_daybreak: 'Cobalt',
    theme_sherbet: 'Blossom',
    theme_paper: 'Linen',
    theme_carbon: 'Onyx',
    detected: 'Detected',
    tapToApply: 'Tap to apply',
    permissions: 'Permissions',
    permDesc: 'Enable permissions to let Recall alert you on time, listen hands-free, and stay active in the background.',
    permNotifications: 'Notification alerts',
    permNotificationsSub: 'Rings, chimes, and banners when your reminders are due',
    permMic: 'Microphone & voice commands',
    permMicSub: 'Voice typing and hands-free spoken actions (Done, Snooze)',
    permOverlay: 'Display over other apps',
    permOverlaySub: 'Shows full-screen reminder takeovers when due',
    permBattery: 'Unrestricted battery',
    permBatterySub: 'Keeps reminders and focus timers reliable in background',
    manage: 'Manage',
    openingSettings: 'Opening phone settings...'
  },
  es: {
    home: 'Inicio',
    reflect: 'Reflexión',
    settings: 'Ajustes',
    goodMorning: 'Buenos días',
    goodAfternoon: 'Buenas tardes',
    goodEvening: 'Buenas noches',
    today: 'Hoy',
    tomorrow: 'Mañana',
    emptyTitle: 'Nada planeado aún.',
    emptySub: 'Añade algo que quieras que Recall recuerde.',
    addReminder: 'Añadir recordatorio',
    addReminderDesc: 'Aviso hablado en el momento exacto que lo necesitas',
    startFocus: 'Iniciar Enfoque',
    startFocusDesc: 'Concentración temporizada con paisajes sonoros relajantes',
    thisWeek: 'Esta semana',
    seeHowWent: 'Mira cómo fue la semana',
    view: 'Ver',
    upcoming: 'Próximos',
    completed: 'Completados',
    allCaughtUp: 'Estás al día. Añade lo que quieras recordar.',
    nothingCompleted: 'Nada completado aún hoy.',
    missedTap: 'Perdido — toca para revisar',
    snoozed: 'Pospuesto',
    voice: 'Voz',
    theme: 'Tema',
    language: 'Idioma',
    notificationAlerts: 'Alertas de notificación',
    alertsPermissions: 'Alertas y permisos del teléfono',
    aboutRecall: 'Acerca de Recall',
    allowed: 'Permitido',
    howToAllow: 'Cómo activar',
    notifOffBanner: 'Notificaciones desactivadas. Toca para ver permisos.',
    focusMode: 'Modo de enfoque',
    readyToFocus: 'Listo para enfocarte',
    focusDuration: 'Duración de enfoque',
    ambientSoundscape: 'Paisaje sonoro ambiental',
    startFocusSession: 'Iniciar sesión de enfoque',
    endFocusSession: 'Terminar sesión',
    focusPaused: 'Enfoque en pausa',
    focusComplete: 'Sesión de enfoque completada',
    focusMindfulTitle: 'Enfoque consciente',
    focusMindfulDesc: 'Recall protege tu concentración con paisajes sonoros relajantes. Cuando termines, podrás volver a tus tareas con energía renovada.',
    yourWeek: 'Tu semana',
    remindersCount: 'recordatorios',
    completedStat: 'COMPLETADOS',
    snoozedStat: 'POSPUESTOS',
    missedStat: 'PERDIDOS',
    hearReflection: 'Escuchar reflexión semanal',
    pauseReflection: 'Pausar reflexión',
    playingReflectionToast: name => `Reproduciendo reflexión semanal con la voz de ${name}…`,
    reflectionPausedToast: 'Reflexión semanal pausada.',
    mindfulMomentum: 'Impulso consciente',
    mindfulMomentumDesc: 'Recall valora la presencia, no la perfección. Ya sea completado, pospuesto o reprogramado, prestaste atención a lo que importa.',
    newReminder: 'Nuevo recordatorio',
    whatToRemember: '¿Qué quieres recordar?',
    when: 'Cuándo',
    alert: 'Alerta',
    repeat: 'Repetir',
    saveReminder: 'Guardar recordatorio',
    cancel: 'Cancelar',
    pick: 'Elegir',
    never: 'Nunca',
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
    yearly: 'Anual',
    custom: 'Personalizado',
    customRepeat: 'Repetición personalizada',
    tryDateLike: 'Prueba una fecha como "Lun, 17 ago".',
    atTheTime: 'A la hora',
    in30Min: 'En 30 minutos',
    in1Hour: 'En 1 hora',
    pickTime: 'Elegir hora',
    voiceDesc_warm: 'Cálida y serena',
    voiceDesc_buttery: 'Profunda y firme',
    voiceDesc_airy: 'Luminosa y vivaz',
    voiceDesc_bold: 'Enérgica y directa',
    voiceDesc_mellow: 'Suave y relajada',
    aboutTagline: 'Recordatorios serenos y enfoque consciente',
    philosophy: 'Filosofía',
    philosophyDesc: 'Recall es un compañero de recordatorios sereno diseñado para proteger tu atención. Sin alarmas estridentes ni listas abrumadoras, te habla con voz humana en el momento exacto.',
    coreFeatures: 'Características principales',
    featVoiceTitle: 'Recordatorios de voz y notas de audio',
    featVoiceDesc: 'Fraseados con ritmo natural o grabados con tu propia voz.',
    featSoundTitle: 'Paisajes sonoros ambientales',
    featSoundDesc: 'Sonidos sintetizados para mantenerte centrado.',
    featReflectTitle: 'Reflexión sin culpas',
    featReflectDesc: 'Un resumen semanal que celebra tu presencia sobre la perfección.',
    connectSocial: 'Conecta con Recall',
    craftedForCalm: 'Hecho con cuidado para mentes tranquilas.',
    minutes: 'minutos',
    soundBrownNoise: 'Ruido marrón',
    soundSoftRain: 'Lluvia suave',
    soundLoFi: 'Calidez Lo-Fi',
    soundStream: 'Arroyo del bosque',
    soundSilent: 'Temporizador silencioso',
    editReminder: 'Editar recordatorio',
    reminder: 'Recordatorio',
    startsWhen: '¿Cuándo empieza?',
    pickDate: 'Elegir fecha',
    remindMe: 'Avisarme',
    placeholderTask: 'ej. Llamar a mamá mañana a las 4pm',
    attachVoiceNote: 'Adjuntar nota de voz personal o de un ser querido',
    personalVoiceNote: 'Nota de voz personal',
    recordingAttached: 's de grabación adjunta',
    recordingTapStop: 'Grabando',
    tapToStop: 'Toca para detener',
    reminderFiresAt: 'El recordatorio sonará a las',
    status: 'Estado',
    upcomingSingle: 'Próximo',
    completedSingle: 'Completado',
    missedSingle: 'Perdido',
    snoozedSingle: 'Pospuesto',
    playVoiceNote: 'Reproducir nota de voz',
    hearReminder: 'Escuchar recordatorio',
    remindAgain: 'Recordarme de nuevo',
    notToday: 'Hoy no',
    done: 'Hecho',
    deleteReminder: 'Eliminar recordatorio',
    deleteConfirmTitle: '¿Eliminar recordatorio?',
    deleteConfirmDesc: 'Esto lo eliminará de tu lista.',
    delete: 'Eliminar',
    snooze: 'Posponer',
    snoozeFor: 'Posponer por',
    orPickTime: 'O elige una hora',
    snooze10m: '10 minutos',
    snooze30m: '30 minutos',
    snooze1h: '1 hora',
    remindAgainTitle: 'Recordarme de nuevo en',
    itsTime: 'Es la hora',
    listeningBadge: 'Escuchando: di "Hecho", "Posponer 5 mins" o "Hoy no"',
    autoTheme: 'Automático',
    voiceReminders: 'Recordatorios de voz',
    auditionDelivery: 'Probar entrega de recordatorio',
    pace: 'Ritmo',
    slow: 'Lento',
    normal: 'Normal',
    fast: 'Rápido',
    defaultTiming: 'Horario predeterminado',
    whatRecallDoes: 'Qué hace Recall',
    aboutRecallDesc: 'Recall es un compañero de recordatorios sereno diseñado para proteger tu atención. Sin alarmas estridentes ni listas abrumadoras, te habla con voz humana en el momento exacto.',
    allowReminderAlerts: 'Permitir alertas de recordatorio',
    allowAlertsDesc: 'Deja que Recall active tu pantalla y te avise en tu teléfono a tiempo.',
    alertOnLockScreen: 'Alertas en pantalla de bloqueo y sobre otras apps',
    spokenAndVoiceMemos: 'Recordatorios de voz hablados y notas personales',
    allowAlertsBtn: 'Permitir alertas de recordatorio',
    maybeLater: 'Quizás más tarde',
    phoneStatus: 'Estado del teléfono',
    allowedActive: 'Permitido y activo',
    blockedByBrowser: 'Bloqueado por el navegador',
    notEnabled: 'No activado',
    allowAlertsNow: 'Permitir alertas ahora',
    sendTestReminder: 'Enviar recordatorio de prueba',
    testSoundVoice: 'Probar sonido y voz',
    doneBtn: 'Listo',
    tonight: 'Esta noche',
    weekSoFarPlanned: n => `Semana hasta ahora: ${n} recordatorios planificados.`,
    completedWeekSummary: (done, total) => `Completaste ${done} de las ${total} cosas que planeaste esta semana.`,
    insightEmpty: 'Completa recordatorios esta semana y aquí aparecerá tu resumen redondeado.',
    insightMorning: 'Tus mañanas suelen ir más fluidas que tus tardes.',
    insightEvening: 'Tus tardes suelen ir más fluidas que tus mañanas.',
    insightEven: 'Las mañanas y las tardes van bastante parejas hasta ahora.',
    inSession: 'En sesión',
    tapTimeToEdit: 'Toca la hora para editar la duración',
    pause: 'Pausa',
    resume: 'Reanudar',
    hour: 'Hora',
    minute: 'Minuto',
    soundBrownNoiseDesc: 'Zumbido grave y relajante de baja frecuencia para una concentración profunda',
    soundSoftRainDesc: 'Sintetizador de lluvia suave y constante para aliviar la tensión mental',
    soundLoFiDesc: 'Acordes analógicos cálidos para fluir creativamente',
    soundStreamDesc: 'Agua cristalina que fluye suavemente entre los bosques',
    soundSilentDesc: 'Cuenta regresiva silenciosa y serena sin sonido ambiente',
    alertsPermissionsDesc: 'Asegúrate de que Recall tenga permiso para avisarte y mostrar recordatorios en tu teléfono a tiempo.',
    howToAllowAndDraw: 'Cómo permitir y mostrar sobre otras apps',
    androidPermHeading: 'Android (Mostrar sobre otras apps y segundo plano)',
    ifPromptMissed: 'Si no viste el aviso',
    androidStep1: 'Toca el icono del candado 🔒 junto a la dirección web en Chrome → Permisos → Notificaciones → Permitir.',
    displayOverApps: 'Mostrar sobre otras aplicaciones',
    androidStep2: 'Abre Ajustes del teléfono → Aplicaciones → Chrome (o Recall) → Mostrar sobre otras aplicaciones → Permitir.',
    neverMissAlerts: 'Nunca te pierdas las alertas',
    androidStep3: 'En Ajustes → Aplicaciones → Chrome (o Recall) → Batería, selecciona Sin restricciones para que Android no suspenda Recall cuando esté bloqueado.',
    iosPermHeading: 'iPhone (Pantalla de bloqueo y tiras)',
    iosStep1: 'Ve a Ajustes de iPhone → Safari (o Chrome) → Notificaciones y activa Permitir notificaciones.',
    iosStep2: 'Asegúrate de que Pantalla bloqueada, Centro de notificaciones y Tiras estén seleccionados.',
    addToHomeScreen: 'Añadir a la pantalla de inicio',
    iosStep3: 'En Safari, toca el botón Compartir → Añadir a la pantalla de inicio para la mejor experiencia independiente.',
    theme_light: 'Claro',
    theme_dark: 'Oscuro',
    theme_ogshine: 'Aurora',
    theme_peach: 'Albaricoque',
    theme_midnight: 'Puerto',
    theme_lilac: 'Iris',
    theme_dusk: 'Brasa',
    theme_seafoam: 'Helecho',
    theme_graphite: 'Pizarra',
    theme_daybreak: 'Cobalto',
    theme_sherbet: 'Flor',
    theme_paper: 'Lino',
    theme_carbon: 'Ónix',
    detected: 'Detectado',
    tapToApply: 'Toca para aplicar',
    permissions: 'Permisos',
    permDesc: 'Activa los permisos para que Recall te avise a tiempo, escuche con manos libres y siga activo en segundo plano.',
    permNotifications: 'Alertas de notificación',
    permNotificationsSub: 'Sonidos, timbres y avisos cuando vencen tus recordatorios',
    permMic: 'Micrófono y comandos de voz',
    permMicSub: 'Dictado por voz y acciones con manos libres (Hecho, Posponer)',
    permOverlay: 'Mostrar sobre otras aplicaciones',
    permOverlaySub: 'Muestra recordatorios a pantalla completa al vencer',
    permBattery: 'Batería sin restricciones',
    permBatterySub: 'Mantiene recordatorios y temporizadores confiables en segundo plano',
    manage: 'Gestionar',
    openingSettings: 'Abriendo ajustes del teléfono...'
  },
  fr: {
    home: 'Accueil',
    reflect: 'Réflexion',
    settings: 'Réglages',
    goodMorning: 'Bonjour',
    goodAfternoon: 'Bon après-midi',
    goodEvening: 'Bonsoir',
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    emptyTitle: 'Rien de prévu pour l’instant.',
    emptySub: 'Ajoutez ce que vous souhaitez que Recall vous rappelle.',
    addReminder: 'Ajouter un rappel',
    addReminderDesc: 'Rappel vocal au moment précis où vous en avez besoin',
    startFocus: 'Démarrer Concentration',
    startFocusDesc: 'Concentration minutée avec ambiances sonores apaisantes',
    thisWeek: 'Cette semaine',
    seeHowWent: 'Voir comment s’est passée la semaine',
    view: 'Voir',
    upcoming: 'À venir',
    completed: 'Terminés',
    allCaughtUp: 'Vous êtes à jour. Ajoutez ce que vous souhaitez retenir.',
    nothingCompleted: "Rien de terminé aujourd'hui pour l’instant.",
    missedTap: 'Manqué — appuyez pour revoir',
    snoozed: 'Reporté',
    voice: 'Voix',
    theme: 'Thème',
    language: 'Langue',
    notificationAlerts: 'Alertes de notification',
    alertsPermissions: 'Alertes et autorisations téléphone',
    aboutRecall: 'À propos de Recall',
    allowed: 'Autorisé',
    howToAllow: 'Comment activer',
    notifOffBanner: 'Notifications désactivées. Touchez pour configurer.',
    focusMode: 'Mode concentration',
    readyToFocus: 'Prêt à vous concentrer',
    focusDuration: 'Durée de concentration',
    ambientSoundscape: 'Ambiance sonore',
    startFocusSession: 'Démarrer la session',
    endFocusSession: 'Terminer la session',
    focusPaused: 'Concentration en pause',
    focusComplete: 'Session de concentration terminée',
    focusMindfulTitle: 'Concentration sereine',
    focusMindfulDesc: 'Recall protège votre attention avec des ambiances sonores apaisantes. À la fin, reprenez vos activités l’esprit serein.',
    yourWeek: 'Votre semaine',
    remindersCount: 'rappels',
    completedStat: 'TERMINÉS',
    snoozedStat: 'REPORTÉS',
    missedStat: 'MANQUÉS',
    hearReflection: 'Écouter la réflexion hebdomadaire',
    pauseReflection: 'Mettre en pause',
    playingReflectionToast: name => `Lecture de la réflexion hebdomadaire avec la voix de ${name}…`,
    reflectionPausedToast: 'Réflexion hebdomadaire mise en pause.',
    mindfulMomentum: 'Élan bienveillant',
    mindfulMomentumDesc: 'Recall privilégie la présence plutôt que la perfection. Que vous ayez terminé, reporté ou reprogrammé, vous y avez accordé votre attention.',
    newReminder: 'Nouveau rappel',
    whatToRemember: 'Que souhaitez-vous retenir ?',
    when: 'Quand',
    alert: 'Alerte',
    repeat: 'Répéter',
    saveReminder: 'Enregistrer le rappel',
    cancel: 'Annuler',
    pick: 'Choisir',
    never: 'Jamais',
    daily: 'Chaque jour',
    weekly: 'Chaque semaine',
    monthly: 'Chaque mois',
    yearly: 'Chaque année',
    custom: 'Personnalisé',
    customRepeat: 'Répétition personnalisée',
    tryDateLike: 'Essayez une date comme « Lun, 17 août ».',
    atTheTime: 'À l’heure',
    in30Min: 'Dans 30 minutes',
    in1Hour: 'Dans 1 heure',
    pickTime: 'Choisir l’heure',
    voiceDesc_warm: 'Chaleureuse et sereine',
    voiceDesc_buttery: 'Profonde et rassurante',
    voiceDesc_airy: 'Pétillante et vive',
    voiceDesc_bold: 'Directe et dynamique',
    voiceDesc_mellow: 'Douce et paisible',
    aboutTagline: 'Rappels sereins & concentration bienveillante',
    philosophy: 'Philosophie',
    philosophyDesc: 'Recall est un compagnon de rappel calme conçu pour préserver votre attention. Sans alarmes agressives ni listes interminables, il vous parle d’une voix humaine au moment opportun.',
    coreFeatures: 'Fonctionnalités clés',
    featVoiceTitle: 'Rappels parlés & mémos vocaux',
    featVoiceDesc: 'Rythme naturel ou enregistrements avec votre propre voix.',
    featSoundTitle: 'Ambiances sonores',
    featSoundDesc: 'Sons apaisants pour rester concentré.',
    featReflectTitle: 'Réflexion sans culpabilité',
    featReflectDesc: 'Un résumé qui honore votre présence plutôt que la perfection.',
    connectSocial: 'Rejoindre Recall',
    craftedForCalm: 'Conçu avec soin pour les esprits calmes.',
    minutes: 'minutes',
    soundBrownNoise: 'Bruit brun',
    soundSoftRain: 'Pluie douce',
    soundLoFi: 'Douceur Lo-Fi',
    soundStream: 'Ruisseau en forêt',
    soundSilent: 'Minuteur silencieux',
    editReminder: 'Modifier le rappel',
    reminder: 'Rappel',
    startsWhen: 'Ça commence quand ?',
    pickDate: 'Choisir une date',
    remindMe: 'Me rappeler',
    placeholderTask: 'ex. Appeler Maman demain à 16h',
    attachVoiceNote: "Joindre une note vocale personnelle ou d'un proche",
    personalVoiceNote: 'Note vocale personnelle',
    recordingAttached: 's d’enregistrement joint',
    recordingTapStop: 'Enregistrement',
    tapToStop: 'Touchez pour arrêter',
    reminderFiresAt: 'Le rappel sonnera à',
    status: 'Statut',
    upcomingSingle: 'À venir',
    completedSingle: 'Terminé',
    missedSingle: 'Manqué',
    snoozedSingle: 'Reporté',
    playVoiceNote: 'Lire la note vocale',
    hearReminder: 'Écouter le rappel',
    remindAgain: 'Me rappeler à nouveau',
    notToday: "Pas aujourd'hui",
    done: 'Fait',
    deleteReminder: 'Supprimer le rappel',
    deleteConfirmTitle: 'Supprimer le rappel ?',
    deleteConfirmDesc: 'Cela le supprimera de votre liste.',
    delete: 'Supprimer',
    snooze: 'Reporter',
    snoozeFor: 'Reporter de',
    orPickTime: 'Ou choisir une heure',
    snooze10m: '10 minutes',
    snooze30m: '30 minutes',
    snooze1h: '1 heure',
    remindAgainTitle: 'Me rappeler dans',
    itsTime: "C'est l'heure",
    listeningBadge: 'À l’écoute : dites "Fait", "Reporter de 5 min" ou "Pas aujourd’hui"',
    autoTheme: 'Automatique',
    voiceReminders: 'Rappels vocaux',
    auditionDelivery: "Tester l'annonce de rappel",
    pace: 'Rythme',
    slow: 'Lent',
    normal: 'Normal',
    fast: 'Rapide',
    defaultTiming: 'Heure de rappel par défaut',
    whatRecallDoes: 'Ce que fait Recall',
    aboutRecallDesc: "Recall est un compagnon de rappel calme conçu pour préserver votre attention. Sans alarmes agressives ni listes interminables, il vous parle d'une voix humaine au moment opportun.",
    allowReminderAlerts: 'Autoriser les alertes de rappel',
    allowAlertsDesc: 'Laissez Recall réveiller votre écran et vous alerter au bon moment.',
    alertOnLockScreen: "Alertes sur écran verrouillé et sur d'autres applications",
    spokenAndVoiceMemos: 'Rappels vocaux et mémos personnels',
    allowAlertsBtn: 'Autoriser les alertes',
    maybeLater: 'Plus tard',
    phoneStatus: 'État du téléphone',
    allowedActive: 'Autorisé et actif',
    blockedByBrowser: 'Bloqué par le navigateur',
    notEnabled: 'Non activé',
    allowAlertsNow: 'Autoriser maintenant',
    sendTestReminder: 'Envoyer un rappel de test',
    testSoundVoice: 'Tester son et voix',
    doneBtn: 'Terminé',
    tonight: 'Ce soir',
    weekSoFarPlanned: n => `Semaine jusqu'ici : ${n} rappels prévus.`,
    completedWeekSummary: (done, total) => `Vous avez terminé ${done} sur les ${total} choses prévues cette semaine.`,
    insightEmpty: 'Complétez des rappels cette semaine et votre bilan apparaîtra ici.',
    insightMorning: 'Vos matinées ont tendance à être plus fluides que vos soirées.',
    insightEvening: 'Vos soirées ont tendance à être plus fluides que vos matinées.',
    insightEven: 'Matinées et soirées sont à peu près équilibrées jusqu’ici.',
    inSession: 'En session',
    tapTimeToEdit: 'Touchez l’heure pour modifier la durée',
    pause: 'Pause',
    resume: 'Reprendre',
    hour: 'Heure',
    minute: 'Minute',
    soundBrownNoiseDesc: 'Grondeur apaisant basse fréquence pour une concentration profonde',
    soundSoftRainDesc: 'Synthétiseur de pluie douce et régulière pour apaiser les tensions',
    soundLoFiDesc: 'Accords analogiques chaleureux pour le flux créatif',
    soundStreamDesc: 'Murmure d’eau cristalline s’écoulant à travers la forêt',
    soundSilentDesc: 'Compte à rebours silencieux et paisible sans son d’ambiance',
    alertsPermissionsDesc: 'Assurez-vous que Recall a la permission de vous alerter et d’afficher des rappels sur votre téléphone au bon moment.',
    howToAllowAndDraw: 'Comment autoriser et afficher par-dessus les applications',
    androidPermHeading: 'Android (Afficher sur d’autres applis & arrière-plan)',
    ifPromptMissed: 'Si l’invite a été manquée',
    androidStep1: 'Appuyez sur le cadenas 🔒 à côté de l’adresse dans Chrome → Autorisations → Notifications → Autoriser.',
    displayOverApps: 'Afficher par-dessus d’autres applications',
    androidStep2: 'Ouvrez Paramètres du téléphone → Applis → Chrome (ou Recall) → Afficher par-dessus d’autres applis → Autoriser.',
    neverMissAlerts: 'Ne manquez aucune alerte',
    androidStep3: 'Dans Paramètres → Applis → Chrome (ou Recall) → Batterie, choisissez Non restreinte pour éviter la mise en veille de Recall.',
    iosPermHeading: 'iPhone (Écran verrouillé & bannières)',
    iosStep1: 'Allez dans Réglages iPhone → Safari (ou Chrome) → Notifications et activez Autoriser les notifications.',
    iosStep2: 'Vérifiez que Écran verrouillé, Centre de notifications et Bannières soient cochés.',
    addToHomeScreen: 'Sur l’écran d’accueil',
    iosStep3: 'Dans Safari, appuyez sur Partager → Sur l’écran d’accueil pour la meilleure expérience.',
    theme_light: 'Clair',
    theme_dark: 'Sombre',
    theme_ogshine: 'Aurore',
    theme_peach: 'Abricot',
    theme_midnight: 'Port',
    theme_lilac: 'Iris',
    theme_dusk: 'Braise',
    theme_seafoam: 'Fougère',
    theme_graphite: 'Ardoise',
    theme_daybreak: 'Cobalt',
    theme_sherbet: 'Fleur',
    theme_paper: 'Lin',
    theme_carbon: 'Onyx',
    detected: 'Détecté',
    tapToApply: 'Appuyez pour appliquer',
    permissions: 'Autorisations',
    permDesc: 'Activez les autorisations pour permettre à Recall de vous alerter à temps, d’écouter les commandes et de rester actif.',
    permNotifications: 'Alertes de notification',
    permNotificationsSub: 'Sons, carillons et bannières quand vos rappels arrivent à échéance',
    permMic: 'Microphone et commandes vocales',
    permMicSub: 'Dictée vocale et actions mains libres (Fait, Répéter)',
    permOverlay: 'Afficher par-dessus d’autres applications',
    permOverlaySub: 'Affiche les rappels en plein écran au moment voulu',
    permBattery: 'Batterie sans restriction',
    permBatterySub: 'Garde les rappels et minuteurs fiables en arrière-plan',
    manage: 'Gérer',
    openingSettings: 'Ouverture des paramètres du téléphone...'
  },
  de: {
    home: 'Start',
    reflect: 'Rückblick',
    settings: 'Einstellungen',
    goodMorning: 'Guten Morgen',
    goodAfternoon: 'Guten Tag',
    goodEvening: 'Guten Abend',
    today: 'Heute',
    tomorrow: 'Morgen',
    emptyTitle: 'Noch nichts geplant.',
    emptySub: 'Füge etwas hinzu, an das Recall dich erinnern soll.',
    addReminder: 'Erinnerung hinzufügen',
    addReminderDesc: 'Gesprochener Hinweis genau dann, wenn du ihn brauchst',
    startFocus: 'Fokus starten',
    startFocusDesc: 'Zeitgesteuerte Konzentration mit beruhigenden Klängen',
    thisWeek: 'Diese Woche',
    seeHowWent: 'Sieh, wie deine Woche war',
    view: 'Ansehen',
    upcoming: 'Bevorstehend',
    completed: 'Erledigt',
    allCaughtUp: 'Alles erledigt. Füge hinzu, was du nicht vergessen möchtest.',
    nothingCompleted: 'Heute noch nichts erledigt.',
    missedTap: 'Verpasst — tippen zum Wiederholen',
    snoozed: 'Verschoben',
    voice: 'Stimme',
    theme: 'Design',
    language: 'Sprache',
    notificationAlerts: 'Benachrichtigungsalarme',
    alertsPermissions: 'Alarme & Geräteberechtigungen',
    aboutRecall: 'Über Recall',
    allowed: 'Erlaubt',
    howToAllow: 'Wie aktivieren',
    notifOffBanner: 'Benachrichtigungen aus. Tippen für Berechtigungen.',
    focusMode: 'Fokus-Modus',
    readyToFocus: 'Bereit zum Fokussieren',
    focusDuration: 'Fokusdauer',
    ambientSoundscape: 'Klanglandschaft',
    startFocusSession: 'Fokus-Sitzung starten',
    endFocusSession: 'Sitzung beenden',
    focusPaused: 'Fokus pausiert',
    focusComplete: 'Fokus-Sitzung abgeschlossen',
    focusMindfulTitle: 'Achtsamer Fokus',
    focusMindfulDesc: 'Recall schützt deine Konzentration mit sanften Klängen. Danach kannst du erfrischt weitermachen.',
    yourWeek: 'Deine Woche',
    remindersCount: 'Erinnerungen',
    completedStat: 'ERLEDIGT',
    snoozedStat: 'VERSCHOBEN',
    missedStat: 'VERPASST',
    hearReflection: 'Wochenrückblick anhören',
    pauseReflection: 'Reflexion pausieren',
    playingReflectionToast: name => `Wochenrückblick wird mit der Stimme von ${name} abgespielt…`,
    reflectionPausedToast: 'Wochenrückblick pausiert.',
    mindfulMomentum: 'Achtsame Dynamik',
    mindfulMomentumDesc: 'Recall misst Präsenz, nicht Perfektion. Ob erledigt oder verschoben – du hast Wichtigem Aufmerksamkeit geschenkt.',
    newReminder: 'Neue Erinnerung',
    whatToRemember: 'Woran möchtest du dich erinnern?',
    when: 'Wann',
    alert: 'Alarm',
    repeat: 'Wiederholen',
    saveReminder: 'Erinnerung speichern',
    cancel: 'Abbrechen',
    pick: 'Wählen',
    never: 'Nie',
    daily: 'Täglich',
    weekly: 'Wöchentlich',
    monthly: 'Monatlich',
    yearly: 'Jährlich',
    custom: 'Benutzerdefiniert',
    customRepeat: 'Benutzerdefinierte Wiederholung',
    tryDateLike: 'Versuche ein Datum wie „Mo., 17. Aug.“.',
    atTheTime: 'Zur Zeit',
    in30Min: 'In 30 Minuten',
    in1Hour: 'In 1 Stunde',
    pickTime: 'Zeit wählen',
    voiceDesc_warm: 'Warm und gelassen',
    voiceDesc_buttery: 'Tief und beruhigend',
    voiceDesc_airy: 'Hell und schwungvoll',
    voiceDesc_bold: 'Klar und dynamisch',
    voiceDesc_mellow: 'Sanft und entspannt',
    aboutTagline: 'Ruhige Erinnerungen & achtsamer Fokus',
    philosophy: 'Philosophie',
    philosophyDesc: 'Recall ist ein ruhiger Begleiter gegen Alltagsstress. Statt lauter Wecker spricht Recall in menschlicher Stimme zur geplanten Zeit.',
    coreFeatures: 'Hauptfunktionen',
    featVoiceTitle: 'Gesprochene Erinnerungen & Audionotizen',
    featVoiceDesc: 'Natürlicher Tonfall oder eigene Sprachaufnahmen.',
    featSoundTitle: 'Klanglandschaften',
    featSoundDesc: 'Sanfte Töne für tiefe Konzentration.',
    featReflectTitle: 'Rückblick ohne Druck',
    featReflectDesc: 'Ein Wochenrückblick, der Präsenz vor Perfektion stellt.',
    connectSocial: 'Recall Community',
    craftedForCalm: 'Mit Sorgfalt für ruhige Gedanken gestaltet.',
    minutes: 'Minuten',
    soundBrownNoise: 'Braunes Rauschen',
    soundSoftRain: 'Sanfter Regen',
    soundLoFi: 'Lo-Fi-Wärme',
    soundStream: 'Waldquelle',
    soundSilent: 'Stiller Timer',
    editReminder: 'Erinnerung bearbeiten',
    reminder: 'Erinnerung',
    startsWhen: 'Wann beginnt es?',
    pickDate: 'Datum wählen',
    remindMe: 'Erinnere mich',
    placeholderTask: 'z.B. Mama morgen um 16 Uhr anrufen',
    attachVoiceNote: 'Eigene oder persönliche Sprachnotiz anhängen',
    personalVoiceNote: 'Persönliche Sprachnotiz',
    recordingAttached: 's Aufnahme angehängt',
    recordingTapStop: 'Aufnahme',
    tapToStop: 'Tippen zum Stoppen',
    reminderFiresAt: 'Erinnerung ertönt um',
    status: 'Status',
    upcomingSingle: 'Bevorstehend',
    completedSingle: 'Erledigt',
    missedSingle: 'Verpasst',
    snoozedSingle: 'Verschoben',
    playVoiceNote: 'Sprachnotiz abspielen',
    hearReminder: 'Erinnerung anhören',
    remindAgain: 'Erneut erinnern',
    notToday: 'Nicht heute',
    done: 'Erledigt',
    deleteReminder: 'Erinnerung löschen',
    deleteConfirmTitle: 'Erinnerung löschen?',
    deleteConfirmDesc: 'Dadurch wird sie aus der Liste entfernt.',
    delete: 'Löschen',
    snooze: 'Schlummern',
    snoozeFor: 'Schlummern für',
    orPickTime: 'Oder Zeit wählen',
    snooze10m: '10 Minuten',
    snooze30m: '30 Minuten',
    snooze1h: '1 Stunde',
    remindAgainTitle: 'Erneut erinnern in',
    itsTime: 'Es ist Zeit',
    listeningBadge: 'Hört zu: Sage "Erledigt", "5 Min schlummern" oder "Nicht heute"',
    autoTheme: 'Automatisch',
    voiceReminders: 'Sprach-Erinnerungen',
    auditionDelivery: 'Probe-Erinnerung anhören',
    pace: 'Tempo',
    slow: 'Langsam',
    normal: 'Normal',
    fast: 'Schnell',
    defaultTiming: 'Standard-Erinnerungszeit',
    whatRecallDoes: 'Was Recall macht',
    aboutRecallDesc: 'Recall ist ein ruhiger Begleiter gegen Alltagsstress. Statt lauter Wecker spricht Recall in menschlicher Stimme zur geplanten Zeit.',
    allowReminderAlerts: 'Erinnerungsalarme erlauben',
    allowAlertsDesc: 'Lass Recall deinen Bildschirm aktivieren und dich rechtzeitig erinnern.',
    alertOnLockScreen: 'Alarme auf Sperrbildschirm & über anderen Apps',
    spokenAndVoiceMemos: 'Gesprochene Erinnerungen & persönliche Notizen',
    allowAlertsBtn: 'Erinnerungsalarme erlauben',
    maybeLater: 'Vielleicht später',
    phoneStatus: 'Gerätestatus',
    allowedActive: 'Erlaubt & Aktiv',
    blockedByBrowser: 'Vom Browser blockiert',
    notEnabled: 'Nicht aktiviert',
    allowAlertsNow: 'Alarme jetzt erlauben',
    sendTestReminder: 'Testerinnerung senden',
    testSoundVoice: 'Ton & Stimme testen',
    doneBtn: 'Fertig',
    tonight: 'Heute Abend',
    weekSoFarPlanned: n => `Bisherige Woche: ${n} Erinnerungen geplant.`,
    completedWeekSummary: (done, total) => `Du hast ${done} von ${total} Dingen erledigt, die du diese Woche geplant hast.`,
    insightEmpty: 'Erledige diese Woche Erinnerungen, und deine Zusammenfassung erscheint hier.',
    insightMorning: 'Deine Vormittage verlaufen meist reibungsloser als deine Abende.',
    insightEvening: 'Deine Abende verlaufen meist reibungsloser als deine Vormittage.',
    insightEven: 'Vormittage und Abende halten sich bisher die Waage.',
    inSession: 'In Sitzung',
    tapTimeToEdit: 'Tippe auf die Zeit, um die Dauer anzupassen',
    pause: 'Pause',
    resume: 'Fortsetzen',
    hour: 'Stunde',
    minute: 'Minute',
    soundBrownNoiseDesc: 'Beruhigendes tiefes Rumpeln für tiefe Konzentration',
    soundSoftRainDesc: 'Sanfter, stetiger Regensynthesizer zur Linderung mentaler Anspannung',
    soundLoFiDesc: 'Warme analoge Akkorde für kreativen Fluss',
    soundStreamDesc: 'Klares, plätscherndes Quellwasser im Wald',
    soundSilentDesc: 'Ruhiger, stiller Countdown ohne Hintergrundklänge',
    alertsPermissionsDesc: 'Stelle sicher, dass Recall die Berechtigung hat, dich zu erinnern und Alarme auf deinem Telefon anzuzeigen.',
    howToAllowAndDraw: 'So erlaubst du Alarme & das Überlagern anderer Apps',
    androidPermHeading: 'Android (Über anderen Apps anzeigen & Hintergrund)',
    ifPromptMissed: 'Falls Aufforderung verpasst wurde',
    androidStep1: 'Tippe auf das Schlosssymbol 🔒 neben der Webadresse in Chrome → Berechtigungen → Benachrichtigungen → Zulassen.',
    displayOverApps: 'Über anderen Apps einblenden',
    androidStep2: 'Öffne Einstellungen → Apps → Chrome (oder Recall) → Über anderen Apps anzeigen → Zulassen.',
    neverMissAlerts: 'Keine Alarme verpassen',
    androidStep3: 'In Einstellungen → Apps → Chrome (oder Recall) → Akku, wähle Uneingeschränkt, damit Android Recall im Ruhezustand nicht pausiert.',
    iosPermHeading: 'iPhone (Sperrbildschirm & Banner)',
    iosStep1: 'Gehe zu iPhone Einstellungen → Safari (oder Chrome) → Benachrichtigungen und aktiviere Mitteilungen erlauben.',
    iosStep2: 'Stelle sicher, dass Sperrbildschirm, Mitteilungszentrale und Banner aktiviert sind.',
    addToHomeScreen: 'Zum Home-Bildschirm hinzufügen',
    iosStep3: 'In Safari auf Teilen tippen → Zum Home-Bildschirm für das beste App-Erlebnis.',
    theme_light: 'Hell',
    theme_dark: 'Dunkel',
    theme_ogshine: 'Aurora',
    theme_peach: 'Aprikose',
    theme_midnight: 'Hafen',
    theme_lilac: 'Iris',
    theme_dusk: 'Glut',
    theme_seafoam: 'Farn',
    theme_graphite: 'Schiefer',
    theme_daybreak: 'Kobalt',
    theme_sherbet: 'Blüte',
    theme_paper: 'Leinen',
    theme_carbon: 'Onyx',
    detected: 'Erkannt',
    tapToApply: 'Tippen zum Anwenden',
    permissions: 'Berechtigungen',
    permDesc: 'Aktivieren Sie Berechtigungen, damit Recall Sie pünktlich erinnert, per Sprache gesteuert werden kann und im Hintergrund aktiv bleibt.',
    permNotifications: 'Benachrichtigungsalarme',
    permNotificationsSub: 'Töne, Klänge und Banner, wenn Ihre Erinnerungen fällig sind',
    permMic: 'Mikrofon & Sprachbefehle',
    permMicSub: 'Spracheingabe und freihändige Aktionen (Erledigt, Schlummern)',
    permOverlay: 'Über anderen Apps anzeigen',
    permOverlaySub: 'Zeigt Vollbild-Erinnerungen an, wenn sie fällig sind',
    permBattery: 'Uneingeschränkte Akkunutzung',
    permBatterySub: 'Hält Erinnerungen und Fokus-Timer im Hintergrund zuverlässig',
    manage: 'Verwalten',
    openingSettings: 'Telefoneinstellungen werden geöffnet...'
  },
  pt: {
    home: 'Início',
    reflect: 'Reflexão',
    settings: 'Ajustes',
    goodMorning: 'Bom dia',
    goodAfternoon: 'Boa tarde',
    goodEvening: 'Boa noite',
    today: 'Hoje',
    tomorrow: 'Amanhã',
    emptyTitle: 'Nada planejado ainda.',
    emptySub: 'Adicione algo que você queira que o Recall lembre.',
    addReminder: 'Adicionar lembrete',
    addReminderDesc: 'Aviso falado no momento exato em que você precisa',
    startFocus: 'Iniciar Foco',
    startFocusDesc: 'Concentração com paisagens sonoras relaxantes',
    thisWeek: 'Esta semana',
    seeHowWent: 'Veja como foi a semana',
    view: 'Ver',
    upcoming: 'Próximos',
    completed: 'Concluídos',
    allCaughtUp: 'Tudo em dia. Adicione o que deseja lembrar.',
    nothingCompleted: 'Nada concluído hoje ainda.',
    missedTap: 'Perdido — toque para revisar',
    snoozed: 'Adiado',
    voice: 'Voz',
    theme: 'Tema',
    language: 'Idioma',
    notificationAlerts: 'Alertas de notificação',
    alertsPermissions: 'Alertas e permissões',
    aboutRecall: 'Sobre o Recall',
    allowed: 'Permitido',
    howToAllow: 'Como ativar',
    notifOffBanner: 'Notificações desativadas. Toque para configurar.',
    focusMode: 'Modo de foco',
    readyToFocus: 'Pronto para focar',
    focusDuration: 'Duração do foco',
    ambientSoundscape: 'Sons ambientes',
    startFocusSession: 'Iniciar sessão de foco',
    endFocusSession: 'Encerrar sessão',
    focusPaused: 'Foco pausado',
    focusComplete: 'Sessão de foco concluída',
    focusMindfulTitle: 'Foco consciente',
    focusMindfulDesc: 'Recall protege sua concentração com sons calmantes. Ao terminar, volte às suas tarefas renovado.',
    yourWeek: 'Sua semana',
    remindersCount: 'lembretes',
    completedStat: 'CONCLUÍDOS',
    snoozedStat: 'ADIADOS',
    missedStat: 'PERDIDOS',
    hearReflection: 'Ouvir reflexão semanal',
    pauseReflection: 'Pausar reflexão',
    playingReflectionToast: name => `A reproduzir reflexão semanal na voz de ${name}…`,
    reflectionPausedToast: 'Reflexão semanal em pausa.',
    mindfulMomentum: 'Momento consciente',
    mindfulMomentumDesc: 'Recall valoriza presença, não perfeição. Quer tenha completado ou adiado, você deu atenção ao que importa.',
    newReminder: 'Novo lembrete',
    whatToRemember: 'O que você quer lembrar?',
    when: 'Quando',
    alert: 'Alerta',
    repeat: 'Repetir',
    saveReminder: 'Salvar lembrete',
    cancel: 'Cancelar',
    pick: 'Escolher',
    never: 'Nunca',
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
    custom: 'Personalizado',
    customRepeat: 'Repetição personalizada',
    tryDateLike: 'Tente uma data como "Seg, 17 ago".',
    atTheTime: 'Na hora',
    in30Min: 'Em 30 minutos',
    in1Hour: 'Em 1 hora',
    pickTime: 'Escolher horário',
    voiceDesc_warm: 'Calorosa e serena',
    voiceDesc_buttery: 'Profunda e firme',
    voiceDesc_airy: 'Leve e vivaz',
    voiceDesc_bold: 'Direta e enérgica',
    voiceDesc_mellow: 'Suave e tranquila',
    aboutTagline: 'Lembretes serenos & foco consciente',
    philosophy: 'Filosofia',
    philosophyDesc: 'Recall é um companheiro sereno feito para proteger sua atenção. Sem alarmes invasivos, fala com voz humana na hora certa.',
    coreFeatures: 'Recursos principais',
    featVoiceTitle: 'Lembretes falados & notas de voz',
    featVoiceDesc: 'Cadência natural ou gravados com sua própria voz.',
    featSoundTitle: 'Sons ambientes',
    featSoundDesc: 'Áudios calmantes para foco profundo.',
    featReflectTitle: 'Reflexão sem culpa',
    featReflectDesc: 'Um resumo que celebra a presença acima da perfeição.',
    connectSocial: 'Conecte-se com o Recall',
    craftedForCalm: 'Feito com carinho para mentes calmas.',
    minutes: 'minutos',
    soundBrownNoise: 'Ruído marrom',
    soundSoftRain: 'Chuva suave',
    soundLoFi: 'Calor Lo-Fi',
    soundStream: 'Riacho na floresta',
    soundSilent: 'Temporizador silencioso',
    editReminder: 'Editar lembrete',
    reminder: 'Lembrete',
    startsWhen: 'Quando começa?',
    pickDate: 'Escolher data',
    remindMe: 'Lembrar-me',
    placeholderTask: 'ex. Ligar para a mãe amanhã às 16h',
    attachVoiceNote: 'Anexar nota de voz pessoal ou de alguém querido',
    personalVoiceNote: 'Nota de voz pessoal',
    recordingAttached: 's de gravação anexada',
    recordingTapStop: 'Gravando',
    tapToStop: 'Toque para parar',
    reminderFiresAt: 'Lembrete soará às',
    status: 'Status',
    upcomingSingle: 'Próximo',
    completedSingle: 'Concluído',
    missedSingle: 'Perdido',
    snoozedSingle: 'Adiado',
    playVoiceNote: 'Tocar nota de voz',
    hearReminder: 'Ouvir lembrete',
    remindAgain: 'Lembrar novamente',
    notToday: 'Hoje não',
    done: 'Pronto',
    deleteReminder: 'Excluir lembrete',
    deleteConfirmTitle: 'Excluir lembrete?',
    deleteConfirmDesc: 'Isso o removerá da sua lista.',
    delete: 'Excluir',
    snooze: 'Adiar',
    snoozeFor: 'Adiar por',
    orPickTime: 'Ou escolha um horário',
    snooze10m: '10 minutos',
    snooze30m: '30 minutos',
    snooze1h: '1 hora',
    remindAgainTitle: 'Lembrar novamente em',
    itsTime: 'É hora',
    listeningBadge: 'Ouvindo: diga "Pronto", "Adiar 5 minutos" ou "Hoje não"',
    autoTheme: 'Automático',
    voiceReminders: 'Lembretes de voz',
    auditionDelivery: 'Testar anúncio de lembrete',
    pace: 'Ritmo',
    slow: 'Lento',
    normal: 'Normal',
    fast: 'Rápido',
    defaultTiming: 'Horário padrão de lembrete',
    whatRecallDoes: 'O que o Recall faz',
    aboutRecallDesc: 'Recall é um companheiro sereno feito para proteger sua atenção. Sem alarmes invasivos, fala com voz humana na hora certa.',
    allowReminderAlerts: 'Permitir alertas de lembrete',
    allowAlertsDesc: 'Deixe o Recall ativar sua tela e alertá-lo na hora certa.',
    alertOnLockScreen: 'Alertas na tela de bloqueio e sobre outros apps',
    spokenAndVoiceMemos: 'Lembretes falados e notas pessoais',
    allowAlertsBtn: 'Permitir alertas',
    maybeLater: 'Talvez mais tarde',
    phoneStatus: 'Status do telefone',
    allowedActive: 'Permitido e ativo',
    blockedByBrowser: 'Bloqueado pelo navegador',
    notEnabled: 'Não ativado',
    allowAlertsNow: 'Permitir alertas agora',
    sendTestReminder: 'Enviar lembrete de teste',
    testSoundVoice: 'Testar som e voz',
    doneBtn: 'Pronto',
    tonight: 'Hoje à noite',
    weekSoFarPlanned: n => `Semana até agora: ${n} lembretes planejados.`,
    completedWeekSummary: (done, total) => `Você concluiu ${done} das ${total} tarefas que planejou esta semana.`,
    insightEmpty: 'Conclua lembretes esta semana e seu resumo consolidado aparecerá aqui.',
    insightMorning: 'Suas manhãs costumam fluir melhor do que suas noites.',
    insightEvening: 'Suas noites costumam fluir melhor do que suas manhãs.',
    insightEven: 'Manhãs e noites estão bem equilibradas até agora.',
    inSession: 'Em sessão',
    tapTimeToEdit: 'Toque no tempo para editar a duração',
    pause: 'Pausar',
    resume: 'Retomar',
    hour: 'Hora',
    minute: 'Minuto',
    soundBrownNoiseDesc: 'Som grave e relaxante de baixa frequência para concentração profunda',
    soundSoftRainDesc: 'Sintetizador de chuva suave e constante para aliviar a tensão mental',
    soundLoFiDesc: 'Acordes analógicos suaves para fluxo criativo',
    soundStreamDesc: 'Água cristalina correndo suavemente pela floresta',
    soundSilentDesc: 'Contagem regressiva silenciosa e serena sem áudio ambiente',
    alertsPermissionsDesc: 'Verifique se o Recall tem permissão para alertá-lo e exibir lembretes no seu telefone na hora certa.',
    howToAllowAndDraw: 'Como permitir e exibir sobre outros apps',
    androidPermHeading: 'Android (Exibir sobre outros apps e segundo plano)',
    ifPromptMissed: 'Se perdeu o aviso',
    androidStep1: 'Toque no ícone de cadeado 🔒 ao lado do endereço no Chrome → Permissões → Notificações → Permitir.',
    displayOverApps: 'Aparecer sobre outros apps',
    androidStep2: 'Abra Ajustes do celular → Aplicativos → Chrome (ou Recall) → Exibir sobre outros aplicativos → Permitir.',
    neverMissAlerts: 'Nunca perca os alertas',
    androidStep3: 'Em Ajustes → Apps → Chrome (ou Recall) → Bateria, selecione Irrestrito para que o Android não suspenda o Recall.',
    iosPermHeading: 'iPhone (Tela bloqueada e banners)',
    iosStep1: 'Vá em Ajustes do iPhone → Safari (ou Chrome) → Notificações e ative Permitir Notificações.',
    iosStep2: 'Certifique-se de que Tela Bloqueada, Central de Notificações e Banners estejam marcados.',
    addToHomeScreen: 'Adicionar à Tela de Início',
    iosStep3: 'No Safari, toque no botão Compartilhar → Adicionar à Tela de Início para ter a melhor experiência.',
    theme_light: 'Claro',
    theme_dark: 'Escuro',
    theme_ogshine: 'Aurora',
    theme_peach: 'Damasco',
    theme_midnight: 'Porto',
    theme_lilac: 'Íris',
    theme_dusk: 'Brasa',
    theme_seafoam: 'Samambaia',
    theme_graphite: 'Ardósia',
    theme_daybreak: 'Cobalto',
    theme_sherbet: 'Flor',
    theme_paper: 'Linho',
    theme_carbon: 'Ônix',
    detected: 'Detectado',
    tapToApply: 'Toque para aplicar',
    permissions: 'Permissões',
    permDesc: 'Ative as permissões para que o Recall alerte no horário, ouça comandos por voz e continue ativo em segundo plano.',
    permNotifications: 'Alertas de notificação',
    permNotificationsSub: 'Sons, toques e avisos quando seus lembretes chegarem',
    permMic: 'Microfone e comandos de voz',
    permMicSub: 'Digitação por voz e ações com mãos livres (Feito, Adiar)',
    permOverlay: 'Exibir sobre outros aplicativos',
    permOverlaySub: 'Exibe lembretes em tela cheia quando vencerem',
    permBattery: 'Bateria irrestrita',
    permBatterySub: 'Mantém lembretes e timers de foco confiáveis em segundo plano',
    manage: 'Gerenciar',
    openingSettings: 'Abrindo configurações do celular...'
  }
};

function T(key, ...args) {
  const l = state.settings.lang || 'en';
  const val = (UI_STRINGS[l] && UI_STRINGS[l][key] !== undefined)
    ? UI_STRINGS[l][key]
    : (UI_STRINGS.en && UI_STRINGS.en[key]);
  if (typeof val === 'function') return val(...args);
  return val !== undefined ? val : key;
}
function isActionVerbTask(task, lang = 'en') {
  if (!task || typeof task !== 'string') return false;
  const s = task.trim().toLowerCase();
  if (/^to\s+/i.test(s)) return true;
  if (lang === 'en') {
    return /^(?:call|buy|take|check|pay|send|do|make|write|read|clean|drink|finish|start|go|pick|order|email|text|meet|schedule|prepare|submit|review|book|ask|cancel|leave|wash|feed|walk|cook|exercise|workout|water|post|update|fix|organize|reply|listen|study|learn|pack|stretch|put|set|get|contact|look|see|print|file)\b/i.test(s);
  }
  if (lang === 'es') {
    return /^(?:llamar|comprar|tomar|pagar|enviar|hacer|ir|beber|comer|revisar|limpiar|organizar|estudiar|escribir|leer|terminar|empezar|preparar|pedir|cancelar|cocinar|entrenar|regar|arreglar|responder|recoger|sacar|poner|ver)\b/i.test(s);
  }
  if (lang === 'fr') {
    return /^(?:appeler|acheter|prendre|payer|envoyer|faire|aller|boire|manger|v[eé]rifier|nettoyer|ranger|étudier|écrire|lire|finir|commencer|pr[eé]parer|demander|annuler|cuisiner|arroser|r[eé]pondre|chercher)\b/i.test(s);
  }
  if (lang === 'de') {
    return /(?:anzurufen|anrufen|kaufen|nehmen|zahlen|bezahlen|senden|schreiben|lesen|putzen|trinken|essen|[uü]berpr[uü]fen|vorbereiten|starten|beginnen|gehen|machen)\b/i.test(s);
  }
  if (lang === 'pt') {
    return /^(?:ligar|comprar|tomar|pagar|enviar|fazer|ir|beber|comer|revisar|limpar|organizar|estudar|escrever|ler|terminar|come[çc]ar|preparar|pedir|cancelar|cozinhar|treinar|regar|responder|pegar)\b/i.test(s);
  }
  return false;
}

/* everything spoken aloud to the user, per selected language */
const PERSONALITY_LINES = {
  en: {
    warm: {
      line: "Hi, I'm Cocoa. Take a breath — I'll keep you on track, gently.",
      due: (t, task, lang = 'en') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Take a gentle breath. It's ${t}, and time to ${f}. Whenever you're ready, let's begin.`
          : `Take a gentle breath. It's ${t}. You have ${f}. Whenever you're ready, let's begin.`;
      }
    },
    buttery: {
      line: "Hello. Oak here. I will be the steady voice in the room.",
      due: (t, task, lang = 'en') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Steady now. It's ${t}. Time to focus on ${f}. Let's get it done.`
          : `Steady now. It's ${t}. Time for ${f}. Let's get it done.`;
      }
    },
    airy: {
      line: "Hey! Skye here. I'll keep things moving — quick, bright, and cheerful!",
      due: (t, task, lang = 'en') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Ding! It's ${t}! Ready to tackle ${f}? Let's do this!`
          : `Ding! It's ${t}! Ready for ${f}? Let's do this!`;
      }
    },
    bold: {
      line: "Hi, Cedar here. Let's get moving.",
      due: (t, task, lang = 'en') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `It's ${t}. Time to ${f}. Let's get straight to it.`
          : `It's ${t}. Up next: ${f}. Let's get straight to it.`;
      }
    },
    mellow: {
      line: "Hi, I am Willow. We can take this slowly, no rush at all.",
      due: (t, task, lang = 'en') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `${t} is here. In your own time, it's time to ${f}.`
          : `${t} is here. In your own time, ${f} is waiting for you.`;
      }
    }
  },
  es: {
    warm: {
      line: "Hola, soy Cocoa. Respira con calma; te acompañaré paso a paso con tranquilidad.",
      due: (t, task, lang = 'es') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Respira hondo con calma. Son las ${t}, momento de ${f}. Cuando quieras, empezamos.`
          : `Respira hondo con calma. Son las ${t}. Tienes: ${f}. Cuando quieras, empezamos.`;
      }
    },
    buttery: {
      line: "Hola, aquí Oak. Seré tu voz firme y serena en todo momento.",
      due: (t, task, lang = 'es') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Tranquilidad ante todo. Son las ${t}. Hora de ${f}. Vamos a conseguirlo.`
          : `Tranquilidad ante todo. Son las ${t}. Es momento de: ${f}. Vamos a conseguirlo.`;
      }
    },
    airy: {
      line: "¡Hola! Soy Skye. ¡Mantendremos el ritmo con energía, alegría y buen humor!",
      due: (t, task, lang = 'es') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `¡Ding! ¡Son las ${t}! ¿Listo para ${f}? ¡Vamos a por ello!`
          : `¡Ding! ¡Son las ${t}! ¿Todo listo para: ${f}? ¡Vamos a por ello!`;
      }
    },
    bold: {
      line: "Hola, soy Cedar. Vamos directos a lo importante.",
      due: (t, task, lang = 'es') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Son las ${t}. Momento de ${f}. Vamos al grano sin rodeos.`
          : `Son las ${t}. Próxima actividad: ${f}. Vamos al grano sin rodeos.`;
      }
    },
    mellow: {
      line: "Hola, soy Willow. Vamos con tranquilidad y a tu propio ritmo, sin prisas.",
      due: (t, task, lang = 'es') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Ya son las ${t}. A tu propio ritmo, es hora de ${f}.`
          : `Ya son las ${t}. A tu propio ritmo, ${f} te espera con calma.`;
      }
    }
  },
  fr: {
    warm: {
      line: "Bonjour, je suis Cocoa. Prenez une respiration bienveillante, je veille sur vous en douceur.",
      due: (t, task, lang = 'fr') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Prenez un instant pour respirer. Il est ${t}, l’heure de ${f}. Quand vous voulez, on commence.`
          : `Prenez un instant pour respirer. Il est ${t}. Vous avez : ${f}. Quand vous voulez, on commence.`;
      }
    },
    buttery: {
      line: "Bonjour, ici Oak. Je serai votre voix calme et rassurante.",
      due: (t, task, lang = 'fr') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Tout doux. Il est ${t}. C’est le moment de ${f}. Allons-y.`
          : `Tout doux. Il est ${t}. C’est l’heure de : ${f}. Allons-y.`;
      }
    },
    airy: {
      line: "Coucou ! C’est Skye. Gardons le cap avec joie, peps et bonne humeur !",
      due: (t, task, lang = 'fr') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Ding ! Il est ${t} ! Prêt pour ${f} ? On passe à l'action !`
          : `Ding ! Il est ${t} ! Paré pour : ${f} ? On passe à l'action !`;
      }
    },
    bold: {
      line: "Salut, c’est Cedar. Allons droit à l'essentiel.",
      due: (t, task, lang = 'fr') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Il est ${t}. C’est l’heure de ${f}. On y va directement.`
          : `Il est ${t}. Au programme : ${f}. On y va directement.`;
      }
    },
    mellow: {
      line: "Bonjour, je suis Willow. Nous avançons tout en douceur, sans la moindre urgence.",
      due: (t, task, lang = 'fr') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Il est ${t}. À votre rythme et en toute sérénité, c'est l'heure de ${f}.`
          : `Il est ${t}. À votre rythme et en toute sérénité, ${f} vous attend.`;
      }
    }
  },
  de: {
    warm: {
      line: "Hallo, ich bin Cocoa. Atme ruhig durch – ich begleite dich sanft und gelassen.",
      due: (t, task, lang = 'de') => {
        const isAction = isActionVerbTask(task, lang);
        return isAction
          ? `Atme kurz durch. Es ist ${t}, Zeit für: ${task}. Wann immer du bereit bist.`
          : `Atme kurz durch. Es ist ${t}. Anstehend: ${task}. Wann immer du bereit bist.`;
      }
    },
    buttery: {
      line: "Hallo, hier ist Oak. Ich bin deine verlässliche, ruhige Stimme im Alltag.",
      due: (t, task, lang = 'de') => {
        const isAction = isActionVerbTask(task, lang);
        return isAction
          ? `Ganz ruhig. Es ist ${t}. Zeit, dich auf ${task} zu fokussieren. Packen wir es an.`
          : `Ganz ruhig. Es ist ${t}. Zeit für: ${task}. Packen wir es an.`;
      }
    },
    airy: {
      line: "Hey! Hier ist Skye. Fröhlich, aufgeweckt und voller guter Energie!",
      due: (t, task, lang = 'de') => `Ding! Es ist ${t}! Bereit für: ${task}? Los geht's!`
    },
    bold: {
      line: "Hi, hier ist Cedar. Kommen wir direkt zur Sache.",
      due: (t, task, lang = 'de') => {
        const isAction = isActionVerbTask(task, lang);
        return isAction
          ? `Es ist ${t}. Zeit für: ${task}. Gehen wir es direkt an.`
          : `Es ist ${t}. Als Nächstes: ${task}. Gehen wir es direkt an.`;
      }
    },
    mellow: {
      line: "Hallo, ich bin Willow. Wir nehmen uns alle Zeit der Welt, ganz ohne Eile.",
      due: (t, task, lang = 'de') => {
        const isAction = isActionVerbTask(task, lang);
        return isAction
          ? `Es ist ${t}. In aller Ruhe: ${task} wartet ganz entspannt auf dich.`
          : `Es ist ${t}. In aller Ruhe: ${task} steht auf dem Plan.`;
      }
    }
  },
  pt: {
    warm: {
      line: "Olá, aqui é a Cocoa. Respire fundo com calma — vou te acompanhar com gentileza.",
      due: (t, task, lang = 'pt') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Respire com calma. São ${t}, hora de ${f}. Quando estiver pronto, vamos começar.`
          : `Respire com calma. São ${t}. Você tem: ${f}. Quando estiver pronto, vamos começar.`;
      }
    },
    buttery: {
      line: "Olá, aqui é o Oak. Serei a sua voz firme e tranquila.",
      due: (t, task, lang = 'pt') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Foco e calma. São ${t}. Momento de ${f}. Vamos em frente.`
          : `Foco e calma. São ${t}. Momento de: ${f}. Vamos em frente.`;
      }
    },
    airy: {
      line: "Oi! Aqui é a Skye. Vamos manter o ritmo com energia, leveza e alegria!",
      due: (t, task, lang = 'pt') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `Ding! São ${t}! Tudo pronto para ${f}? Vamos nessa!`
          : `Ding! São ${t}! Tudo pronto para: ${f}? Vamos nessa!`;
      }
    },
    bold: {
      line: "Oi, aqui é o Cedar. Vamos direto ao ponto.",
      due: (t, task, lang = 'pt') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `São ${t}. Hora de ${f}. Direto ao que interessa.`
          : `São ${t}. A seguir: ${f}. Direto ao que interessa.`;
      }
    },
    mellow: {
      line: "Olá, eu sou a Willow. Vamos com calma e sem pressa alguma.",
      due: (t, task, lang = 'pt') => {
        const isAction = isActionVerbTask(task, lang);
        const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
        return isAction
          ? `São ${t}. No seu próprio tempo, é hora de ${f}.`
          : `São ${t}. No seu próprio tempo, ${f} está te esperando com tranquilidade.`;
      }
    }
  }
};

const SPEECH_PHRASES = {
  en: {
    intro: n => `Hi, I'm ${n}. This is how I'll remind you.`,
    langConfirm: () => "This is how I'll speak to you now.",
    pace: () => 'This is my pace at the moment. It suits me fine.',
    voiceOn: () => 'Voice reminders are on.',
    due: (t, task) => {
      const isAction = isActionVerbTask(task, 'en');
      const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
      return isAction
        ? `Hey, it's ${t}. Time to ${f}. It's time to get started.`
        : `Hey, it's ${t}. Reminder: ${f}. It's time to get started.`;
    },
    ping: task => {
      const isAction = isActionVerbTask(task, 'en');
      const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
      return isAction
        ? `Hey, you wanted to ${f}.`
        : `Hey, reminder for: ${f}.`;
    },
    auditionTask: () => 'take a mindful pause',
  },
  es: {
    intro: n => `Hola, soy ${n}. Así te lo voy a recordar.`,
    langConfirm: () => 'Así es como te hablaré ahora.',
    pace: () => 'Este es mi ritmo en este momento. Me viene bien.',
    voiceOn: () => 'Los recordatorios de voz están activados.',
    due: (t, task) => {
      const isAction = isActionVerbTask(task, 'es');
      const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
      return isAction
        ? `Ey, son las ${t}. Momento de ${f}. Es hora de empezar.`
        : `Ey, son las ${t}. Recordatorio: ${f}. Es hora de empezar.`;
    },
    ping: task => {
      const isAction = isActionVerbTask(task, 'es');
      const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
      return isAction
        ? `Ey, querías ${f}.`
        : `Ey, tienes este recordatorio: ${f}.`;
    },
    auditionTask: () => 'hacer una pausa consciente',
  },
  fr: {
    intro: n => `Salut, je suis ${n}. Voilà comment je vais te le rappeler.`,
    langConfirm: () => 'C’est comme ça que je vais te parler.',
    pace: () => 'Voilà mon rythme en ce moment. Ça me convient.',
    voiceOn: () => 'Les rappels vocaux sont activés.',
    due: (t, task) => {
      const isAction = isActionVerbTask(task, 'fr');
      const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
      return isAction
        ? `Salut, il est ${t}. C’est l’heure de ${f}.`
        : `Salut, il est ${t}. Rappel : ${f}.`;
    },
    ping: task => {
      const isAction = isActionVerbTask(task, 'fr');
      const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
      return isAction
        ? `Salut, tu voulais ${f}.`
        : `Salut, tu as ce rappel : ${f}.`;
    },
    auditionTask: () => 'faire une pause bienveillante',
  },
  de: {
    intro: n => `Hi, ich bin ${n}. So erinnere ich dich daran.`,
    langConfirm: () => 'So spreche ich jetzt mit dir.',
    pace: () => 'Das ist mein Tempo im Moment. Passt gut für mich.',
    voiceOn: () => 'Sprach-Erinnerungen sind eingeschaltet.',
    due: (t, task) => {
      const isAction = isActionVerbTask(task, 'de');
      return isAction
        ? `Hi, es ist ${t}. Zeit für: ${task}. Zeit, loszulegen.`
        : `Hi, es ist ${t}. Erinnerung: ${task}. Zeit, loszulegen.`;
    },
    ping: task => {
      const isAction = isActionVerbTask(task, 'de');
      return isAction
        ? `Hi, du wolltest ${task}.`
        : `Hi, hier ist deine Erinnerung für: ${task}.`;
    },
    auditionTask: () => 'eine achtsame Pause einlegen',
  },
  pt: {
    intro: n => `Oi, aqui fala ${n}. É assim que vou te lembrar.`,
    langConfirm: () => 'É assim que eu vou falar com você agora.',
    pace: () => 'Esse é o meu ritmo agora. Fica bom pra mim.',
    voiceOn: () => 'Os lembretes de voz estão ativados.',
    due: (t, task) => {
      const isAction = isActionVerbTask(task, 'pt');
      const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
      return isAction
        ? `Oi, são ${t}. Hora de ${f}. Hora de começar.`
        : `Oi, são ${t}. Lembrete: ${f}. Hora de começar.`;
    },
    ping: task => {
      const isAction = isActionVerbTask(task, 'pt');
      const f = isAction ? task.charAt(0).toLowerCase() + task.slice(1) : task;
      return isAction
        ? `Oi, você queria ${f}.`
        : `Oi, você tem este lembrete: ${f}.`;
    },
    auditionTask: () => 'fazer uma pausa consciente',
  },
};

const speech = {
  voices: [],
  refresh() {
    try {
      this.voices = (speechSynthesis.getVoices() || []).slice();
    } catch (e) { this.voices = []; }
    return this.voices;
  },
  personality() { return PERSONALITIES[state.settings.personality] || PERSONALITIES.warm; },
  lang() { return state.settings.lang || 'en'; },
  /* the spoken phrase for a key, in the user's chosen language */
  t(key, a, b) { const p = SPEECH_PHRASES[this.lang()] || SPEECH_PHRASES.en; return p[key](a, b); },
  /* the line a personality speaks when it is picked — each one has its own
     wording, so the characters differ in rhythm even on a single-voice device */
  introLine() {
    const p = this.personality();
    const l = this.lang();
    const k = this.key();
    if (PERSONALITY_LINES[l] && PERSONALITY_LINES[l][k]?.line) return PERSONALITY_LINES[l][k].line;
    if (PERSONALITY_LINES.en && PERSONALITY_LINES.en[k]?.line) return PERSONALITY_LINES.en[k].line;
    return this.t('intro', p.name);
  },
  dueLine(t, task) {
    const p = this.personality();
    const l = this.lang();
    const k = this.key();
    if (PERSONALITY_LINES[l] && PERSONALITY_LINES[l][k]?.due) return PERSONALITY_LINES[l][k].due(t, task, l);
    if (PERSONALITY_LINES.en && PERSONALITY_LINES.en[k]?.due) return PERSONALITY_LINES.en[k].due(t, task, 'en');
    return this.t('due', t, task);
  },
  auditionDue() {
    const times = {
      en: '3:30 PM',
      es: '3:30 de la tarde',
      fr: '15 h 30',
      de: '15:30 Uhr',
      pt: '3:30 da tarde'
    };
    const t = times[this.lang()] || '3:30 PM';
    const task = this.t('auditionTask') || 'take a mindful pause';
    return this.dueLine(t, task);
  },
  /* the selected personality's key */
  key() { const k = state.settings.personality; return PERSONALITIES[k] ? k : 'warm'; },
  /* male / female / unknown, for named desktop voices and for the gendered ids
     phones expose ("en-us-x-sfg#female_1-local") */
  genderOf(v) {
    const n = (v.name || '').toLowerCase();
    if (/\bfemale\b|_female|#female|woman/.test(n)) return 'female';
    if (/\bmale\b|_male|#male/.test(n)) return 'male';
    if (FEMALE_HINTS.test(n)) return 'female';
    if (MALE_HINTS.test(n)) return 'male';
    return null;
  },
  /* every usable device voice for a personality, best first: right gender, a
     voice named for the character, its accent, then better-quality engines */
  candidates(p, list) {
    const lang = this.lang().toLowerCase();
    const inLang = list.filter(v => {
      const vl = (v.lang || '').replace('_', '-').toLowerCase();
      return vl === lang || vl.startsWith(lang + '-');
    });
    if (!inLang.length) return [];

    return inLang.map(v => {
      const n = (v.name || '').toLowerCase();
      const g = this.genderOf(v);
      let score = 0;
      if (g === p.gender) score += 100; else if (g) score -= 80;
      if (p.locale && (v.lang || '').toLowerCase().replace('_', '-') === p.locale.toLowerCase()) score += 40;
      /* Prioritize modern neural, natural, wavenet, studio, enhanced and siri voices */
      if (/natural|neural|online|enhanced|premium|studio|wavenet|siri/i.test(n)) score += 300;
      if (/google/i.test(n)) score += 200;
      /* Language-specific native voice matches */
      if (lang === 'es' && /monica|paulina|helena|jorge|diego|carlos|laura|carmen|lucia|jimena|francisca|paloma/i.test(n)) score += 120;
      if (lang === 'fr' && /amelie|aurelie|celine|thomas|audrey|juliette|denise|henri|nicolas|hortense/i.test(n)) score += 120;
      if (lang === 'de' && /anna|marlene|petra|vicki|katja|claudia|hans|markus|stefan|martin|yannick/i.test(n)) score += 120;
      if (lang === 'pt' && /luciana|vitoria|joana|ines|raquel|felipe|ricardo|thiago|bruno|heloisa/i.test(n)) score += 120;
      if (lang === 'en' && /aria|jenny|guy|ryan|samantha|ava|sonia|hazel|oliver|libby/i.test(n)) score += 120;
      if (p.hint && new RegExp(p.hint, 'i').test(n)) score += 70;
      /* Heavily demote legacy robotic desktop synthesizers (Microsoft David, Zira, eSpeak, Sam, robotic) */
      if (/desktop|espeak|zira|david|mark|sample|robotic/i.test(n)) score -= 250;
      return { v, score };
    }).sort((a, b) => b.score - a.score || String(a.v.name).localeCompare(String(b.v.name))).map(x => x.v);
  },
  /* the whole cast resolved at once, so a character only shares a speaker when
     the device has fewer voices than characters */
  assignments() {
    const list = this.refresh();
    const map = {};
    if (!list.length) return map;
    const curLang = this.lang();
    const sig = `${curLang}~` + list.map(v => `${v.name}|${v.lang}|${v.voiceURI}`).join('~');
    if (this._sig === sig && this._map) return this._map;
    const used = new Set();
    VOICE_ORDER.forEach(k => {
      const p = PERSONALITIES[k];
      const cands = this.candidates(p, list);
      const right = cands.filter(v => this.genderOf(v) === p.gender);
      const pool = right.length ? right : cands;
      const free = pool.filter(v => !used.has(v.name + '|' + v.lang));
      const pick = free[0] || pool[0] || null;
      if (pick && pool.length > 1) used.add(pick.name + '|' + pick.lang);
      map[k] = pick;
    });
    this._sig = sig; this._map = map;
    return map;
  },
  current() { return this.assignments()[this.key()] || null; },
  /* phones build their voice list lazily — on iOS it can stay empty until the
     engine has spoken once, so nudge it on the first interaction */
  primed: false,
  prime() {
    if (this.primed) return;
    this.primed = true;
    try {
      if (!this.refresh().length) {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0; u.rate = 2;
        speechSynthesis.speak(u);
      }
      this.refresh();
      [80, 300, 800, 1600].forEach(ms => setTimeout(() => this.afterVoices(), ms));
    } catch (e) {}
  },
  afterVoices() {
    this.refresh();
    const cur = navStack[navStack.length - 1];
    if (cur && (cur.name === 'voice' || cur.name === 'settings')) render();
  },
  /* what the main Settings row shows */
  voiceLabel() { return this.personality().name; },
  run: 0,
  stop() {
    this.run++;
    try {
      const capTTS = window.Capacitor?.Plugins?.TextToSpeech;
      if (capTTS && typeof capTTS.stop === 'function') {
        capTTS.stop().catch(() => {});
      }
    } catch (e) {}
    try {
      if ('speechSynthesis' in window && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    } catch (e) {}
  },
  say(text, force, onEnd) {
    if (!state.settings.voice && !force) return false;
    try {
      earconAudio.play(this.key());
      const p = this.personality();
      const pace = PACE_RATE[state.settings.pace] || 1;
      const baseRate = Math.min(1.25, Math.max(0.75, p.rate * pace));
      const basePitch = Math.min(1.15, Math.max(0.85, p.pitch));
      const v = this.current();
      const langTag = LANG_BCP[this.lang()] || 'en-US';
      const run = ++this.run;
      
      let finished = false;
      const finishOnce = () => {
        if (finished || run !== this.run) return;
        finished = true;
        if (typeof onEnd === 'function') onEnd();
      };

      const cleanText = String(text || '').trim();
      if (!cleanText) {
        finishOnce();
        return true;
      }

      // Check if native Capacitor TextToSpeech is available (Android app)
      const capTTS = window.Capacitor?.Plugins?.TextToSpeech;
      if (capTTS && typeof capTTS.speak === 'function') {
        capTTS.speak({
          text: cleanText,
          lang: langTag,
          rate: baseRate,
          pitch: basePitch,
          volume: 1.0,
          category: 'ambient',
        }).then(() => finishOnce()).catch(() => {
          this.speakWeb(cleanText, v, langTag, baseRate, basePitch, run, finishOnce);
        });
        return true;
      }

      return this.speakWeb(cleanText, v, langTag, baseRate, basePitch, run, finishOnce);
    } catch (e) {
      if (typeof onEnd === 'function') onEnd();
    }
    return true;
  },
  speakWeb(cleanText, v, langTag, baseRate, basePitch, run, finishOnce) {
    try {
      if ('speechSynthesis' in window && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      const u = new SpeechSynthesisUtterance(cleanText);
      u.lang = (v && v.lang) ? v.lang : langTag;
      if (v) u.voice = v;
      u.rate = baseRate;
      u.pitch = basePitch;
      u.volume = 1;

      u.onend = finishOnce;
      u.onerror = finishOnce;

      const delayMs = IS_IOS ? 160 : 70;
      setTimeout(() => {
        if (run !== this.run) return;
        try {
          speechSynthesis.speak(u);
        } catch (e) {
          finishOnce();
        }
      }, delayMs);

      const wordCount = cleanText.split(/\s+/).length;
      const estDurationMs = Math.max(1600, (wordCount / (2.0 * baseRate)) * 1000) + delayMs + 1200;
      setTimeout(() => {
        if (run === this.run && !finished) {
          finishOnce();
        }
      }, estDurationMs);

      if (IS_IOS && !this.voices.length) setTimeout(() => {
        if (run === this.run && this.refresh().length) this.say(cleanText, true, finishOnce);
      }, 700);
    } catch (e) {
      finishOnce();
    }
    return true;
  }
};
if ('speechSynthesis' in window) {
  try {
    speech.refresh();
    speechSynthesis.addEventListener?.('voiceschanged', () => speech.afterVoices());
    /* the phone only fills its voice list after a real interaction */
    ['pointerdown', 'keydown'].forEach(ev =>
      window.addEventListener(ev, () => speech.prime(), { once: true, passive: true }));
  } catch (e) {}
}

/* ---------- themes ---------- */
const THEMES = {
  light:    { name: 'Light',   bg: '#FAFAF7', surface: '#FFFFFF', ink: '#1C1B1A', accent: '#3D6C42' },
  dark:     { name: 'Dark',    bg: '#1C1B1A', surface: '#262523', ink: '#EDEBE7', accent: '#A8C790', dark: true },
  ogshine:  { name: 'Aurora',  bg: '#0A0A0A', surface: '#141414', ink: '#F2F2F2', accent: '#2EE6A8', dark: true },
  peach:    { name: 'Apricot', bg: '#FBEAE3', surface: '#FFF8F5', ink: '#3A2A24', accent: '#BC4E2B' },
  midnight: { name: 'Harbor',  bg: '#121A33', surface: '#1B2547', ink: '#E8EAF2', accent: '#8B9CFF', dark: true },
  lilac:    { name: 'Iris',    bg: '#EDEAFB', surface: '#F8F6FE', ink: '#2A2440', accent: '#7356EC' },
  dusk:     { name: 'Ember',   bg: '#1B1222', surface: '#271931', ink: '#F2E9F4', accent: '#F09A6C', dark: true },
  seafoam:  { name: 'Fern',    bg: '#E4F0E9', surface: '#F6FBF8', ink: '#1E3A30', accent: '#198058' },
  graphite: { name: 'Slate',   bg: '#17181A', surface: '#212226', ink: '#E8E9EB', accent: '#AEB7C4', dark: true },
  daybreak: { name: 'Cobalt',  bg: '#EEF1FA', surface: '#FBFCFE', ink: '#232A3F', accent: '#3865D8' },
  sherbet:  { name: 'Blossom', bg: '#FBECEF', surface: '#FEF7F9', ink: '#42222E', accent: '#CB3060' },
  paper:    { name: 'Linen',   bg: '#F3EDE2', surface: '#FBF8F2', ink: '#3D3428', accent: '#8E5A35' },
  carbon:   { name: 'Onyx',    bg: '#101314', surface: '#181C1E', ink: '#E9EDEC', accent: '#7FA3D9', dark: true },
};
/* theme grid order (Auto is prepended by the UI): light/dark alternating */
const THEME_ORDER = ['light', 'dark', 'peach', 'ogshine', 'lilac', 'midnight', 'seafoam', 'dusk', 'daybreak', 'graphite', 'sherbet', 'carbon', 'paper'];
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
function clamp255(n) { return Math.max(0, Math.min(255, Math.round(n))); }
function relLum(hex) {
  return hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
}
/* WCAG contrast ratio, used to pick readable text on the accent fill */
function contrast(a, b) {
  const [hi, lo] = [relLum(a), relLum(b)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
}
function shade(hex, f) { // f<0 darken toward black, f>0 lighten toward white
  const [r, g, b] = hexToRgb(hex);
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  return `rgb(${clamp255(r + (t - r) * p)}, ${clamp255(g + (t - g) * p)}, ${clamp255(b + (t - b) * p)})`;
}
const CUSTOM_TOKENS = ['--bg', '--surface', '--accent', '--ink', '--on-ink', '--ink-60', '--ink-50', '--ink-40', '--ink-30', '--line', '--line-soft', '--shadow', '--press', '--active-bg', '--knob-on'];
function isDeviceDark() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) {
    return false;
  }
}

const darkMQ = (typeof window !== 'undefined' && window.matchMedia)
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function themeDef() {
  const key = state.settings.theme || 'system';
  if (key === 'system') return isDeviceDark() ? THEMES.dark : THEMES.light;
  return THEMES[key] || THEMES.light;
}
function themeLabel(key) {
  const k = key || state.settings.theme || 'system';
  if (k === 'system') return T('autoTheme');
  return T('theme_' + k) || (THEMES[k] ? THEMES[k].name : k);
}
function applyTheme() {
  const el = document.documentElement;
  const def = themeDef();
  const [ir, ig, ib] = hexToRgb(def.ink);
  const rgba = a => `rgba(${ir}, ${ig}, ${ib}, ${a})`;
  const set = (p, v) => el.style.setProperty(p, v);
  set('--bg', def.bg);
  set('--surface', def.surface);
  set('--accent', def.accent);
  set('--ink', `rgb(${ir}, ${ig}, ${ib})`);
  /* text on accent fills (primary buttons, selected options):
     strictly ensure high contrast: light on dark or dark on light.
     Selects pure white (#FFFFFF) or deep charcoal (#111315)
     based on whichever yields the mathematically superior WCAG contrast. */
  const cWhite = contrast(def.accent, '#FFFFFF');
  const cBlack = contrast(def.accent, '#111315');
  const accentInk = cWhite >= cBlack ? '#FFFFFF' : '#111315';
  set('--on-accent', accentInk);
  set('--active-ink', '#FFFFFF');
  /* tinted accent wash and hairlines derived from the same accent */
  const [ar, ag, ab] = hexToRgb(def.accent);
  const argba = a => `rgba(${ar}, ${ag}, ${ab}, ${a})`;
  set('--accent-soft', argba(def.dark ? .24 : .13));
  set('--accent-ring', argba(def.dark ? .55 : .42));
  set('--on-ink', def.dark ? def.bg : '#FFFFFF');
  set('--ink-60', rgba(def.dark ? .78 : .70));
  set('--ink-50', rgba(def.dark ? .68 : .60));
  set('--ink-40', rgba(def.dark ? .58 : .50));
  set('--ink-30', rgba(def.dark ? .52 : .45));
  set('--line', rgba(def.dark ? .35 : .22));
  set('--line-soft', rgba(def.dark ? .20 : .12));
  set('--shadow', def.dark ? 'rgba(0,0,0,.60)' : 'rgba(0,0,0,.16)');
  set('--press', rgba(def.dark ? .14 : .08));
  set('--active-bg', def.dark ? shade(def.bg, -.4) : '#1C1B1A');
  set('--knob-on', def.dark ? def.bg : '#FFFFFF');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', def.bg);
}

function handleSystemThemeChange() {
  if ((state.settings.theme || 'system') === 'system') {
    applyTheme();
    const cur = navStack[navStack.length - 1];
    if (cur && (cur.name === 'theme' || cur.name === 'settings' || cur.name === 'home')) render();
  }
}

if (darkMQ) {
  if (darkMQ.addEventListener) {
    darkMQ.addEventListener('change', handleSystemThemeChange);
  } else if (darkMQ.addListener) {
    darkMQ.addListener(handleSystemThemeChange);
  }
}

window.addEventListener('focus', handleSystemThemeChange);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') handleSystemThemeChange();
});

if (window.Capacitor?.Plugins?.App?.addListener) {
  try {
    window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) handleSystemThemeChange();
    });
  } catch (e) {}
}

/* ============================================================
   FOCUS MODE & AMBIENT SOUNDSCAPES (Web Audio Synthesizer)
   ============================================================ */
const focusEngine = {
  ctx: null,
  activeType: 'brown',
  nodes: [],
  timerSec: 15 * 60,
  initialSec: 15 * 60,
  timerId: null,
  state: 'stopped',

  initCtx() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },

  stopAudio() {
    this.nodes.forEach(n => {
      try { n.stop?.(); n.disconnect?.(); } catch (e) {}
    });
    this.nodes = [];
  },

  playSoundscape(type) {
    this.stopAudio();
    this.activeType = type;
    if (this.state === 'running') renderMiniBar();
    if (type === 'mute') return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      if (type === 'rain') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2) * 0.09;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        this.nodes.push(noise, filter, gain);
      } else if (type === 'brown') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 2.8;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, ctx.currentTime);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.55, ctx.currentTime);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        this.nodes.push(noise, filter, gain);
      } else if (type === 'lofi') {
        const freqs = [174.61, 220.00, 261.63, 329.63];
        const gainMaster = ctx.createGain();
        gainMaster.gain.setValueAtTime(0.12, ctx.currentTime);
        gainMaster.connect(ctx.destination);
        freqs.forEach(f => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          const fFilter = ctx.createBiquadFilter();
          fFilter.type = 'lowpass';
          fFilter.frequency.setValueAtTime(450, ctx.currentTime);
          osc.connect(fFilter);
          fFilter.connect(gainMaster);
          osc.start();
          this.nodes.push(osc, fFilter);
        });
        this.nodes.push(gainMaster);
      } else if (type === 'stream') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.15;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(650, ctx.currentTime);
        bp.Q.setValueAtTime(1.8, ctx.currentTime);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        noise.connect(bp);
        bp.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        this.nodes.push(noise, bp, gain);
      }
    } catch (e) {}
  },

  start(durationMinutes, soundType) {
    this.stopAudio();
    if (typeof durationMinutes === 'number' && durationMinutes > 0) {
      this.initialSec = durationMinutes * 60;
      this.timerSec = this.initialSec;
    } else {
      this.timerSec = this.initialSec;
    }
    if (soundType) this.activeType = soundType;
    this.state = 'running';
    this.playSoundscape(this.activeType);
    clearInterval(this.timerId);
    this.timerId = setInterval(() => this.tick(), 1000);
    renderMiniBar();
  },

  pause() {
    if (this.state === 'running') {
      this.state = 'paused';
      this.stopAudio();
      clearInterval(this.timerId);
      this.timerId = null;
      renderMiniBar();
    }
  },

  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.playSoundscape(this.activeType);
      clearInterval(this.timerId);
      this.timerId = setInterval(() => this.tick(), 1000);
      renderMiniBar();
    }
  },

  stop() {
    this.state = 'stopped';
    this.stopAudio();
    clearInterval(this.timerId);
    this.timerId = null;
    this.timerSec = this.initialSec;
    removeMiniBar();
  },

  tick() {
    if (this.timerSec > 0) {
      this.timerSec--;
      updateMiniBarTime();
      const modalTime = document.getElementById('focusModalTime');
      if (modalTime) modalTime.textContent = this.fmt(this.timerSec);
      const pageTime = document.getElementById('focusPageTime');
      if (pageTime) pageTime.textContent = this.fmt(this.timerSec);
    } else {
      this.stop();
      earconAudio.play(speech.key());
      setTimeout(() => {
        speech.say(`Focus session complete. Great job staying present.`, true);
      }, 300);
      toast('Focus session complete! Take a gentle breath.');
      const cur = navStack[navStack.length - 1];
      if (cur && cur.name === 'focus') render();
    }
  },

  fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
};

let focusMiniPos = null;
let focusMiniJustDragged = false;

function applyMiniBarPos(el) {
  const dev = document.getElementById('device');
  if (!dev || !el) return;
  const devRect = dev.getBoundingClientRect();
  const barRect = el.getBoundingClientRect();
  const barW = barRect.width || 210;
  const barH = barRect.height || 42;

  if (!focusMiniPos) {
    // Default initial position: compact bottom-left pill, cleanly leaving the bottom-right FAB open
    const defaultLeft = 16;
    const defaultTop = Math.max(16, devRect.height - barH - 84);
    focusMiniPos = { left: defaultLeft, top: defaultTop };
  }

  const minX = 8;
  const maxX = Math.max(8, devRect.width - barW - 8);
  const minY = 8;
  const maxY = Math.max(8, devRect.height - barH - 8);

  focusMiniPos.left = Math.max(minX, Math.min(maxX, focusMiniPos.left));
  focusMiniPos.top = Math.max(minY, Math.min(maxY, focusMiniPos.top));

  el.style.left = `${focusMiniPos.left}px`;
  el.style.top = `${focusMiniPos.top}px`;
  el.style.bottom = 'auto';
  el.style.right = 'auto';
  el.style.transform = 'none';
}

function setupMiniBarDrag(el) {
  if (!el || el._dragBound) return;
  el._dragBound = true;

  el.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    const dev = document.getElementById('device');
    if (!dev) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initLeft = el.offsetLeft;
    const initTop = el.offsetTop;
    let isDragging = false;

    function onPointerMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!isDragging) {
        if (Math.hypot(dx, dy) > 5) {
          isDragging = true;
          el.classList.add('is-dragging');
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
        }
      }
      if (isDragging) {
        const devRect = dev.getBoundingClientRect();
        const barRect = el.getBoundingClientRect();
        const minX = 8;
        const maxX = Math.max(8, devRect.width - barRect.width - 8);
        const minY = 8;
        const maxY = Math.max(8, devRect.height - barRect.height - 8);

        const newLeft = Math.max(minX, Math.min(maxX, initLeft + dx));
        const newTop = Math.max(minY, Math.min(maxY, initTop + dy));

        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
        focusMiniPos = { left: newLeft, top: newTop };
      }
    }

    function onPointerUp(ev) {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (isDragging) {
        try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        el.classList.remove('is-dragging');
        focusMiniJustDragged = true;
        setTimeout(() => { focusMiniJustDragged = false; }, 200);
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  });
}

function renderMiniBar() {
  const cur = navStack[navStack.length - 1];
  if (focusEngine.state === 'stopped' || (cur && cur.name === 'focus')) {
    removeMiniBar();
    return;
  }
  const dev = document.getElementById('device');
  if (!dev) return;

  let el = document.getElementById('focusMiniBar');
  const isRunning = focusEngine.state === 'running';
  const soundName = { brown: 'Brown Noise', rain: 'Soft Rain', lofi: 'Lo-Fi Warmth', stream: 'Forest Stream', mute: 'Silent' }[focusEngine.activeType] || 'Focus';

  if (!el) {
    el = document.createElement('div');
    el.id = 'focusMiniBar';
    el.className = `focus-mini-bar ${isRunning ? 'is-running' : 'is-paused'}`;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Focus timer');
    dev.appendChild(el);
    setupMiniBarDrag(el);
  } else {
    el.className = `focus-mini-bar ${isRunning ? 'is-running' : 'is-paused'}`;
  }

  el.innerHTML = `
    <div class="focus-mini-drag" title="Drag to move">
      ${I.grip(14)}
    </div>
    <div class="focus-mini-info" data-action="open-focus" title="Tap to expand Focus mode">
      <span class="focus-mini-pulse"></span>
      <span class="focus-mini-time"><strong>${focusEngine.fmt(focusEngine.timerSec)}</strong></span>
      <span class="focus-mini-sound">${soundName}</span>
    </div>
    <div class="focus-mini-actions">
      <button class="focus-mini-btn" data-action="${isRunning ? 'focus-pause' : 'focus-resume'}" aria-label="${isRunning ? 'Pause' : 'Resume'}" title="${isRunning ? 'Pause' : 'Resume'}">
        ${isRunning ? I.pause(13) : I.play(13)}
      </button>
      <button class="focus-mini-btn stop" data-action="focus-stop" aria-label="Stop focus session" title="Stop">
        ${I.x(13)}
      </button>
    </div>
  `;

  applyMiniBarPos(el);
}

function updateMiniBarTime() {
  const el = document.getElementById('focusMiniBar');
  if (!el) return;
  const timeEl = el.querySelector('strong');
  if (timeEl) timeEl.textContent = focusEngine.fmt(focusEngine.timerSec);
}

function removeMiniBar() {
  const el = document.getElementById('focusMiniBar');
  if (el) el.remove();
}

window.addEventListener('resize', () => {
  const el = document.getElementById('focusMiniBar');
  if (el) applyMiniBarPos(el);
});

function openFocusSheet() {
  const currentSound = focusEngine.activeType || 'brown';
  const currentDuration = Math.round(focusEngine.initialSec / 60) || 15;
  const isRunning = focusEngine.state === 'running';
  const sounds = [
    { id: 'brown', label: 'Brown Noise', ic: I.volume(14) },
    { id: 'rain', label: 'Soft Rain', ic: I.sparkle(14) },
    { id: 'lofi', label: 'Lo-Fi Warmth', ic: I.sun(14) },
    { id: 'stream', label: 'Forest Stream', ic: I.sparkle(14) },
    { id: 'mute', label: 'Silent Timer', ic: I.bell(14) },
  ];
  const soundChips = sounds.map(s =>
    `<button class="soundscape-chip ${currentSound === s.id ? 'selected' : ''}" data-action="pick-soundscape" data-sound="${s.id}">
      ${s.ic}<span>${s.label}</span>
    </button>`
  ).join('');

  const timeChips = [15, 25, 45].map(m =>
    `<button class="chip ${currentDuration === m ? 'selected' : ''}" data-action="pick-focus-duration" data-min="${m}">
      ${m} mins
    </button>`
  ).join('');

  sheet(`
    <div class="sheet-handle"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div class="sheet-title" style="margin:0;display:flex;align-items:center;gap:8px;">${I.focus(20)}<span>Focus Mode</span></div>
      ${focusEngine.state !== 'stopped' ? `<button class="chip" data-action="focus-stop" style="color:#E4537F;border-color:rgba(228,83,127,.3);font-size:12px;">Reset</button>` : ''}
    </div>
    <div class="focus-timer-display" id="focusModalTime">${focusEngine.fmt(focusEngine.timerSec)}</div>
    <div style="font-size:13px;color:var(--ink-40);margin-bottom:8px;">Soundscape</div>
    <div class="soundscape-row">${soundChips}</div>
    <div style="font-size:13px;color:var(--ink-40);margin-top:14px;margin-bottom:8px;">Duration</div>
    <div class="chip-row tight">${timeChips}</div>
    <div style="margin-top:24px;display:flex;gap:10px;">
      ${isRunning ?
        `<button class="btn outline" style="flex:1;" data-action="focus-pause">${I.pause(16)} <span style="margin-left:6px;">Pause</span></button>` :
        focusEngine.state === 'paused' ?
        `<button class="btn primary" style="flex:1;" data-action="focus-resume">${I.play(16)} <span style="margin-left:6px;">Resume</span></button>` :
        `<button class="btn primary" style="flex:1;" data-action="focus-start">${I.play(16)} <span style="margin-left:6px;">Start Focus</span></button>`
      }
    </div>
  `);
}

/* ============================================================
   PERSONAL VOICE NOTES / LOVED ONES VOICE
   ============================================================ */
let recordTimerSec = 0;
let recordInterval = null;
let currentVoiceNoteAudio = null;

const voiceNoteRecorder = {
  recorder: null,
  stream: null,
  chunks: [],
  recording: false,
  start(onUpdate, onFinish, onError) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Audio recording is not supported in this browser.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.stream = stream;
      this.chunks = [];
      const mime = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')) ? 'audio/webm' :
                   (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')) ? 'audio/mp4' : '';
      this.recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      this.recording = true;
      recordTimerSec = 0;
      clearInterval(recordInterval);
      recordInterval = setInterval(() => {
        recordTimerSec++;
        onUpdate?.(recordTimerSec);
        render();
      }, 1000);

      this.recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
      };
      this.recorder.onstop = () => {
        this.recording = false;
        clearInterval(recordInterval);
        const finalBlob = new Blob(this.chunks, { type: mime || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
          }
          onFinish?.({ data: reader.result, duration: Math.max(1, recordTimerSec) });
        };
        reader.readAsDataURL(finalBlob);
      };
      this.recorder.start();
      toast("Recording personal voice note... speak now.");
      render();
    }).catch(err => {
      toast("Microphone access needed to record voice note.");
      onError?.(err);
    });
  },
  stop() {
    if (this.recorder && this.recording) {
      try { this.recorder.stop(); } catch (e) {}
    }
  }
};

function playVoiceClip(dataUrl, onEnd) {
  stopVoiceClip();
  try {
    currentVoiceNoteAudio = new Audio(dataUrl);
    currentVoiceNoteAudio.onended = () => {
      currentVoiceNoteAudio = null;
      onEnd?.();
      render();
    };
    currentVoiceNoteAudio.play().catch(() => {});
    render();
  } catch (e) {}
}

function stopVoiceClip() {
  if (currentVoiceNoteAudio) {
    try { currentVoiceNoteAudio.pause(); } catch (e) {}
    currentVoiceNoteAudio = null;
  }
}

function togglePreviewVoiceClip(dataUrl) {
  if (currentVoiceNoteAudio) {
    stopVoiceClip();
    render();
  } else {
    playVoiceClip(dataUrl, () => render());
  }
}

/* ============================================================
   HANDS-FREE ACTIVE VOICE LISTENER (Web Speech API)
   ============================================================ */
const WORD_NUMS = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'twenty-five': 25, 'twenty five': 25, 'thirty': 30, 'forty': 40,
  'forty-five': 45, 'forty five': 45, 'fifty': 50, 'sixty': 60
};

function parseSnoozeCommand(rawText) {
  if (!rawText) return null;
  let text = rawText.toLowerCase().trim();

  const isSnooze = /\b(snooze|later|wait|delay|remind me|give me|in a bit|hold on)\b/i.test(text);
  if (!isSnooze) return null;

  text = text.replace(/\bhalf\s+(?:an|a)\s+hour\b/gi, '30 minutes');
  text = text.replace(/\b(?:an|a)\s+hour\b/gi, '1 hour');
  text = text.replace(/\b(?:an|a)\s+minute\b/gi, '1 minute');

  for (const [w, n] of Object.entries(WORD_NUMS)) {
    const rx = new RegExp(`\\b${w}\\b`, 'gi');
    text = text.replace(rx, String(n));
  }

  const now = Date.now();

  // 1. Relative minutes: e.g. "5 minutes", "for 5 mins", "in 10 min", "5 min"
  const minMatch = text.match(/\b(\d+)\s*(?:minutes|minute|mins|min)\b/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    if (mins > 0 && mins < 1440) {
      return {
        ms: mins * 60 * 1000,
        label: `${mins} minute${mins === 1 ? '' : 's'}`,
        speech: `Snoozed for ${mins} minute${mins === 1 ? '' : 's'}.`
      };
    }
  }

  // 2. Relative hours: e.g. "1 hour", "2 hours", "in 1 hr"
  const hrMatch = text.match(/\b(\d+)\s*(?:hours|hour|hrs|hr)\b/i);
  if (hrMatch) {
    const hrs = parseInt(hrMatch[1], 10);
    if (hrs > 0 && hrs < 24) {
      return {
        ms: hrs * 60 * 60 * 1000,
        label: `${hrs} hour${hrs === 1 ? '' : 's'}`,
        speech: `Snoozed for ${hrs} hour${hrs === 1 ? '' : 's'}.`
      };
    }
  }

  // 3. Specific clock time: e.g. "at 4pm", "until 5:30 pm", "at 16:00"
  const clockMatch = text.match(/\b(?:at|until)\s+([0-1]?[0-9]|2[0-3])(?::([0-5][0-9]))?\s*(am|pm)?\b/i);
  if (clockMatch) {
    let hours = parseInt(clockMatch[1], 10);
    const mins = parseInt(clockMatch[2] || '0', 10);
    const ampm = (clockMatch[3] || '').toLowerCase();
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    const target = new Date(now);
    target.setHours(hours, mins, 0, 0);
    if (target.getTime() <= now) {
      if (!ampm && hours < 12 && target.getTime() + 12 * 3600000 > now) {
        target.setHours(hours + 12);
      } else {
        target.setDate(target.getDate() + 1);
      }
    }
    const diffMs = target.getTime() - now;
    if (diffMs > 0) {
      const timeStr = fmtTime(target.getTime());
      return {
        ms: diffMs,
        label: `until ${timeStr}`,
        speech: `Snoozed until ${timeStr}.`
      };
    }
  }

  // 4. Default plain snooze if no time detected
  return {
    ms: 10 * 60 * 1000,
    label: '10 minutes',
    speech: 'Snoozed for 10 minutes.'
  };
}

let activeVoiceRec = null;
let activePluginListening = false;

function handleVoiceActionCommand(text, r) {
  if (!text) return;
  const t = text.toLowerCase().trim();
  
  if (/\b(done|finish|finished|completed|check|did it|got it|listo|hecho|terminado|fait|terminé|erledigt|fertig|feito|pronto)\b/.test(t)) {
    stopActiveVoiceListener();
    completeReminder(r.id);
    speech.say(`Checked off hands-free. Great work!`, true);
  } else if (/\b(not today|skip|cancel|hoy no|saltar|cancelar|pas aujourd'hui|ignorer|annuler|nicht heute|überspringen|abbrechen|hoje n[aã]o|pular)\b/.test(t)) {
    stopActiveVoiceListener();
    notToday(r.id);
    speech.say(`Moved to tomorrow.`, true);
  } else {
    const snoozeCmd = parseSnoozeCommand(t);
    if (snoozeCmd) {
      stopActiveVoiceListener();
      snoozeReminder(r.id, snoozeCmd.ms, snoozeCmd.label);
      speech.say(snoozeCmd.speech, true);
    }
  }
}

function startActiveVoiceListener(r) {
  stopActiveVoiceListener();

  // Try Capacitor native SpeechRecognition plugin first (Android native)
  const SRPlugin = window.Capacitor?.Plugins?.SpeechRecognition;
  if (SRPlugin && typeof SRPlugin.start === 'function') {
    activePluginListening = true;
    const startNativePlugin = () => {
      if (!activePluginListening) return;
      try {
        SRPlugin.start({
          language: LANG_BCP[state.settings.lang] || 'en-US',
          maxResults: 3,
          prompt: 'Say Done, Snooze, or Not today',
          partialResults: true,
          popup: false,
        }).catch(() => {});

        SRPlugin.removeAllListeners?.();
        SRPlugin.addListener?.('partialResults', data => {
          if (!activePluginListening) return;
          if (data && data.matches && data.matches.length) {
            handleVoiceActionCommand(data.matches[0], r);
          }
        });
      } catch (e) {}
    };

    if (typeof SRPlugin.hasPermission === 'function') {
      SRPlugin.hasPermission().then(res => {
        if (!res.permission && typeof SRPlugin.requestPermission === 'function') {
          SRPlugin.requestPermission().then(req => {
            if (req.permission) startNativePlugin();
          }).catch(() => {});
        } else {
          startNativePlugin();
        }
      }).catch(() => startNativePlugin());
    } else {
      startNativePlugin();
    }
    return;
  }

  // Fallback to Web Speech API
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  try {
    const rec = new SR();
    activeVoiceRec = rec;
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = LANG_BCP[state.settings.lang] || 'en-US';

    rec.onresult = e => {
      const last = e.results[e.results.length - 1];
      if (!last || !last[0]) return;
      const text = (last[0].transcript || '').toLowerCase().trim();
      handleVoiceActionCommand(text, r);
    };
    rec.onerror = () => { stopActiveVoiceListener(); };
    rec.onend = () => {
      if (active && active.id === r.id) {
        try { rec.start(); } catch (e) {}
      }
    };
    rec.start();
  } catch (e) {}
}

function stopActiveVoiceListener() {
  activePluginListening = false;
  const SRPlugin = window.Capacitor?.Plugins?.SpeechRecognition;
  if (SRPlugin) {
    try {
      if (typeof SRPlugin.stop === 'function') SRPlugin.stop().catch(() => {});
      SRPlugin.removeAllListeners?.();
    } catch (e) {}
  }
  if (activeVoiceRec) {
    try { activeVoiceRec.onend = null; activeVoiceRec.stop(); } catch (e) {}
    activeVoiceRec = null;
  }
}

function snoozeReminder(id, ms = 10 * 6e4, label = null) {
  const r = find(id);
  if (!r) return;
  stopActiveVoiceListener();
  stopVoiceClip();
  const now = Date.now();
  r.snoozeUntil = now + ms;
  r.status = 'snoozed';
  log(r, 'snoozed');
  if (active) { active = null; state.activeId = null; }
  save();
  resetTo('home');
  const toastText = label ? `Snoozed ${label.startsWith('until') ? label : 'for ' + label}.`
    : `Snoozed for ${Math.round(ms / 6e4)} minutes.`;
  toast(toastText);
}

function notToday(id) {
  const r = find(id);
  stopActiveVoiceListener();
  stopVoiceClip();
  if (r) { r.status = 'missed'; log(r, 'missed'); }
  if (active) { active = null; state.activeId = null; }
  save();
  resetTo('home');
  toast("Okay. It'll stay put for another day.");
}

/* ============================================================
   NATURAL LANGUAGE SCHEDULE PARSER & TASK PROMPT CLEANER
   ============================================================ */
function cleanTaskPrompt(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim();

  // Command & prompt prefixes to strip across 5 languages
  const prefixRegexes = [
    // English
    /^(?:please\s+)?(?:remind\s+me\s+(?:to\s+)?|remember\s+to\s+|don'?t\s+forget\s+to\s+|i\s+need\s+to\s+|i\s+have\s+to\s+|i\s+want\s+to\s+|note\s+to\s+self\s*:?\s*|make\s+sure\s+to\s+)/i,
    // Spanish
    /^(?:por\s+favor\s+)?(?:recu[eé]rdame\s+(?:que\s+|de\s+|a\s+)?|recuerdame\s+(?:que\s+|de\s+|a\s+)?|acu[eé]rdate\s+de\s+|no\s+olvidar\s+|tengo\s+que\s+|debo\s+|quiero\s+|nota\s*:?\s*)/i,
    // French
    /^(?:s'il\s+te\s+pla[îi]t\s+)?(?:rappelle[ -]moi\s+(?:de\s+|d'|que\s+)?|penser?\s+[aà]\s+|ne\s+pas\s+oublier\s+de\s+|je\s+dois\s+|je\s+veux\s+|note\s*:?\s*)/i,
    // German
    /^(?:bitte\s+)?(?:erinnere?\s+mich\s+(?:daran\s*,?\s*(?:zu\s+|dass\s+)?|an\s+|dass\s+)?|nicht\s+vergessen\s*,?\s*(?:zu\s+)?|ich\s+muss\s+|ich\s+m[oö]chte\s+|notiz\s*:?\s*)/i,
    // Portuguese
    /^(?:por\s+favor\s+)?(?:lembre[ -]me\s+(?:de\s+|que\s+)?|lembra[ -]me\s+(?:de\s+|que\s+)?|n[aã]o\s+esquecer\s+de\s+|tenho\s+que\s+|preciso\s+|nota\s*:?\s*)/i
  ];

  for (const rx of prefixRegexes) {
    s = s.replace(rx, '').trim();
  }

  // Remove trailing dangling connectors
  s = s.replace(/\b(?:at|on|for|in|by|to|every|a|al|à|de|del|en|para|um|am|zu|daran|por|em|no|na)$/i, '').trim();
  s = s.replace(/[,;:\-\s]+$/, '').trim();

  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseNaturalSchedule(raw, lang = (state.settings?.lang || 'en')) {
  if (!raw || typeof raw !== 'string' || raw.trim().length < 3) return null;
  let cleanTask = cleanTaskPrompt(raw);
  const s = raw.toLowerCase().trim();

  let whenDay = null;
  let pickedWhenISO = null;
  let pickedAlert = null;
  let repeat = null;
  let alert = null;
  let detected = false;

  // 1. Tomorrow / Today across 5 languages
  const tomorrowRx = /(?:^|\s)(?:tomorrow|mañana|manana|demain|morgen|amanhã|amanha)(?=\s|$|[.,!?;])/i;
  const todayRx = /(?:^|\s)(?:today|tonight|hoy|esta\s+noche|aujourd'?hui|ce\s+soir|heute|heute\s+abend|hoje|hoje\s+[aà]\s+noite)(?=\s|$|[.,!?;])/i;

  const mTomorrow = s.match(tomorrowRx);
  if (mTomorrow) {
    whenDay = 'Tomorrow';
    detected = true;
    cleanTask = cleanTask.replace(new RegExp(mTomorrow[0].trim(), 'i'), '').trim();
  } else {
    const mToday = s.match(todayRx);
    if (mToday) {
      whenDay = 'Today';
      detected = true;
      cleanTask = cleanTask.replace(new RegExp(mToday[0].trim(), 'i'), '').trim();
    }
  }

  // 2. Days of week across 5 languages
  const daysMap = [
    { idx: 0, rx: /\b(?:this\s+|next\s+|on\s+|el\s+|ce\s+|am\s+|n[aä]chsten\s+|no\s+)?(?:sunday|domingo|dimanche|sonntag)\b/i },
    { idx: 1, rx: /\b(?:this\s+|next\s+|on\s+|el\s+|ce\s+|am\s+|n[aä]chsten\s+|na\s+)?(?:monday|lunes|lundi|montag|segunda(?:-feira)?)\b/i },
    { idx: 2, rx: /\b(?:this\s+|next\s+|on\s+|el\s+|ce\s+|am\s+|n[aä]chsten\s+|na\s+)?(?:tuesday|martes|mardi|dienstag|ter[çc]a(?:-feira)?)\b/i },
    { idx: 3, rx: /\b(?:this\s+|next\s+|on\s+|el\s+|ce\s+|am\s+|n[aä]chsten\s+|na\s+)?(?:wednesday|mi[eé]rcoles|mercredi|mittwoch|quarta(?:-feira)?)\b/i },
    { idx: 4, rx: /\b(?:this\s+|next\s+|on\s+|el\s+|ce\s+|am\s+|n[aä]chsten\s+|na\s+)?(?:thursday|jueves|jeudi|donnerstag|quinta(?:-feira)?)\b/i },
    { idx: 5, rx: /\b(?:this\s+|next\s+|on\s+|el\s+|ce\s+|am\s+|n[aä]chsten\s+|na\s+)?(?:friday|viernes|vendredi|freitag|sexta(?:-feira)?)\b/i },
    { idx: 6, rx: /\b(?:this\s+|next\s+|on\s+|el\s+|ce\s+|am\s+|n[aä]chsten\s+|no\s+)?(?:saturday|s[aá]bado|samedi|samstag)\b/i }
  ];

  for (const { idx, rx } of daysMap) {
    if (rx.test(s)) {
      whenDay = 'Pick';
      const d = new Date();
      let diff = (idx - d.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
      d.setHours(9, 0, 0, 0);
      pickedWhenISO = d.getTime();
      detected = true;
      cleanTask = cleanTask.replace(rx, '').trim();
      break;
    }
  }

  // 3. Time: 12-hour or 24-hour across EN, ES, FR, DE, PT
  const timeRegexes = [
    /(?:^|\s)(?:at\s+|a\s+las\s+|[aà]s\s+)?([0-1]?[0-9]|2[0-3])(?::([0-5][0-9]))?\s*(am|pm)\b/i,
    /(?:^|\s)(?:at\s+|a\s+las\s+|[aà]\s+|[aà]s\s+|um\s+)?([0-1]?[0-9]|2[0-3])(?:[:h]([0-5][0-9]))\s*(?:uhr)?\b/i,
    /(?:^|\s)(?:[aà]\s+|[aà]s\s+|um\s+|a\s+las\s+)([0-1]?[0-9]|2[0-3])\s*(?:h|uhr)?\b/i
  ];

  for (const rx of timeRegexes) {
    const m = s.match(rx);
    if (m) {
      let hours = parseInt(m[1], 10);
      const mins = parseInt(m[2] || '0', 10);
      const ampm = (m[3] || '').toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      const targetDate = pickedWhenISO ? new Date(pickedWhenISO) : (whenDay === 'Tomorrow' ? new Date(Date.now() + DAY_MS) : new Date());
      targetDate.setHours(hours, mins, 0, 0);
      if (!whenDay && targetDate.getTime() < Date.now()) {
        targetDate.setTime(targetDate.getTime() + DAY_MS);
        whenDay = 'Tomorrow';
      } else if (!whenDay) {
        whenDay = 'Today';
      }
      pickedAlert = targetDate.getTime();
      alert = 'Pick a time';
      detected = true;
      const matchedText = m[0].trim();
      cleanTask = cleanTask.replace(new RegExp(matchedText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i'), '').trim();
      break;
    }
  }

  // 4. Relative time: "in X minutes" / "in X hours" across languages
  const relMinRx = /\b(?:in|en|dans|em)\s+(\d+)\s*(?:mins|min|minutes|minutos|minuten)\b/i;
  const relMinMatch = s.match(relMinRx);
  if (relMinMatch) {
    const mins = parseInt(relMinMatch[1], 10);
    if (mins === 30) alert = 'In 30 minutes';
    else if (mins === 60) alert = 'In 1 hour';
    else {
      pickedAlert = Date.now() + mins * 6e4;
      alert = 'Pick a time';
    }
    whenDay = 'Today';
    detected = true;
    cleanTask = cleanTask.replace(relMinMatch[0], '').trim();
  }

  const relHrRx = /\b(?:in|en|dans|em)\s+(\d+)\s*(?:hours|hour|hrs|hr|horas|heures|stunden)\b/i;
  const relHrMatch = s.match(relHrRx);
  if (relHrMatch) {
    const hrs = parseInt(relHrMatch[1], 10);
    if (hrs === 1) alert = 'In 1 hour';
    else {
      pickedAlert = Date.now() + hrs * 36e5;
      alert = 'Pick a time';
    }
    whenDay = 'Today';
    detected = true;
    cleanTask = cleanTask.replace(relHrMatch[0], '').trim();
  }

  // 5. Repeat across languages
  const dailyRx = /\b(?:every\s+day|daily|todos\s+los\s+d[ií]as|cada\s+d[ií]a|diariamente|tous\s+les\s+jours|chaque\s+jour|jeden\s+tag|t[aä]glich|todos\s+os\s+dias)\b/i;
  const weeklyRx = /\b(?:every\s+week|weekly|todas\s+las\s+semanas|cada\s+semana|semanalmente|toutes\s+les\s+semaines|chaque\s+semaine|jede\s+woche|w[oö]chentlich|todas\s+as\s+semanas)\b/i;
  const monthlyRx = /\b(?:every\s+month|monthly|todos\s+los\s+meses|cada\s+mes|mensualmente|tous\s+les\s+mois|chaque\s+mois|jeden\s+monat|monatlich|todo\s+m[eê]s|mensalmente)\b/i;

  if (dailyRx.test(s)) {
    repeat = 'Daily';
    detected = true;
    cleanTask = cleanTask.replace(dailyRx, '').trim();
  } else if (weeklyRx.test(s)) {
    repeat = 'Weekly';
    detected = true;
    cleanTask = cleanTask.replace(weeklyRx, '').trim();
  } else if (monthlyRx.test(s)) {
    repeat = 'Monthly';
    detected = true;
    cleanTask = cleanTask.replace(monthlyRx, '').trim();
  }

  cleanTask = cleanTask.replace(/\s{2,}/g, ' ').trim();
  cleanTask = cleanTaskPrompt(cleanTask);

  if (!detected) return null;

  let summary = '';
  if (pickedWhenISO) {
    const dName = new Date(pickedWhenISO).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    summary += dName;
  } else if (whenDay) {
    summary += whenDay === 'Tomorrow' ? (T('tomorrow') || 'Tomorrow') : (T('today') || 'Today');
  }
  if (pickedAlert) {
    summary += (summary ? ' · ' : '') + fmtTime(pickedAlert);
  } else if (alert) {
    const alertLabel = alert === 'In 1 hour' ? T('in1Hour') : alert === 'In 30 minutes' ? T('in30Min') : alert;
    summary += (summary ? ' · ' : '') + alertLabel;
  }
  if (repeat) {
    const repLabel = repeat === 'Daily' ? T('daily') : repeat === 'Weekly' ? T('weekly') : repeat === 'Monthly' ? T('monthly') : repeat;
    summary += (summary ? ' · ' : '') + repLabel;
  }

  return { cleanTask: cleanTask || raw, whenDay, alert, pickedWhenISO, pickedAlert, repeat, summary };
}

let nlpSuggestion = null;
function applyNlpSchedule(parsed) {
  if (!parsed) return;
  creating.task = parsed.cleanTask;
  const inp = $('#taskInput');
  if (inp) inp.value = parsed.cleanTask;
  if (parsed.whenDay) creating.whenDay = parsed.whenDay;
  if (parsed.pickedWhenISO) {
    creating.whenDay = 'Pick';
    creating.pickedWhenISO = parsed.pickedWhenISO;
    creating.pickedWhen = new Date(parsed.pickedWhenISO).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (parsed.pickedAlert != null) {
    creating.alert = 'Pick a time';
    creating.pickedAlert = parsed.pickedAlert;
  } else if (parsed.alert) {
    creating.alert = parsed.alert;
  }
  if (parsed.repeat) creating.repeat = parsed.repeat;
  nlpSuggestion = null;
  render();
}

let isPlayingWeekReflection = false;

function updateWeekReflectionBtn() {
  const btn = document.querySelector('[data-action="hear-week-reflection"]');
  if (btn) {
    btn.innerHTML = `${isPlayingWeekReflection ? I.pause(16) : I.play(16)}<span>${isPlayingWeekReflection ? T('pauseReflection') : T('hearReflection')}</span>`;
  }
}

function stopWeekReflection() {
  if (!isPlayingWeekReflection) return;
  isPlayingWeekReflection = false;
  speech.stop();
  updateWeekReflectionBtn();
}

function speakWeekReflection() {
  const p = speech.personality();
  const start = weekStart();
  const inWeek = e => e.at >= start && e.at <= Date.now();
  const completed = state.log.filter(e => e.type === 'completed' && inWeek(e)).length;
  const name = state.settings.name || 'friend';
  const countStr = completed === 1 ? T('completedCountSingular', 1) : T('completedCountPlural', completed);
  const summaryMsg = completed === 0
    ? T('completedWeekSummary')
    : T('completedWeekCount', countStr);
  const insight = completed === 0
    ? T('insightEmpty')
    : completed < 5
      ? T('insightFew')
      : T('insightMany');
  const text = `${greeting()}, ${name}. ${summaryMsg} ${insight}`;
  isPlayingWeekReflection = true;
  updateWeekReflectionBtn();
  toast(T('playingReflectionToast', p.name));
  speech.say(text, true, () => {
    isPlayingWeekReflection = false;
    updateWeekReflectionBtn();
  });
}

function toggleWeekReflection() {
  if (isPlayingWeekReflection) {
    stopWeekReflection();
    toast(T('reflectionPausedToast'));
  } else {
    speakWeekReflection();
  }
}

/* ---------- engine ---------- */
let active = null;                    // reminder currently on screen
const GRACE_MS = 20 * 6e4;            // 20 min after alert time → missed

function tick() {
  if (active) return;
  const now = Date.now();
  let dirty = false;
  for (const r of state.reminders) {
    if (r.status !== 'upcoming' && r.status !== 'snoozed') continue;
    const due = r.status === 'snoozed' ? (r.snoozeUntil || r.when) : r.when;
    if (now >= due + GRACE_MS) { r.status = 'missed'; log(r, 'missed'); dirty = true; }
    else if (now >= due) { notifyIfNeeded(r); state.activeId = r.id; active = r; openActive(r); dirty = true; break; }
  }
  if (dirty) { save(); if (!active) render(); }
}
setInterval(tick, 10 * 1000);
function log(r, type, at = Date.now()) { state.log.push({ type, task: r.task, at, hour: new Date(at).getHours() }); }

function nextWhen(when, repeat, from = when) {
  if (repeat === 'Daily') return from + DAY_MS;
  if (repeat === 'Weekly') return from + 7 * DAY_MS;
  if (repeat === 'Monthly') { const d = new Date(from); d.setMonth(d.getMonth() + 1); return d.getTime(); }
  if (repeat === 'Yearly') { const d = new Date(from); d.setFullYear(d.getFullYear() + 1); return d.getTime(); }
  if (repeat && typeof repeat === 'object' && repeat.days && repeat.days.length) {
    for (let i = 1; i <= 14; i++) {
      const t = from + i * DAY_MS;
      if (repeat.days.includes(new Date(t).getDay())) return t;
    }
  }
  return null;
}

/* ---------- navigation ---------- */
const screensEl = $('#screens');
let navStack = [{ name: 'home', data: {} }];

/* the browser history mirrors the screen stack, so the Android back button and
   the browser back gesture walk the app instead of leaving it. every entry
   records its own stack depth, so any traversal can put the app back in step. */
try { history.replaceState({ d: 0 }, ''); } catch (e) {}
const histD = () => (history.state && typeof history.state.d === 'number' ? history.state.d : 0);

function pushHist() {
  try { history.pushState({ d: navStack.length - 1 }, ''); } catch (e) {}
}
/* collapse every entry the app pushed, back to the root entry */
function historyRoot() {
  const d = histD();
  if (d > 0) { try { history.go(-d); } catch (e) {} }
}

let lastNavAt = 0, lastBackAt = 0;
function go(name, data = {}, dir = 'push') {
  const t = Date.now();
  /* a double-tap on the same target must not stack two identical screens */
  if (t - lastNavAt < 320 && navStack[navStack.length - 1].name === name) return;
  lastNavAt = t;
  navStack.push({ name, data });
  render(dir);
  pushHist();
}
function backTo(name) {
  const before = navStack.length;
  while (navStack.length > 1 && navStack[navStack.length - 1].name !== name) navStack.pop();
  if (navStack.length > 1) navStack.pop();
  else navStack = [{ name: 'home', data: {} }];
  render('back');
  stepHist(before - navStack.length);
}
/* only ever walk back over entries this app pushed; if they are used up,
   relabel the current entry so the browser stays in step */
function stepHist(steps) {
  const n = Math.min(steps, histD());
  if (n > 0) { try { history.go(-n); } catch (e) {} return; }
  try { history.replaceState({ d: navStack.length - 1 }, ''); } catch (e) {}
}
function back() {
  const t = Date.now();
  if (navStack.length <= 1 || t - lastBackAt < 320) return;
  lastBackAt = t;
  navStack.pop();
  render('back');
  stepHist(1);
}
function resetTo(name, data = {}) {
  navStack = [{ name, data }];
  render('back');
  historyRoot();
}

/* ============================================================
   SCREEN: HOME
   ============================================================ */
function screenHome() {
  const now = Date.now();
  const st = state.settings;
  const langBcp = LANG_BCP[st.lang || 'en'] || undefined;
  if (!state.reminders.length) {
    return { label: 'home', html: `
      <div class="screen is-empty" data-screen="home">
        <div class="app-header">
          <span class="wordmark">Recall</span>
        </div>
        <div class="screen-scroll is-empty" style="padding-bottom:116px;">
          <div class="greeting" style="margin-top:6px;">${greeting()}, ${esc(st.name)}</div>
          <div class="date-line">${new Date(now).toLocaleDateString(langBcp, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <div class="empty-state">
            <span class="empty-ic">${IL.zenBell}</span>
            <div class="big">${T('emptyTitle')}</div>
            <div class="small">${T('emptySub')}</div>
            <button class="btn primary empty-btn" data-action="go-new">${IL.plus(16)}<span>${T('addReminder')}</span></button>
          </div>
        </div>
      </div>` };
  }

  const upcoming = state.reminders.filter(r => r.status === 'upcoming' || r.status === 'snoozed' || r.status === 'missed')
    .sort((a, b) => (a.status === 'missed' ? 0 : 1) - (b.status === 'missed' ? 0 : 1) || a.when - b.when);
  const completed = state.reminders.filter(r => r.status === 'completed');

  const alertLabels = { 'In 1 hour': T('in1Hour'), 'In 30 minutes': T('in30Min'), 'Pick a time': T('pickTime'), 'At the time': T('atTheTime') };
  const row = r => {
    const isMissed = r.status === 'missed', isDone = r.status === 'completed';
    const sub = isMissed ? T('missedTap')
      : r.status === 'snoozed' ? `${T('snoozed')} · ${fmtTime(r.snoozeUntil || r.when)}`
      : (alertLabels[r.remindLabel] || r.remindLabel);
    const vnBadge = r.voiceClip ? `<span style="color:var(--accent);margin-left:5px;vertical-align:middle;display:inline-flex;" title="Personal voice note">${I.heart(12)}</span>` : '';
    return `
      <div class="reminder-row ${r.status === 'upcoming' || r.status === 'snoozed' ? 'pending' : ''}" data-action="open-details" data-id="${r.id}" role="button">
        <span class="time">${fmtTime(r.when)}</span>
        <span class="main"><span class="task">${esc(r.task)}${vnBadge}</span><span class="sub">${esc(sub)}</span></span>
        <button class="check-btn ${isDone ? 'done' : ''}" data-action="${isDone ? 'open-details' : 'quick-done'}" data-id="${r.id}" aria-label="${isDone ? 'View' : 'Mark done'}" ${isDone ? `style="color:var(--ink-60);border-color:var(--ink-60);"` : ''}>${isDone ? I.check(13) : ''}</button>
      </div>`;
  };

  return { label: 'home', html: `
    <div class="screen" data-screen="home">
      <div class="app-header"><span class="wordmark">Recall</span></div>
      <div class="screen-scroll" style="padding-bottom:110px;">
        <div class="greeting" style="margin-top:6px;">${greeting()}, ${esc(st.name)}</div>
        <div class="date-line">${new Date(now).toLocaleDateString(langBcp, { weekday: 'long', month: 'long', day: 'numeric' })}</div>

        <div class="week-card mt-32" data-action="go-week" role="button">
          <span><h3>${T('thisWeek')}</h3><p>${T('seeHowWent')}</p></span>
          <span class="view-pill">${T('view')} ${I.arrow(15)}</span>
        </div>

        <div class="stack mt-32">
          <div class="section-title">${T('upcoming')}</div>
          ${upcoming.length ? upcoming.map(row).join('') : `<div class="assistant-msg">${T('allCaughtUp')}</div>`}
        </div>
        <div class="stack mt-32">
          <div class="section-title">${T('completed')}</div>
          ${completed.length ? completed.map(row).join('') : `<div class="assistant-msg" style="color:var(--ink-40);">${T('nothingCompleted')}</div>`}
        </div>
      </div>
      <button class="fab" data-action="go-new" aria-label="${T('addReminder')}">${IL.plus(22)}</button>
    </div>` };
}

/* ============================================================
   SCREEN: FOCUS (dedicated page)
   ============================================================ */
function screenFocus() {
  const currentSound = focusEngine.activeType || 'brown';
  const currentDuration = Math.round(focusEngine.initialSec / 60) || 15;
  const isRunning = focusEngine.state === 'running';
  const isPaused = focusEngine.state === 'paused';

  const sounds = [
    { id: 'brown', label: T('soundBrownNoise'), desc: T('soundBrownNoiseDesc') },
    { id: 'rain', label: T('soundSoftRain'), desc: T('soundSoftRainDesc') },
    { id: 'lofi', label: T('soundLoFi'), desc: T('soundLoFiDesc') },
    { id: 'stream', label: T('soundStream'), desc: T('soundStreamDesc') },
    { id: 'mute', label: T('soundSilent'), desc: T('soundSilentDesc') },
  ];
  const soundChip = (id, label) => `<button class="chip ${currentSound === id ? 'selected' : ''}" data-action="pick-soundscape" data-sound="${id}">${label}</button>`;
  const durationChip = mins => `<button class="chip ${currentDuration === mins ? 'selected' : ''}" data-action="pick-focus-duration" data-min="${mins}">${mins} ${T('minutes')}</button>`;

  const activeSoundObj = sounds.find(s => s.id === currentSound) || sounds[0];
  const statusLabel = isRunning ? `${T('inSession')} · ${activeSoundObj.label}`
    : isPaused ? T('focusPaused')
    : T('readyToFocus');

  return { label: 'focus', html: `
    <div class="screen" data-screen="focus">
      <div class="app-header">
        <span class="screen-title">${T('focusMode')}</span>
      </div>
      <div class="screen-scroll" style="padding-bottom:116px;">
        <div style="text-align:center;padding:14px 0 10px;">
          ${isRunning ? `
            <div class="focus-timer-display" id="focusPageTime" style="margin:0 auto;font-size:52px;font-weight:700;letter-spacing:-1px;font-variant-numeric:tabular-nums;color:var(--ink);">${focusEngine.fmt(focusEngine.timerSec)}</div>
          ` : `
            <input type="text"
                   id="focusPageTimeInput"
                   class="focus-timer-input"
                   value="${focusEngine.fmt(focusEngine.timerSec)}"
                   aria-label="${T('focusDuration')}"
                   title="Click to type duration"
                   autocomplete="off"
                   spellcheck="false" />
            <div style="font-size:12px;color:var(--ink-40);display:flex;align-items:center;justify-content:center;gap:4px;margin-top:2px;">
              ${I.edit(12)}<span>${T('tapTimeToEdit')}</span>
            </div>
          `}
          <div style="font-size:14px;color:${isRunning ? 'var(--accent)' : isPaused ? '#FBBF24' : 'var(--ink-50)'};font-weight:600;margin-top:6px;">
            ${statusLabel}
          </div>
        </div>

        <div class="field-group" style="margin-top:20px;">
          <div class="field-label">${T('focusDuration')}</div>
          <div class="chip-row tight" style="margin-top:12px;">
            ${durationChip(15)}${durationChip(25)}${durationChip(45)}
          </div>
          <div class="chip-row tight" style="margin-top:8px;">
            ${durationChip(60)}${durationChip(90)}
          </div>
        </div>

        <div class="field-group">
          <div class="field-label">${T('ambientSoundscape')}</div>
          <div class="chip-row tight" style="margin-top:12px;">
            ${soundChip('brown', T('soundBrownNoise'))}${soundChip('rain', T('soundSoftRain'))}${soundChip('lofi', T('soundLoFi'))}
          </div>
          <div class="chip-row tight" style="margin-top:8px;">
            ${soundChip('stream', T('soundStream'))}${soundChip('mute', T('soundSilent'))}
          </div>
          <div class="field-label" style="margin-top:12px;color:var(--ink-40);font-size:13px;line-height:1.4;">${activeSoundObj.desc}</div>
        </div>

        <div class="field-group" style="margin-top:20px;">
          <div class="anti-guilt-card" style="margin-top:0;">
            <strong>${T('focusMindfulTitle')}</strong><br>
            ${T('focusMindfulDesc')}
          </div>
        </div>

        <div style="margin-top:24px;">
          ${isRunning ? `
            <div style="display:flex;gap:10px;">
              <button class="btn ghost" style="flex:1;height:52px;font-size:15px;display:flex;align-items:center;justify-content:center;" data-action="focus-stop">${T('endFocusSession')}</button>
              <button class="btn primary" style="flex:1;height:52px;font-size:15px;display:flex;align-items:center;justify-content:center;gap:6px;" data-action="focus-pause">${I.pause(16)} <span>${T('pause')}</span></button>
            </div>
          ` : isPaused ? `
            <div style="display:flex;gap:10px;">
              <button class="btn ghost" style="flex:1;height:52px;font-size:15px;display:flex;align-items:center;justify-content:center;" data-action="focus-stop">${T('endFocusSession')}</button>
              <button class="btn primary" style="flex:1;height:52px;font-size:15px;display:flex;align-items:center;justify-content:center;gap:6px;" data-action="focus-resume">${I.play(16)} <span>${T('resume')}</span></button>
            </div>
          ` : `
            <button class="btn primary" data-action="focus-start" style="width:100%;height:52px;font-size:16px;">${T('startFocusSession')}</button>
          `}
        </div>
      </div>
    </div>` };
}

/* ============================================================
   SCREEN: NEW REMINDER (+ edit mode)
   ============================================================ */
let creating = { task: '', whenDay: 'Today', alert: 'In 30 minutes', pickedWhen: null, pickedWhenISO: null, pickedAlert: null, repeat: 'Never', customDays: [], editId: null, voiceClip: null };

function screenCreate() {
  const c = creating;
  const whenLabels = { 'Today': T('today'), 'Tomorrow': T('tomorrow'), 'Pick': T('pickDate') };
  const whenChip = (id, label) => `<button class="chip ${c.whenDay === id ? 'selected' : ''}" data-action="pick-when" data-val="${id}">${whenLabels[id] || label || id}</button>`;
  const alertLabels = { 'In 1 hour': T('in1Hour'), 'In 30 minutes': T('in30Min'), 'Pick a time': T('pickTime'), 'At the time': T('atTheTime') };
  const alertChip = (id) => `<button class="chip ${c.alert === id ? 'selected' : ''}" data-action="pick-alert" data-val="${id}">${alertLabels[id] || id}</button>`;
  const isCustomRepeat = typeof c.repeat === 'object' || c.repeat === 'Custom' || c.repeat === 'Customize';
  const repLabels = { 'Never': T('never'), 'Daily': T('daily'), 'Weekly': T('weekly'), 'Monthly': T('monthly'), 'Yearly': T('yearly'), 'Custom': T('custom') };
  const repChip = (id, label = id) => {
    const isSelected = (id === 'Custom' || id === 'Customize') ? isCustomRepeat : (c.repeat === id);
    return `<button class="chip ${isSelected ? 'selected' : ''}" data-action="pick-repeat" data-val="${id}">${repLabels[id] || label}</button>`;
  };
  const previewTime = previewWhenTime();

  let vnHTML = '';
  if (voiceNoteRecorder.recording) {
    vnHTML = `
      <div class="voice-note-card">
        <span class="vn-record-btn recording" data-action="stop-recording-vn">${I.mic(16)} <span>${T('recordingTapStop')} 0:${String(recordTimerSec).padStart(2, '0')} · ${T('tapToStop')}</span></span>
      </div>`;
  } else if (c.voiceClip) {
    vnHTML = `
      <div class="voice-note-card">
        <div class="vn-player">
          <button class="vn-play-btn" data-action="preview-voice-note" aria-label="${T('playVoiceNote')}">${currentVoiceNoteAudio ? I.stop(14) : I.play(14)}</button>
          <div><div class="vn-label">${I.heart(13)}<span>${T('personalVoiceNote')}</span></div><div class="vn-meta">${c.voiceClip.duration}${T('recordingAttached')}</div></div>
        </div>
        <button class="vn-del-btn" data-action="delete-voice-note" aria-label="Delete voice note">${I.trash(15)}</button>
      </div>`;
  } else {
    vnHTML = `
      <div style="margin-top:10px;">
        <button class="chip" data-action="start-recording-vn" style="font-size:12.5px;padding:7px 14px;border-radius:20px;display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line-soft);">
          ${I.heart(14)} <span>${T('attachVoiceNote')}</span>
        </button>
      </div>`;
  }

  return { label: 'create', html: `
    <div class="screen" data-screen="create">
      <div class="app-header">
        <button class="round-btn" data-action="back" aria-label="Back">${I.back(18)}</button>
        <span class="screen-title">${c.editId ? T('editReminder') : T('newReminder')}</span>
        <span class="header-spacer" style="background:none;border:none;"></span>
      </div>
      <div class="screen-scroll" style="padding-bottom:40px;">
        <div class="field-group" style="margin-top:8px;">
          <div class="field-label">${T('whatToRemember')}</div>
          <div class="input-wrap" style="margin-top:12px;">
            <input class="text-input mt-24-input" id="taskInput" style="margin-top:0;padding-right:52px;" placeholder="${T('placeholderTask')}" value="${esc(c.task)}" data-action-input="task" enterkeyhint="done" autocapitalize="sentences" autocomplete="off">
            <button class="mic-btn" data-action="start-dictation" aria-label="Dictate with voice">${I.mic(18)}</button>
          </div>
          <div id="nlpChipWrap">${nlpSuggestion ? `<div class="nlp-suggestion-chip" data-action="apply-nlp">${I.sparkle(13)}<span>${T('detected') || 'Detected'}: <strong>${esc(nlpSuggestion.summary)}</strong> · ${T('tapToApply') || 'Tap to apply'}</span></div>` : ''}</div>
          ${vnHTML}
        </div>
        <div class="field-group">
          <div class="field-label">${T('startsWhen')}</div>
          <div class="chip-row tight" style="margin-top:12px;">
            ${whenChip('Today', 'Today')}${whenChip('Tomorrow', 'Tomorrow')}${whenChip('Pick', 'Pick a date')}
          </div>
          ${c.whenDay === 'Pick' && c.pickedWhen ? `<div class="chip-row compact" style="margin-top:10px;"><span class="chip selected" data-action="pick-date-again">${c.pickedWhen}</span></div>` : ''}
          <div class="field-label" style="margin-top:14px;color:var(--ink-40);font-size:13.5px;">${T('reminderFiresAt')} ${esc(previewTime)}</div>
        </div>
        <div class="field-group">
          <div class="field-label">${T('remindMe')}</div>
          <div class="chip-row tight" style="margin-top:12px;">
            ${alertChip('In 1 hour')}${alertChip('In 30 minutes')}${alertChip('Pick a time')}
          </div>
          ${c.alert === 'Pick a time' && c.pickedAlert != null ? `<div class="chip-row compact" style="margin-top:10px;"><span class="chip selected" data-action="pick-time-again">${fmtTime(c.pickedAlert)}</span></div>` : ''}
        </div>
        <div class="field-group">
          <div class="field-label">${T('repeat')}</div>
          <div class="chip-row tight" style="margin-top:12px;">
            ${repChip('Never')}${repChip('Daily')}${repChip('Weekly')}${repChip('Monthly')}
          </div>
          <div class="chip-row tight" style="margin-top:8px;">
            ${repChip('Yearly')}${repChip('Custom')}
          </div>
          ${typeof c.repeat === 'object' ? `<div class="field-label" style="margin-top:12px;color:var(--ink-40);font-size:13.5px;">${T('custom')}: ${c.repeat.days.map(d => fullDayName(d)).join(', ')}</div>` : ''}
        </div>
      </div>
      <div class="action-dock"><button class="btn primary" data-action="save-reminder">${T('saveReminder')}</button></div>
    </div>` };
}

function previewWhenTime() {
  const c = creating;
  if (c.alert === 'Pick a time' && c.pickedAlert != null) {
    if (c.whenDay === 'Pick' && c.pickedWhenISO) return fmtWhen(c.pickedWhenISO);
    const base = c.whenDay === 'Tomorrow' ? Date.now() + DAY_MS : Date.now();
    const d = new Date(c.pickedAlert); const t = new Date(base);
    t.setHours(d.getHours(), d.getMinutes(), 0, 0);
    if (t.getTime() < Date.now() && c.whenDay === 'Today') t.setTime(t.getTime() + (t.getTime() < Date.now() ? DAY_MS : 0));
    return fmtWhen(t.getTime());
  }
  if (c.pickedWhenISO) { // day picked, use default alert offset
    const off = RANGES[c.alert] || 0;
    return fmtWhen(new Date(c.pickedWhenISO).getTime() + off);
  }
  return fmtWhen(Date.now() + (RANGES[c.alert] || 0));
}

function computeWhen() {
  const c = creating;
  if (c.alert === 'Pick a time' && c.pickedAlert != null) {
    if (c.whenDay === 'Pick' && c.pickedWhenISO) return new Date(c.pickedWhenISO).setHours(new Date(c.pickedAlert).getHours(), new Date(c.pickedAlert).getMinutes(), 0, 0);
    const day = c.pickedWhenISO ? new Date(c.pickedWhenISO) : (c.whenDay === 'Tomorrow' ? new Date(Date.now() + DAY_MS) : new Date());
    day.setHours(new Date(c.pickedAlert).getHours(), new Date(c.pickedAlert).getMinutes(), 0, 0);
    if (day.getTime() < Date.now()) day.setTime(day.getTime() + DAY_MS);
    return day.getTime();
  }
  if (c.pickedWhenISO) return new Date(c.pickedWhenISO).getTime() + (RANGES[c.alert] || 0);
  return Date.now() + (RANGES[c.alert] || 0);
}

function saveReminder() {
  if (nlpSuggestion) {
    applyNlpSchedule(nlpSuggestion);
  }
  const rawInput = ($('#taskInput') ? $('#taskInput').value : creating.task).trim();
  let task = rawInput;
  if (!nlpSuggestion && rawInput) {
    const parsed = parseNaturalSchedule(rawInput, state.settings?.lang || 'en');
    if (parsed) {
      applyNlpSchedule(parsed);
      task = parsed.cleanTask;
    }
  }
  task = cleanTaskPrompt(task) || 'Untitled reminder';
  const when = computeWhen();
  const remindLabel = creating.alert === 'Pick a time' ? 'At the time' : creating.alert;
  const repeat = (creating.repeat === 'Custom' || creating.repeat === 'Customize') ? { days: creating.customDays } : creating.repeat;
  const voiceClip = creating.voiceClip || null;
  if (creating.editId) {
    const r = find(creating.editId);
    Object.assign(r, { task, when, remindLabel, repeat, voiceClip, status: 'upcoming' });
    toast('Reminder updated.');
  } else {
    state.reminders.push({ id: uid(), task, when, remindLabel, repeat, voiceClip, status: 'upcoming', created: Date.now() });
    log({ task }, 'created');
    toast('Got it. Reminder set.');
  }
  nlpSuggestion = null;
  save();
  resetTo('home');
}

/* ============================================================
   SCREEN: DETAILS
   ============================================================ */
function screenDetails(id) {
  const r = find(id);
  if (!r) return screenHome();
  const isMissed = r.status === 'missed';
  const repLabels = { 'Never': T('never'), 'Daily': T('daily'), 'Weekly': T('weekly'), 'Monthly': T('monthly'), 'Yearly': T('yearly'), 'Custom': T('custom') };
  const alertLabels = { 'In 1 hour': T('in1Hour'), 'In 30 minutes': T('in30Min'), 'Pick a time': T('pickTime'), 'At the time': T('atTheTime') };
  const rep = typeof r.repeat === 'object' ? `${T('custom')}: ` + r.repeat.days.map(d => fullDayName(d)).join(', ') : (repLabels[r.repeat] || r.repeat || T('never'));
  const alertLabel = alertLabels[r.remindLabel] || r.remindLabel;
  const statusLabel = r.status === 'snoozed' ? T('snoozedSingle') : r.status === 'upcoming' ? T('upcomingSingle') : r.status === 'missed' ? T('missedSingle') : T('completedSingle');
  return { label: 'details', html: `
    <div class="screen" data-screen="details">
      <div class="app-header">
        <button class="round-btn" data-action="back" aria-label="Back">${I.back(18)}</button>
        <span class="screen-title">${T('reminder')}</span>
        <button class="round-btn" data-action="edit-reminder" data-id="${r.id}" aria-label="Edit">${I.edit(18)}</button>
      </div>
      <div class="screen-scroll" style="padding-bottom:40px;">
        <div class="detail-head" style="padding-top:8px;">
          <div class="status-eyebrow">${statusLabel}</div>
          <h1>${esc(r.task)}</h1>
          <div class="when">${I.calendar(16)}<span>${fmtDay(r.when, Date.now())} · ${fmtTime(r.when)}</span></div>
        </div>
        <div class="detail-rows">
          <div class="detail-row"><span class="label">${T('remindMe')}</span><span class="status-pill">${esc(alertLabel)}</span></div>
          <div class="detail-row"><span class="label">${T('repeat')}</span><span class="status-pill">${esc(rep)}</span></div>
          <div class="detail-row"><span class="label">${T('status')}</span><span class="status-pill">${statusLabel}</span></div>
        </div>
        ${r.voiceClip ? `
          <div class="voice-note-card" style="margin-top:14px;">
            <div class="vn-player">
              <button class="vn-play-btn" data-action="preview-voice-note" data-clip="${esc(r.voiceClip.data)}" aria-label="${T('playVoiceNote')}">${currentVoiceNoteAudio ? I.stop(14) : I.play(14)}</button>
              <div><div class="vn-label">${I.heart(13)}<span>${T('personalVoiceNote')}</span></div><div class="vn-meta">${r.voiceClip.duration}${T('recordingAttached')}</div></div>
            </div>
          </div>
        ` : ''}
        <div class="detail-actions">
          <button class="btn primary" data-action="hear-reminder" data-id="${r.id}">${r.voiceClip ? T('playVoiceNote') : T('hearReminder')}</button>
          ${isMissed ? `<button class="btn primary" data-action="remind-again" data-id="${r.id}">${T('remindAgain')}</button>` : ''}
          ${isMissed ? `<div style="display:flex;gap:10px;">
            <button class="btn outline" data-action="not-today" data-id="${r.id}">${T('notToday')}</button>
            <button class="btn primary" data-action="complete" data-id="${r.id}">${T('done')}</button></div>` : ''}
        </div>
        <div style="margin-top:22px;">
          <button class="btn outline" data-action="confirm-delete" data-id="${r.id}" data-btn="delete">${T('deleteReminder')}</button>
        </div>
      </div>
    </div>` };
}

/* ============================================================
   SCREEN: YOUR WEEK
   ============================================================ */
function screenWeek() {
  const start = weekStart();
  const inWeek = e => e.at >= start && e.at <= Date.now();
  const created = state.log.filter(e => e.type === 'created' && inWeek(e)).length;
  const completed = state.log.filter(e => e.type === 'completed' && inWeek(e)).length;
  const snoozed = state.log.filter(e => e.type === 'snoozed' && inWeek(e)).length;
  const missed = state.log.filter(e => e.type === 'missed' && inWeek(e)).length;
  const end = new Date(start + 6 * DAY_MS);
  const morning = state.log.filter(e => e.type === 'completed' && inWeek(e) && e.hour < 12).length;
  const evening = state.log.filter(e => e.type === 'completed' && inWeek(e) && e.hour >= 18).length;
  const insight = completed === 0 ? T('insightEmpty') :
    morning > evening ? T('insightMorning') :
    evening > morning ? T('insightEvening') :
    T('insightEven');

  const langBcp = LANG_BCP[state.settings.lang || 'en'] || undefined;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const completedDays = new Set(
    state.log.filter(e => e.type === 'completed' && inWeek(e)).map(e => (new Date(e.at).getDay() + 6) % 7)
  );
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map(offset => {
    const d = new Date(start + offset * DAY_MS);
    return d.toLocaleDateString(langBcp, { weekday: 'narrow' }).toUpperCase();
  });
  const momentumDots = weekDays.map((label, idx) => {
    const isDone = completedDays.has(idx);
    const isToday = idx === todayIdx;
    return `
      <div class="momentum-col">
        <div class="momentum-dot ${isDone ? 'active' : ''} ${isToday ? 'today' : ''}">
          ${isDone ? I.check(13) : label}
        </div>
        <span class="momentum-day-label">${label}</span>
      </div>`;
  }).join('');

  const summaryMsg = completed
    ? T('completedWeekSummary', completed, created)
    : T('weekSoFarPlanned', created);

  return { label: 'week', html: `
    <div class="screen" data-screen="week">
      <div class="app-header">
        <span class="screen-title">${T('yourWeek')}</span>
      </div>
      <div class="screen-scroll" style="padding-bottom:40px;padding-top:8px;">
        <div class="greeting" style="font-size:24px;">${created} ${T('remindersCount')}</div>
        <div class="date-line">${new Date(start).toLocaleDateString(langBcp, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(langBcp, { month: 'short', day: 'numeric' })}</div>
        <div class="stat-row mt-24">
          <div class="stat-box"><div class="num">${completed}</div><div class="label">${T('completedStat')}</div></div>
          <div class="stat-box"><div class="num">${snoozed}</div><div class="label">${T('snoozedStat')}</div></div>
          <div class="stat-box"><div class="num">${missed}</div><div class="label">${T('missedStat')}</div></div>
        </div>
        <div class="momentum-row">
          ${momentumDots}
        </div>
        <div class="assistant-msg mt-32">
          ${summaryMsg}<br><br>
          ${insight}
        </div>
        <div class="anti-guilt-card">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;font-weight:700;color:var(--ink);">
            <span style="color:var(--accent);display:inline-flex;align-items:center;">${I.sprout(17)}</span>
            <span>${T('mindfulMomentum')}</span>
          </div>
          ${T('mindfulMomentumDesc')}
        </div>
        <button class="btn primary mt-24" data-action="hear-week-reflection" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;">
          ${isPlayingWeekReflection ? I.pause(16) : I.play(16)}<span>${isPlayingWeekReflection ? T('pauseReflection') : T('hearReflection')}</span>
        </button>
      </div>
    </div>` };
}

/* ============================================================
   SCREEN: SETTINGS
   ============================================================ */
function screenSettings() {
  const s = state.settings;
  let banner = '';
  if (!s.notifications && s.seenBanner) {
    banner = `<div class="banner" data-action="go-permissions" role="button" style="cursor:pointer;"><span style="flex-shrink:0;">${I.bell(18)}</span><span>${T('notifOffBanner')}</span></div>`;
  }
  return { label: 'settings', html: `
    <div class="screen" data-screen="settings">
      <div class="app-header">
        <span class="screen-title">${T('settings')}</span>
      </div>
      <div class="screen-scroll" style="padding-bottom:40px;padding-top:8px;">
        ${banner}
        <div class="settings-row" data-action="go-voice" role="button"><span class="label">${T('voice')}</span><span class="row-end"><span class="value">${esc(speech.voiceLabel())}</span>${I.arrow(15)}</span></div>
        <div class="settings-row" data-action="go-theme" role="button"><span class="label">${T('theme')}</span><span class="row-end"><span class="value">${themeLabel(s.theme || 'system')}</span>${I.arrow(15)}</span></div>
        <div class="settings-row" data-action="open-language" role="button"><span class="label">${T('language')}</span><span class="row-end"><span class="value">${LANGUAGES[s.lang || 'en'] || 'English'}</span>${I.arrow(15)}</span></div>
        <div class="settings-row" data-action="go-permissions" role="button"><span class="label">${T('permissions')}</span><span class="row-end"><span class="value">${T('manage')}</span>${I.arrow(15)}</span></div>
        <div class="settings-row" data-action="go-about" role="button"><span class="label">${T('aboutRecall')}</span><span class="row-end"><span class="value">${I.arrow(15)}</span></span></div>
      </div>
    </div>` };
}

/* ============================================================
   THEME GRID (also rendered on the Theme page)
   ============================================================ */
function themeBodyHTML() {
  const cur = state.settings.theme || 'system';
  const card = k => {
    const t = THEMES[k];
    const [ir, ig, ib] = hexToRgb(t.ink);
    const label = themeLabel(k);
    return `<button class="theme-card ${cur === k ? 'selected' : ''}" data-action="pick-theme" data-val="${k}" style="--tc-accent:${t.accent}" aria-label="Theme ${label}">
      <span class="tc-preview" style="background:${t.bg}">
        <span class="tc-bar" style="background:rgba(${ir}, ${ig}, ${ib}, .92)"></span>
        <span class="tc-bar short" style="background:rgba(${ir}, ${ig}, ${ib}, .35)"></span>
        <span class="tc-square" style="background:${t.accent}"></span>
      </span>
      <span class="tc-label">${label}</span>
      ${cur === k ? `<span class="tc-check">${I.check(12)}</span>` : ''}
    </button>`;
  };
  /* Auto (device theme) first, then every theme */
  const autoCard = `<button class="theme-card ${cur === 'system' ? 'selected' : ''}" data-action="pick-theme" data-val="system" aria-label="Theme ${T('autoTheme')}">
    <span class="tc-preview tc-auto">
      <span class="tc-split"></span>
      <span class="tc-strong tc-th">${I.sun(16)}</span>
      <span class="tc-strong tc-mo">${I.moon(16)}</span>
    </span>
    <span class="tc-label">${T('autoTheme')}</span>
    ${cur === 'system' ? `<span class="tc-check">${I.check(12)}</span>` : ''}
  </button>`;
  return `
    <div class="theme-grid">${autoCard}${THEME_ORDER.map(card).join('')}</div>`;
}

/* ============================================================
   SCREEN: THEME (dedicated page)
   ============================================================ */
function screenTheme() {
  return { label: 'theme', html: `
    <div class="screen" data-screen="theme">
      <div class="app-header">
        <button class="round-btn" data-action="back" aria-label="Back">${I.back(18)}</button>
        <span class="screen-title">${T('theme')}</span>
        <span class="header-spacer"></span>
      </div>
      <div class="screen-scroll" style="padding-top:8px;padding-bottom:40px;">${themeBodyHTML()}</div>
    </div>` };
}

/* ============================================================
   SCREEN: VOICE (dedicated page)
   ============================================================ */
function screenVoice() {
  return { label: 'voice', html: `
    <div class="screen" data-screen="voice">
      <div class="app-header">
        <button class="round-btn" data-action="back" aria-label="Back">${I.back(18)}</button>
        <span class="screen-title">${T('voice')}</span>
        <span class="header-spacer"></span>
      </div>
      <div class="screen-scroll" style="padding-top:8px;padding-bottom:40px;">${voiceBodyHTML()}</div>
    </div>` };
}

/* ============================================================
   SCREEN: DEFAULT REMINDER TIMING (dedicated page)
   ============================================================ */
function screenTiming() {
  const s = state.settings;
  const timingLabels = {
    'At the time': T('atTheTime'),
    'In 30 minutes': T('in30Min'),
    'In 1 hour': T('in1Hour')
  };
  const opts = ['At the time', 'In 30 minutes', 'In 1 hour'].map(v =>
    `<button class="sheet-option" data-action="pick-timing" data-timing="${v}"><span>${timingLabels[v] || v}</span>${s.defaultTiming === v ? I.check(14) : ''}</button>`).join('');
  return { label: 'timing', html: `
    <div class="screen" data-screen="timing">
      <div class="app-header">
        <button class="round-btn" data-action="back" aria-label="Back">${I.back(18)}</button>
        <span class="screen-title">${T('defaultTiming')}</span>
        <span class="header-spacer"></span>
      </div>
      <div class="screen-scroll" style="padding-top:8px;">
        <div class="sheet-page">${opts}</div>
      </div>
    </div>` };
}

/* ============================================================
   SCREEN: ABOUT (dedicated page)
   ============================================================ */
function screenAbout() {
  const socIcons = {
    x: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    insta: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
    github: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>`,
    discord: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`
  };

  return { label: 'about', html: `
    <div class="screen" data-screen="about">
      <div class="app-header">
        <button class="round-btn" data-action="back" aria-label="Back">${I.back(18)}</button>
        <span class="screen-title">${T('aboutRecall')}</span>
        <span class="header-spacer"></span>
      </div>
      <div class="screen-scroll" style="padding-top:6px;padding-bottom:40px;">
        <div class="about-hero">
          <div class="about-app-icon">
            ${I.bell(32)}
          </div>
          <div class="about-app-title">Recall</div>
          <div class="about-app-tagline">${T('aboutTagline')}</div>
          <div class="about-badge">
            <span class="about-badge-dot"></span>
            <span>Version 1.0</span>
          </div>
        </div>

        <div class="about-section">
          <div class="about-section-heading">${T('aboutRecall')}</div>
          <p class="about-body-text">
            ${T('aboutRecallDesc')}
          </p>
        </div>

        <div class="about-section">
          <div class="about-section-heading">${T('whatRecallDoes')}</div>
          <div class="about-pillar-list">
            <div class="about-pillar-item">
              <div class="about-pillar-ic">${I.volume(18)}</div>
              <div>
                <div class="about-pillar-title">${T('featVoiceTitle')}</div>
                <div class="about-pillar-desc">${T('featVoiceDesc')}</div>
              </div>
            </div>
            <div class="about-pillar-item">
              <div class="about-pillar-ic">${I.focus(18)}</div>
              <div>
                <div class="about-pillar-title">${T('featSoundTitle')}</div>
                <div class="about-pillar-desc">${T('featSoundDesc')}</div>
              </div>
            </div>
            <div class="about-pillar-item">
              <div class="about-pillar-ic">${I.sparkle(18)}</div>
              <div>
                <div class="about-pillar-title">${T('featReflectTitle')}</div>
                <div class="about-pillar-desc">${T('featReflectDesc')}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="about-section">
          <div class="about-section-heading">${T('connectSocial')}</div>
          <div class="about-social-grid">
            <a class="about-social-card" href="https://x.com" target="_blank" rel="noopener" aria-label="Recall on X">
              ${socIcons.x}
              <span class="about-social-label">X</span>
            </a>
            <a class="about-social-card" href="https://instagram.com" target="_blank" rel="noopener" aria-label="Recall on Instagram">
              ${socIcons.insta}
              <span class="about-social-label">Instagram</span>
            </a>
            <a class="about-social-card" href="https://github.com" target="_blank" rel="noopener" aria-label="Recall GitHub">
              ${socIcons.github}
              <span class="about-social-label">GitHub</span>
            </a>
            <a class="about-social-card" href="https://discord.com" target="_blank" rel="noopener" aria-label="Recall Discord Community">
              ${socIcons.discord}
              <span class="about-social-label">Discord</span>
            </a>
          </div>
        </div>

        <div class="about-footer">
          <div>${T('craftedForCalm')}</div>
          <div style="margin-top:4px;font-size:11px;">© 2026 Recall. All rights reserved.</div>
        </div>
      </div>
    </div>` };
}

/* ============================================================
   SCREEN: PERMISSIONS (dedicated page with direct setting toggles)
   ============================================================ */
function openPhoneSetting(type) {
  toast(T('openingSettings') || 'Opening phone settings...');
  const pkg = 'com.recall.app';
  let intentUrl = '';
  if (type === 'notifications') {
    if ('Notification' in window && Notification.permission !== 'granted') {
      try { Notification.requestPermission(); } catch (e) {}
    }
    intentUrl = `intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=${pkg};end`;
  } else if (type === 'microphone') {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
    }
    const SRPlugin = window.Capacitor?.Plugins?.SpeechRecognition;
    if (SRPlugin && typeof SRPlugin.requestPermission === 'function') {
      try { SRPlugin.requestPermission(); } catch (e) {}
    }
    intentUrl = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;package=${pkg};data=package:${pkg};end`;
  } else if (type === 'overlay') {
    intentUrl = `intent:#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;package=${pkg};data=package:${pkg};end`;
  } else if (type === 'battery') {
    intentUrl = `intent:#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;package=${pkg};end`;
  }

  const appPlugin = window.Capacitor?.Plugins?.App;
  if (appPlugin && typeof appPlugin.openUrl === 'function') {
    appPlugin.openUrl({ url: intentUrl }).catch(() => {
      try { window.location.href = intentUrl; } catch (e) {}
    });
  } else {
    try { window.location.href = intentUrl; } catch (e) {}
  }
}

function togglePermission(type) {
  if (!state.settings.perms) state.settings.perms = {};
  const current = !!state.settings.perms[type];
  state.settings.perms[type] = !current;
  if (type === 'notifications') {
    state.settings.notifications = state.settings.perms[type];
  }
  save();
  render();
  openPhoneSetting(type);
}

function screenPermissions() {
  const p = state.settings.perms || {};
  const isNotifGranted = (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
  const notifActive = isNotifGranted || !!p.notifications;
  const micActive = !!p.microphone;
  const overlayActive = !!p.overlay;
  const batteryActive = !!p.battery;

  const permRow = (key, iconSvg, title, subtitle, active) => `
    <div class="settings-row" style="padding:15px 14px;border-radius:14px;background:var(--surface);margin-bottom:12px;border:1px solid var(--line-soft);display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;" data-action="toggle-perm" data-perm="${key}" role="button">
      <div style="display:flex;align-items:flex-start;gap:12px;flex:1;">
        <span style="color:var(--accent);display:inline-flex;align-items:center;margin-top:2px;flex-shrink:0;">${iconSvg}</span>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:15px;color:var(--ink);">${title}</div>
          <div style="font-size:12.5px;color:var(--ink-50);margin-top:3px;line-height:1.4;">${subtitle}</div>
        </div>
      </div>
      <button class="toggle ${active ? 'on' : ''}" data-action="toggle-perm" data-perm="${key}" aria-label="${title}" style="flex-shrink:0;">
        <span class="knob"></span>
      </button>
    </div>
  `;

  return { label: 'permissions', html: `
    <div class="screen" data-screen="permissions">
      <div class="app-header">
        <button class="round-btn" data-action="back" aria-label="Back">${I.back(18)}</button>
        <span class="screen-title">${T('permissions')}</span>
        <span class="header-spacer"></span>
      </div>
      <div class="screen-scroll" style="padding-top:12px;padding-bottom:40px;">
        <div style="font-size:13.5px;color:var(--ink-60);margin-bottom:20px;line-height:1.5;padding:0 2px;">
          ${T('permDesc')}
        </div>

        <div style="display:flex;flex-direction:column;">
          ${permRow('notifications', I.bell(20), T('permNotifications'), T('permNotificationsSub'), notifActive)}
          ${permRow('microphone', I.mic(20), T('permMic'), T('permMicSub'), micActive)}
          ${permRow('overlay', I.overlay(20), T('permOverlay'), T('permOverlaySub'), overlayActive)}
          ${permRow('battery', I.battery(20), T('permBattery'), T('permBatterySub'), batteryActive)}
        </div>

        <div style="margin-top:16px;">
          <button class="btn ghost" data-action="perm-test-alert" style="width:100%;height:48px;font-size:14px;border:1px solid var(--line-soft);display:flex;align-items:center;justify-content:center;gap:8px;">
            ${I.play(16)}<span>${T('testSoundVoice')}</span>
          </button>
        </div>
      </div>
    </div>` };
}

function voiceBodyHTML() {
  const s = state.settings;
  /* female voices first, then male — screen order requested by the user */
  /* fixed carousel order: Cocoa, Oak, Skye, Cedar, Willow (requested) */
  const VOICE_ORDER = ['warm', 'buttery', 'airy', 'bold', 'mellow'];
  const sel = s.personality || 'warm';
  const cards = VOICE_ORDER.map(k => {
    const p = PERSONALITIES[k];
    return `<button class="vp-card ${sel === k ? 'selected' : ''}" data-action="pick-personality" data-val="${k}" aria-label="Voice ${p.name}">
      <span class="vp-name">${p.name}</span>
      <span class="vp-voice">${T('voiceDesc_' + k) || p.desc}</span>
    </button>`;
  }).join('');
  const dots = VOICE_ORDER.map(k => `<span class="vp-dot ${sel === k ? 'on' : ''}"></span>`).join('');
  const paceLabels = { slow: T('slow'), normal: T('normal'), fast: T('fast') };
  const currentPace = paceLabels[s.pace || 'normal'] || PACES[s.pace || 'normal'];
  return `
    <div class="settings-row" style="border-bottom:none;"><span class="label">${T('voiceReminders')}</span><button class="toggle ${s.voice ? 'on' : ''}" data-action="toggle-setting" data-key="voice" aria-label="${T('voiceReminders')}"><span class="knob"></span></button></div>
    <div class="vp-carousel">${cards}</div>
    <div class="vp-dots">${dots}</div>
    <div style="display:flex;justify-content:center;margin:12px 0 14px;">
      <button class="chip" data-action="audition-due" style="font-size:12.5px;padding:8px 16px;border-radius:20px;display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line-soft);color:var(--ink);">
        ${I.bell(14)} <span>${T('auditionDelivery')}</span>
      </button>
    </div>
    <div class="voice-rows">
      <div class="settings-row" data-action="open-pace" role="button"><span class="label">${T('pace')}</span><span class="row-end"><span class="value">${currentPace}</span>${I.arrow(15)}</span></div>
    </div>`;
}
/* ---------- Language & Pace — bottom sheets from the Voice page ---------- */
function langSheet() {
  const cur = state.settings.lang || 'en';
  /* chip-style options — same look as the Repeat selector on New Reminder */
  const chips = Object.entries(LANGUAGES).map(([k, label]) =>
    `<button class="chip ${cur === k ? 'selected' : ''}" data-action="pick-lang" data-lang="${k}">${label}</button>`).join('');
  sheet(`<div class="sheet-handle"></div><div class="sheet-title">${T('language')}</div><div class="chip-row" style="margin-top:18px;">${chips}</div>`);
}
function paceSheet() {
  const cur = state.settings.pace || 'normal';
  const paceLabels = { slow: T('slow'), normal: T('normal'), fast: T('fast') };
  /* chip-style options — same look as the Language chips */
  const chips = Object.entries(PACES).map(([k, label]) =>
    `<button class="chip ${cur === k ? 'selected' : ''}" data-action="pick-pace" data-pace="${k}">${paceLabels[k] || label}</button>`).join('');
  sheet(`<div class="sheet-handle"></div><div class="sheet-title">${T('pace')}</div><div class="chip-row" style="margin-top:18px;">${chips}</div>`);
}/* keep the selected voice visible: scroll it smoothly to the middle of the carousel
   without disturbing vertical page scrolling or getting intercepted by intermediate snap points */
function centerSelectedVoice(smooth = true) {
  const c = document.querySelector('.screen-scroll .vp-carousel');
  if (!c) return;
  const sel = c.querySelector('.vp-card.selected');
  if (!sel) return;

  const targetLeft = sel.offsetLeft - (c.clientWidth - sel.offsetWidth) / 2;
  const maxScroll = Math.max(0, c.scrollWidth - c.clientWidth);
  const clamped = Math.max(0, Math.min(maxScroll, targetLeft));

  if (!smooth) {
    c.scrollLeft = clamped;
  } else {
    // Disable scroll snap during glide to avoid intermediate card interception
    c.style.scrollSnapType = 'none';
    c.scrollTo({ left: clamped, behavior: 'smooth' });
    setTimeout(() => {
      c.style.scrollSnapType = '';
    }, 380);
  }
}

let voiceScrollTimer = null;
function setupVoiceCarouselScroll(c) {
  if (!c || c._scrollBound) return;
  c._scrollBound = true;

  c.addEventListener('scroll', () => {
    if (c.style.scrollSnapType === 'none') return; // ignore during animated scroll
    clearTimeout(voiceScrollTimer);
    voiceScrollTimer = setTimeout(() => {
      const carouselCenter = c.scrollLeft + c.clientWidth / 2;
      const cards = Array.from(c.querySelectorAll('.vp-card'));
      let closestCard = null;
      let minDistance = Infinity;

      cards.forEach(card => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(carouselCenter - cardCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestCard = card;
        }
      });

      if (closestCard && !closestCard.classList.contains('selected')) {
        const key = closestCard.dataset.val;
        if (key && state.settings.personality !== key) {
          state.settings.personality = key;
          save();
          cards.forEach(cd => cd.classList.toggle('selected', cd === closestCard));
          const dotsWrap = c.nextElementSibling;
          if (dotsWrap && dotsWrap.classList.contains('vp-dots')) {
            const VOICE_ORDER = ['warm', 'buttery', 'airy', 'bold', 'mellow'];
            const idx = VOICE_ORDER.indexOf(key);
            dotsWrap.querySelectorAll('.vp-dot').forEach((dot, i) => {
              dot.classList.toggle('on', i === idx);
            });
          }
          speech.say(speech.introLine(), true);
        }
      }
    }, 140);
  }, { passive: true });
}
/* ---------- sheet actions (language / pace) ---------- */
document.getElementById('overlays').addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'pick-lang') {
    const ov = el.closest('.sheet-overlay'); if (ov) ov.remove();
    state.settings.lang = el.dataset.lang; save();
    renderBottomNav();
    render();
    if (state.settings.voice) speech.say(speech.t('langConfirm'));
    toast(`Language set to ${LANGUAGES[el.dataset.lang]}.`);
  }
  else if (a === 'pick-pace') {
    const ov = el.closest('.sheet-overlay'); if (ov) ov.remove();
    state.settings.pace = el.dataset.pace; save(); render();
    if (state.settings.voice) speech.say(speech.t('pace'));
    toast(`Pace set to ${PACES[el.dataset.pace]}.`);
  }
  else if (a === 'pick-soundscape') {
    focusEngine.playSoundscape(el.dataset.sound);
    openFocusSheet();
  }
  else if (a === 'pick-focus-duration') {
    const mins = parseInt(el.dataset.min, 10);
    focusEngine.initialSec = mins * 60;
    focusEngine.timerSec = mins * 60;
    openFocusSheet();
  }
  else if (a === 'focus-start') {
    focusEngine.start(Math.round(focusEngine.initialSec / 60), focusEngine.activeType);
    openFocusSheet();
  }
  else if (a === 'focus-pause') {
    focusEngine.pause();
    openFocusSheet();
  }
  else if (a === 'focus-resume') {
    focusEngine.resume();
    openFocusSheet();
  }
  else if (a === 'focus-stop') {
    focusEngine.stop();
    const ov = el.closest('.sheet-overlay'); if (ov) ov.remove();
    toast('Focus session ended.');
  }
});

/* ============================================================
   SCREEN: ACTIVE REMINDER (takeover)
   ============================================================ */
function screenActive(r) {
  const speechText = r.voiceClip ? `<span style="color:var(--accent);display:inline-flex;align-items:center;gap:6px;">${I.heart(16)} <span>${T('personalVoiceNote')}</span></span>` : esc(speech.dueLine(fmtTime(r.when), r.task));
  return { label: 'active', html: `
    <div class="screen dark" data-screen="active">
      <div class="active-wrap">
        <div class="active-stage">${T('itsTime')}</div>
        <div class="active-task">${esc(r.task)}</div>
        <div class="active-time">${fmtTime(r.when)}</div>
        <div class="pulse-wrap">
          <div class="pulse-ring r1" style="animation-delay:0s;"></div>
          <div class="pulse-ring r2"></div>
          <div class="pulse-ring r3"></div>
          <div class="pulse-core"></div>
        </div>
        <div class="active-speech">${speechText}</div>
        <div class="active-listener-badge">
          <span class="voice-dot"></span>
          <span>${T('listeningBadge')}</span>
        </div>
        <div class="active-actions" style="margin-top:20px;">
          <div style="display:flex;gap:10px;">
            <button class="btn primary" style="flex:1;height:52px;font-size:15px;font-weight:700;" data-action="complete" data-id="${r.id}">${T('done')}</button>
            <button class="btn outline" style="flex:1;height:52px;font-size:15px;font-weight:600;" data-action="snooze" data-id="${r.id}">${T('snooze')}</button>
            <button class="btn outline" style="flex:1;height:52px;font-size:15px;font-weight:600;" data-action="not-today" data-id="${r.id}">${T('notToday')}</button>
          </div>
        </div>
      </div>
    </div>` };
}
function openActive(r) {
  navStack = [{ name: 'home', data: {} }];
  render('push');
  historyRoot();
  state.activeId = r.id;
  startActiveVoiceListener(r);
  if (r.voiceClip && r.voiceClip.data) {
    playVoiceClip(r.voiceClip.data);
  } else {
    const spoken = speech.say(speech.dueLine(fmtTime(r.when), r.task));
    if (!spoken) toast(`It's time: ${r.task}`);
  }
}

/* ============================================================
   BOTTOM NAVIGATION BAR
   ============================================================ */
function openCreateMenuSheet() {
  const el = sheet(`
    <div class="sheet-handle"></div>
    <div style="margin-bottom:14px;padding:0 2px;">
      <div class="sheet-title" style="margin-bottom:4px;font-size:17px;">${T('whatToRemember')}</div>
      <div style="font-size:13px;color:var(--ink-40);">${T('seeHowWent')}</div>
    </div>
    <div class="create-options-list">
      <button class="create-opt-card" data-create-action="reminder">
        <div class="co-icon">${IL.plus(22)}</div>
        <div class="co-info">
          <div class="co-title">${T('addReminder')}</div>
          <div class="co-desc">${T('addReminderDesc')}</div>
        </div>
        <div class="co-arrow">${I.arrow(14)}</div>
      </button>
      <button class="create-opt-card" data-create-action="focus">
        <div class="co-icon">${I.focus(22, true)}</div>
        <div class="co-info">
          <div class="co-title">${T('startFocus')}</div>
          <div class="co-desc">${T('startFocusDesc')}</div>
        </div>
        <div class="co-arrow">${I.arrow(14)}</div>
      </button>
    </div>
  `);

  el.querySelector('.create-options-list')?.addEventListener('click', ev => {
    const opt = ev.target.closest('[data-create-action]');
    if (!opt) return;
    const act = opt.dataset.createAction;
    el.remove();
    if (act === 'reminder') {
      if (state.settings.defaultTiming === 'In 30 minutes') creating = { task: '', whenDay: 'Today', alert: 'In 30 minutes', pickedWhen: null, pickedWhenISO: null, pickedAlert: null, repeat: 'Never', customDays: [], editId: null, voiceClip: null };
      else if (state.settings.defaultTiming === 'In 1 hour') creating = { task: '', whenDay: 'Today', alert: 'In 1 hour', pickedWhen: null, pickedWhenISO: null, pickedAlert: null, repeat: 'Never', customDays: [], editId: null, voiceClip: null };
      else creating = { task: '', whenDay: 'Today', alert: 'In 30 minutes', pickedWhen: null, pickedWhenISO: null, pickedAlert: null, repeat: 'Never', customDays: [], editId: null, voiceClip: null };
      nlpSuggestion = null;
      go('create');
    } else if (act === 'focus') {
      go('focus');
    }
  });
}

function renderBottomNav() {
  const navEl = document.getElementById('bottomNav');
  if (!navEl) return;
  navEl.innerHTML = `
    <div class="bnav-island">
      <button class="bnav-tab" data-tab="home" data-action="nav-home" aria-label="${T('home')}">
        <span class="bnav-ic bnav-ic-outline">${I.home(20, false)}</span>
        <span class="bnav-ic bnav-ic-filled">${I.home(20, true)}</span>
        <span class="bnav-label">${T('home')}</span>
      </button>
      <button class="bnav-tab" data-tab="week" data-action="nav-week" aria-label="${T('reflect')}">
        <span class="bnav-ic bnav-ic-outline">${I.sparkle(20, false)}</span>
        <span class="bnav-ic bnav-ic-filled">${I.sparkle(20, true)}</span>
        <span class="bnav-label">${T('reflect')}</span>
      </button>
      <button class="bnav-tab" data-tab="settings" data-action="nav-settings" aria-label="${T('settings')}">
        <span class="bnav-ic bnav-ic-outline">${I.gear(20, false)}</span>
        <span class="bnav-ic bnav-ic-filled">${I.gear(20, true)}</span>
        <span class="bnav-label">${T('settings')}</span>
      </button>
    </div>
    <button class="bnav-add-btn" data-tab="create" data-action="nav-create" aria-label="${T('addReminder')}">
      ${IL.plus(22)}
    </button>
  `;
}

function updateBottomNav() {
  const navEl = document.getElementById('bottomNav');
  if (!navEl) return;
  if (!navEl.children.length) renderBottomNav();

  const cur = navStack[navStack.length - 1];
  const curName = cur ? cur.name : 'home';

  // Hide bottom nav on urgent active reminder alarm, creation, voice, theme, timing, about, or permissions screen
  if (active || curName === 'active' || curName === 'create' || curName === 'voice' || curName === 'theme' || curName === 'timing' || curName === 'about' || curName === 'permissions') {
    navEl.classList.add('nav-hidden');
    return;
  }
  navEl.classList.remove('nav-hidden');

  navEl.querySelectorAll('.bnav-tab').forEach(tab => {
    const tabName = tab.dataset.tab;
    const isActive = (tabName === 'home' && curName === 'home') ||
                     (tabName === 'week' && curName === 'week') ||
                     (tabName === 'settings' && (curName === 'settings' || curName === 'theme' || curName === 'voice' || curName === 'timing' || curName === 'about' || curName === 'permissions'));
    tab.classList.toggle('active', !!isActive);
  });
}

const bNavEl = document.getElementById('bottomNav');
if (bNavEl) {
  bNavEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;
    if (a === 'nav-home') {
      const cur = navStack[navStack.length - 1];
      if (cur && cur.name === 'home') {
        const sc = screensEl.querySelector('.screen-scroll');
        if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        resetTo('home');
      }
    }
    else if (a === 'open-focus' || a === 'nav-focus') {
      const cur = navStack[navStack.length - 1];
      if (cur && cur.name === 'focus') return;
      go('focus');
    }
    else if (a === 'nav-create') {
      openCreateMenuSheet();
    }
    else if (a === 'nav-week') {
      const cur = navStack[navStack.length - 1];
      if (cur && cur.name === 'week') return;
      go('week');
    }
    else if (a === 'nav-settings') {
      const cur = navStack[navStack.length - 1];
      if (cur && cur.name === 'settings') return;
      go('settings');
    }
  });
}

/* ============================================================
   RENDER
   ============================================================ */
let lastScreen = null;
function render(dir = 'push') {
  if (active) { // takeover screen
    screensEl.innerHTML = screenActive(active).html;
    lastScreen = 'active';
    updateBottomNav();
    return;
  }
  const cur = navStack[navStack.length - 1];
  const entering = cur.name !== lastScreen;
  if (entering && lastScreen === 'focus' && cur.name !== 'focus' && focusEngine.state !== 'running') {
    focusEngine.stopAudio();
  }
  if (entering && isPlayingWeekReflection && cur.name !== 'week') {
    stopWeekReflection();
  }
  lastScreen = cur.name;
  /* a same-screen re-render (picking a chip, a toggle, a theme) must not throw
     the page back to the top or drop what the user is typing into */
  const prevScroller = screensEl.querySelector('.screen-scroll');
  const keepScroll = !entering && prevScroller ? prevScroller.scrollTop : 0;
  const focused = document.activeElement;
  const focusId = !entering && focused && focused.id && screensEl.contains(focused) ? focused.id : null;
  const caret = focusId ? [focused.selectionStart, focused.selectionEnd] : null;
  let body;
  if (cur.name === 'home') body = screenHome();
  else if (cur.name === 'create') body = screenCreate();
  else if (cur.name === 'focus') body = screenFocus();
  else if (cur.name === 'details') body = screenDetails(cur.data.id);
  else if (cur.name === 'week') body = screenWeek();
  else if (cur.name === 'settings') body = screenSettings();
  else if (cur.name === 'theme') body = screenTheme();
  else if (cur.name === 'voice') body = screenVoice();
  else if (cur.name === 'timing') body = screenTiming();
  else if (cur.name === 'about') body = screenAbout();
  else if (cur.name === 'permissions') body = screenPermissions();
  else body = screenHome();
  screensEl.innerHTML = `<div class="screen-wrap">` + body.html + `</div>`;
  const sc = screensEl.querySelector('.screen');
  if (entering) { sc.classList.add('enter'); if (dir === 'back') sc.classList.add('back'); }
  const scrollEl = screensEl.querySelector('.screen-scroll');
  /* a screen you came back to reopens where you left it */
  if (scrollEl) scrollEl.scrollTop = entering ? (cur.scroll || 0) : keepScroll;
  if (focusId) {
    const f = document.getElementById(focusId);
    if (f) {
      try { f.focus({ preventScroll: true }); if (caret) f.setSelectionRange(caret[0], caret[1]); } catch (e) {}
    }
  }
  if (cur.name === 'voice') {
    requestAnimationFrame(() => {
      centerSelectedVoice(false);
      const carousel = document.querySelector('.screen-scroll .vp-carousel');
      if (carousel) setupVoiceCarouselScroll(carousel);
    });
  }
  updateBottomNav();
  renderMiniBar();
}
/* remember where each screen was scrolled to */
screensEl.addEventListener('scroll', e => {
  const t = e.target;
  if (!t || !t.classList || !t.classList.contains('screen-scroll')) return;
  const cur = navStack[navStack.length - 1];
  if (cur) cur.scroll = t.scrollTop;
}, true);

/* ---------- sheets & overlays ---------- */
function sheet(html, dismiss = true) {
  let el = document.querySelector('.sheet-overlay');
  if (el) {
    const s = el.querySelector('.sheet');
    if (s) {
      s.innerHTML = html;
      return el;
    }
  }
  el = document.createElement('div');
  el.className = 'sheet-overlay';
  el.innerHTML = `<div class="sheet">${html}</div>`;
  if (dismiss) el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  $('#overlays').appendChild(el);
  return el;
}
function confirmDelete(id) {
  const el = sheet(`
    <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:4px 0 6px;">
      <div style="width:52px;height:52px;border-radius:50%;background:rgba(220,38,38,.12);color:#DC2626;display:flex;align-items:center;justify-content:center;margin-bottom:14px;">
        ${I.trash(24)}
      </div>
      <div class="sheet-title" style="margin-bottom:6px;font-size:18px;">${T('deleteConfirmTitle')}</div>
      <div style="font-size:14px;color:var(--ink-50);line-height:1.45;max-width:280px;margin-bottom:18px;">${T('deleteConfirmDesc')}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="btn danger" data-sheet="delete" data-id="${id}" style="background:#DC2626;color:#FFFFFF;display:flex;align-items:center;justify-content:center;gap:8px;">
        ${I.trash(18)}<span>${T('delete')}</span>
      </button>
      <button class="btn ghost" data-sheet="cancel">${T('cancel')}</button>
    </div>`);
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-sheet]');
    if (!t) return;
    el.remove();
    if (t.dataset.sheet === 'delete') deleteReminder(t.dataset.id, true);
  });
}
function snoozeSheet(id) {
  const snoozeOptions = [
    { key: '10 minutes', label: T('snooze10m') },
    { key: '30 minutes', label: T('snooze30m') },
    { key: '1 hour', label: T('snooze1h') }
  ];
  const el = sheet(`
    <div class="sheet-handle"></div><div class="sheet-title">${T('snoozeFor')}</div>
    ${snoozeOptions.map(opt => `<button class="sheet-option" data-snooze="${opt.key}" data-id="${id}" style="display:block;width:100%;text-align:left;">${opt.label}</button>`).join('')}
    <div class="field-label" style="margin-top:14px;">${T('orPickTime')}</div>
    <button class="time-field" data-snooze="clock" data-id="${id}" type="button"><span class="tf-value" id="snoozeTimeLabel">--:--</span><span class="tf-ic">${I.clock(20)}</span></button>
    <button class="btn primary mt-24" data-snooze="chosen" data-id="${id}">${T('snooze')}</button>`);
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-snooze]');
    if (!t) return;
    const r = find(t.dataset.id); if (!r) { el.remove(); return; }
    const now = Date.now();
    let label = '';
    if (t.dataset.snooze === 'clock') {
      /* open the clock dial on top of this sheet; fill the field once a time is set */
      clockPickSheet({
        title: 'Pick a time',
        initial: el.dataset.picked ? +el.dataset.picked : null,
        onSet: ts => {
          el.dataset.picked = String(ts);
          el.querySelector('#snoozeTimeLabel').textContent = fmtTime(ts);
          el.querySelector('.time-field').classList.add('has-value');
        }
      });
      return;
    }
    if (t.dataset.snooze === '10 minutes') { r.snoozeUntil = now + 10 * 6e4; label = '10 minutes'; }
    else if (t.dataset.snooze === '30 minutes') { r.snoozeUntil = now + 30 * 6e4; label = '30 minutes'; }
    else if (t.dataset.snooze === '1 hour') { r.snoozeUntil = now + 60 * 6e4; label = '1 hour'; }
    else {
      const v = el.dataset.picked; el.remove();
      if (!v) { toast('Pick a snooze time first.'); return; }
      const d = new Date(); const p = new Date(+v);
      d.setHours(+p.getHours(), +p.getMinutes(), 0, 0);
      if (d.getTime() <= now) d.setDate(d.getDate() + 1);
      r.snoozeUntil = d.getTime(); label = 'a chosen time';
    }
    r.status = 'snoozed'; log(r, 'snoozed');
    el.remove();
    active = null; state.activeId = null;
    save(); render('back');
    toast(`Snoozed for ${label}.`);
  });
}
function remindAgainSheet(id) {
  const againOptions = [
    { key: 'In 30 minutes', label: T('in30Min') },
    { key: 'In 1 hour', label: T('in1Hour') },
    { key: 'Tonight', label: T('tonight') }
  ];
  const el = sheet(`
    <div class="sheet-handle"></div><div class="sheet-title">${T('remindAgainTitle')}</div>
    ${againOptions.map(opt => `<button class="sheet-option" data-again="${opt.key}" data-id="${id}" style="display:block;width:100%;text-align:left;">${opt.label}</button>`).join('')}`);
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-again]');
    if (!t) return;
    const r = find(t.dataset.id); if (!r) { el.remove(); return; }
    const now = Date.now();
    if (t.dataset.again === 'In 30 minutes') r.when = now + 30 * 6e4;
    else if (t.dataset.again === 'In 1 hour') r.when = now + 60 * 6e4;
    else { const d = new Date(); d.setHours(20, 0, 0, 0); if (d.getTime() <= now) d.setDate(d.getDate() + 1); r.when = d.getTime(); }
    r.status = 'upcoming'; delete r.snoozeUntil;
    el.remove(); save(); render();
    toast(`Okay. Recall will remind you again ${t.dataset.again.toLowerCase().replace('in ', 'in ')}.`);
  });
}
/* ---------- voice dictation into the task field ---------- */
const DICT_LANGS = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR' };
let dictation = null;
function startDictation() {
  const btn = document.querySelector('.mic-btn');
  const input = $('#taskInput');

  // Support Capacitor native speech recognition on Android
  const SRPlugin = window.Capacitor?.Plugins?.SpeechRecognition;
  if (SRPlugin && typeof SRPlugin.start === 'function') {
    if (dictation) {
      try {
        if (typeof SRPlugin.stop === 'function') SRPlugin.stop().catch(() => {});
        SRPlugin.removeAllListeners?.();
      } catch (e) {}
      if (btn) btn.classList.remove('listening');
      dictation = null;
      return;
    }

    const startNativeDictation = () => {
      dictation = { base: (creating.task || '').trim() };
      if (btn) btn.classList.add('listening');
      toast('Listening… tap mic to finish.');
      try {
        SRPlugin.start({
          language: DICT_LANGS[state.settings.lang] || 'en-US',
          maxResults: 1,
          partialResults: true,
          popup: false,
        }).catch(() => {
          if (btn) btn.classList.remove('listening');
          dictation = null;
        });

        SRPlugin.removeAllListeners?.();
        SRPlugin.addListener?.('partialResults', data => {
          if (!dictation) return;
          if (data && data.matches && data.matches.length) {
            const spoken = data.matches[0].trim();
            const val = (dictation.base ? dictation.base + ' ' : '') + spoken;
            if (input) input.value = val;
            creating.task = val;
          }
        });
      } catch (e) {
        if (btn) btn.classList.remove('listening');
        dictation = null;
      }
    };

    if (typeof SRPlugin.hasPermission === 'function') {
      SRPlugin.hasPermission().then(res => {
        if (!res.permission && typeof SRPlugin.requestPermission === 'function') {
          SRPlugin.requestPermission().then(req => {
            if (req.permission) startNativeDictation();
          }).catch(() => {});
        } else {
          startNativeDictation();
        }
      }).catch(() => startNativeDictation());
    } else {
      startNativeDictation();
    }
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("Voice typing isn't supported in this browser."); return; }
  if (dictation) { dictation.rec.stop(); return; }
  try {
    const rec = new SR();
    dictation = { rec, base: (creating.task || '').trim() };
    rec.lang = DICT_LANGS[state.settings.lang] || 'en-US';
    rec.interimResults = true;
    rec.onstart = () => btn && btn.classList.add('listening');
    rec.onresult = e => {
      if (!dictation) return;
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (final) dictation.base = (dictation.base ? dictation.base + ' ' : '') + final.trim();
      const val = (dictation.base + (interim ? (dictation.base ? ' ' : '') + interim : '')).trim();
      if (input) input.value = val;
      creating.task = val;
    };
    rec.onend = () => {
      if (btn) btn.classList.remove('listening');
      dictation = null;
      if (creating.task) {
        const parsed = parseNaturalSchedule(creating.task);
        if (parsed) {
          applyNlpSchedule(parsed);
          toast(`Auto-scheduled: ${parsed.summary}`);
        }
      }
    };
    rec.onerror = ev => {
      if (btn) btn.classList.remove('listening');
      dictation = null;
      if (ev.error === 'not-allowed') toast('Allow microphone access to dictate.');
      else if (ev.error === 'no-speech') toast("I didn't catch anything — try again.");
      else if (ev.error !== 'aborted') toast('Voice typing stopped.');
    };
    rec.start();
    toast('Listening… tap the mic to stop.');
  } catch (e) {
    toast("Voice typing isn't available right now.");
    dictation = null;
  }
}
function aboutSheet() {
  sheet(`<div class="sheet-handle"></div><div class="sheet-title">About Recall</div>
    <p style="font-size:14.5px;line-height:1.6;color:var(--ink-60);margin-top:6px;">
      Recall is a quiet reminder companion. It says things to you in a human voice at the moment you planned — and nudges you once, cleanly, without streaks, points or clutter.<br><br>Version 1.0 · Built from the Recall design file.</p>`);
}

/* ---------- first-time permission onboarding trigger ---------- */
function openPermissionPromptSheet() {
  if (state.settings.seenPermissionPrompt) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    state.settings.notifications = true;
    state.settings.seenPermissionPrompt = true;
    save();
    return;
  }

  const html = `
    <div class="sheet-handle"></div>
    <div style="text-align:center;padding:12px 6px 14px;">
      <div style="width:60px;height:60px;border-radius:18px;background:var(--accent-soft);color:var(--accent);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;box-shadow:0 8px 24px -4px var(--accent-ring);">
        ${I.bell(26)}
      </div>
      <div class="sheet-title" style="margin:0 0 6px;font-size:20px;font-weight:700;">${T('allowReminderAlerts')}</div>
      <div style="font-size:13.5px;line-height:1.55;color:var(--ink-60);max-width:320px;margin:0 auto 16px;">
        ${T('allowAlertsDesc')}
      </div>
      <div style="background:var(--surface);border:1px solid var(--line-soft);border-radius:14px;padding:12px 14px;text-align:left;margin-bottom:20px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink);">
          <span style="color:var(--accent);display:flex;flex-shrink:0;">${I.check(16)}</span>
          <span>${T('alertOnLockScreen')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink);">
          <span style="color:var(--accent);display:flex;flex-shrink:0;">${I.check(16)}</span>
          <span>${T('spokenAndVoiceMemos')}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn primary" data-perm="allow" style="width:100%;font-size:15px;padding:14px 20px;">
          ${T('allowAlertsBtn')}
        </button>
        <button class="btn ghost" data-perm="later" style="width:100%;font-size:14px;padding:10px;">
          ${T('maybeLater')}
        </button>
      </div>
    </div>`;

  const el = sheet(html, true);
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-perm]');
    if (!btn) return;
    const action = btn.dataset.perm;
    if (action === 'allow') {
      speech.prime();
      earconAudio.prime();
      if ('Notification' in window) {
        Notification.requestPermission().then(p => {
          state.settings.notifications = (p === 'granted');
          state.settings.seenPermissionPrompt = true;
          state.settings.seenBanner = true;
          save();
          render();
          el.remove();
          if (p === 'granted') {
            toast('Alerts enabled! Recall is ready.');
          } else {
            toast('Notifications blocked. You can allow them in Settings.');
          }
        });
      } else {
        state.settings.seenPermissionPrompt = true;
        save();
        el.remove();
        toast('Notifications not supported in this browser.');
      }
    } else if (action === 'later') {
      state.settings.seenPermissionPrompt = true;
      save();
      el.remove();
      toast('You can enable alerts anytime in Settings.');
    }
  });
}

/* ---------- manual permissions & draw over apps page navigation ---------- */
function openPermissionsGuideSheet() {
  go('permissions');
}
/* ---------- date picker — calendar + typed entry, slides from the bottom ---------- */
let dateState = null;  // { view:'cal'|'input', y, m0, sel }
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function pickDateSheet() {
  const init = creating.pickedWhenISO ? new Date(creating.pickedWhenISO) : new Date();
  dateState = { view: 'cal', y: init.getFullYear(), m0: init.getMonth(), sel: init.getTime() };
  let ov = document.querySelector('.clock-overlay');
  if (ov) ov.remove();
  ov = document.createElement('div');
  ov.className = 'clock-overlay';
  ov.addEventListener('click', e => {
    if (e.target === ov) { ov.remove(); dateState = null; return; }
    const c = dateState; if (!c) return;
    if (e.target.closest('[data-date-toggle]')) {
      if (c.view === 'cal') { c.view = 'input'; c._focus = true; }
      else {
        const v = ov.querySelector('#calIn');
        if (v && !applyTypedDate(v.value)) return;      // keep the typed view open
        c.view = 'cal';
      }
      renderDateSheet(); return;
    }
    const day = e.target.closest('[data-cal-day]');
    if (day) { c.sel = new Date(c.y, c.m0, +day.dataset.calDay).getTime(); renderDateSheet(); return; }
    if (e.target.closest('[data-cal-prev]')) { c.m0--; if (c.m0 < 0) { c.m0 = 11; c.y--; } renderDateSheet(); return; }
    if (e.target.closest('[data-cal-next]')) { c.m0++; if (c.m0 > 11) { c.m0 = 0; c.y++; } renderDateSheet(); return; }
    if (e.target.closest('[data-date-cancel]')) { ov.remove(); dateState = null; return; }
    if (e.target.closest('[data-date-set]')) {
      if (c.view === 'input' && !applyTypedDate(ov.querySelector('#calIn')?.value)) return;
      const d = new Date(c.sel); d.setHours(12, 0, 0, 0);
      const langBcp = LANG_BCP[state.settings.lang || 'en'] || undefined;
      creating.pickedWhenISO = d.getTime();
      creating.pickedWhen = d.toLocaleDateString(langBcp, { month: 'short', day: 'numeric' });
      creating.whenDay = 'Pick';
      ov.remove(); dateState = null;
      render();
    }
  });
  ov.addEventListener('change', e => {
    const c = dateState; if (!c) return;
    if (e.target.matches('[data-cal-year]')) { c.y = +e.target.value; renderDateSheet(); }
  });
  $('#overlays').appendChild(ov);
  renderDateSheet();
}
function dateBoxLabel(ts) {
  const d = new Date(ts);
  const lang = state.settings.lang || 'en';
  const langBcp = LANG_BCP[lang] || 'en-US';
  const str = d.toLocaleDateString(langBcp, { weekday: 'short', month: 'short', day: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}
/* parse a typed date like "Mon, Aug 17" into dateState */
function applyTypedDate(text) {
  const c = dateState; if (!c) return true;
  const s = (text || '').trim();
  const mDay = s.match(/(\d{1,2})/);
  const l = state.settings.lang || 'en';
  const monthList = MONTH_NAMES[l] || MONTH_NAMES.en;
  let mi = -1;
  for (let i = 0; i < 12; i++) {
    const enPrefix = MONTH_NAMES.en[i].toLowerCase().slice(0, 3);
    const locPrefix = monthList[i].toLowerCase().slice(0, 3);
    if (s.toLowerCase().includes(enPrefix) || s.toLowerCase().includes(locPrefix)) {
      mi = i;
      break;
    }
  }
  if (!mDay || mi < 0) { toast(T('tryDateLike')); return false; }
  const now = new Date();
  let d = new Date(now.getFullYear(), mi, +mDay[1]);
  if (d.getTime() < new Date().setHours(0, 0, 0, 0)) d = new Date(now.getFullYear() + 1, mi, +mDay[1]);
  c.sel = d.getTime(); c.y = d.getFullYear(); c.m0 = mi;
  return true;
}
function renderDateSheet() {
  const ov = document.querySelector('.clock-overlay'); if (!ov || !dateState) return;
  const c = dateState;
  const l = state.settings.lang || 'en';
  const monthList = MONTH_NAMES[l] || MONTH_NAMES.en;
  const dowList = CAL_DOWS[l] || CAL_DOWS.en;
  const toggle = `<button class="dlg-toggle" data-date-toggle="1" aria-label="Switch entry mode">${I[c.view === 'cal' ? 'keyboard' : 'calendar'](17)}</button>`;
  const boxLabel = dateBoxLabel(c.sel);
  let body = '';
  if (c.view === 'cal') {
    const daysIn = new Date(c.y, c.m0 + 1, 0).getDate();
    const startDow = new Date(c.y, c.m0, 1).getDay();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selD = new Date(c.sel);
    const sameMo = selD.getFullYear() === c.y && selD.getMonth() === c.m0;
    let cells = '';
    for (let i = 0; i < startDow; i++) cells += '<span class="cal-day"></span>';
    for (let d = 1; d <= daysIn; d++) {
      const t = new Date(c.y, c.m0, d).getTime();
      const isSel = sameMo && selD.getDate() === d;
      const isToday = t === today.getTime();
      cells += `<button class="cal-day ${isSel ? 'sel' : ''} ${isToday ? 'today' : ''}" data-cal-day="${d}">${d}</button>`;
    }
    const dows = dowList.map(dd => `<span class="cal-dow">${dd}</span>`).join('');
    const years = [];
    for (let y = c.y - 80; y <= c.y + 20; y++) years.push(`<option value="${y}" ${y === c.y ? 'selected' : ''}>${y}</option>`);
    body = `
      <div class="cal-box">${boxLabel}</div>
      <div class="cal-nav">
        <select class="cal-year" data-cal-year="1">${years.join('')}</select>
        <div class="cal-month">
          <button class="cal-arrow" data-cal-prev="1" aria-label="Previous month">${I.back(13)}</button>
          <span>${monthList[c.m0]}</span>
          <button class="cal-arrow" data-cal-next="1" aria-label="Next month">${I.arrow(13)}</button>
        </div>
      </div>
      <div class="cal-grid">${dows}${cells}</div>`;
  } else {
    body = `<div class="cal-box as-input"><input id="calIn" value="${esc(boxLabel)}"></div>`;
  }
  let sheetEl = ov.querySelector('.sheet.date-sheet');
  if (!sheetEl) {
    sheetEl = document.createElement('div');
    sheetEl.className = 'sheet date-sheet';
    ov.appendChild(sheetEl);
  }
  sheetEl.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="dlg-head"><span class="sheet-title">${T('pickDate')}</span>${toggle}</div>
    ${body}
    <div class="dlg-row">
      <button class="dlg-btn" data-date-cancel="1" type="button">${T('cancel')}</button>
      <button class="dlg-btn" data-date-set="1" type="button">${T('done')}</button>
    </div>`;
  if (c._focus) { c._focus = false; const inp = ov.querySelector('#calIn'); if (inp) { inp.focus(); inp.select(); } }
}
/* ---------- time picker — dial + keyboard entry, slides from the bottom ---------- */
let clockState = null;  // { view:'dial'|'input', mode:'h'|'m', h:1..12, m, ap, title, onSet }
function clockPickSheet({ title = 'Pick a time', initial = null, onSet }) {
  const d = initial ? new Date(initial) : new Date();
  clockState = { view: 'dial', mode: 'h', h: d.getHours() % 12 || 12, m: d.getMinutes(), ap: d.getHours() >= 12 ? 'PM' : 'AM', title, onSet };
  let ov = document.querySelector('.clock-overlay');
  if (ov) ov.remove();
  ov = document.createElement('div');
  ov.className = 'clock-overlay';
    ov.addEventListener('click', e => {
      if (e.target === ov) { ov.remove(); clockState = null; return; }
      const c = clockState; if (!c) return;
      if (e.target.closest('[data-clock-toggle]')) {
        if (c.view === 'dial') { c.view = 'input'; c._focus = true; }
        else { c.m = Math.round(c.m / 5) * 5 % 60; c.view = 'dial'; }
        renderClockDial(); return;
      }
      const num = e.target.closest('[data-cd]');
      if (num) {
        const v = +num.dataset.cd;
        if (c.mode === 'h') { c.h = v; c.mode = 'm'; }
        else c.m = v;
        renderClockDial();
        return;
      }
      const box = e.target.closest('[data-tm]');
      if (box) { c.mode = box.dataset.tm; renderClockDial(); return; }
      const ap = e.target.closest('[data-ap]');
      if (ap) { c.ap = ap.dataset.ap; renderClockDial(); return; }
      if (e.target.closest('[data-clock-cancel]')) { ov.remove(); clockState = null; return; }
      if (e.target.closest('[data-clock-set]')) {
        const t = new Date(); t.setHours((c.h % 12) + (c.ap === 'PM' ? 12 : 0), c.m, 0, 0);
        ov.remove(); clockState = null;
        if (onSet) onSet(t.getTime());
      }
    });
    /* keyboard-mode hour/minute entry — value syncs into state without re-render */
    ov.addEventListener('input', e => {
      const c = clockState; if (!c) return;
      const v = parseInt(e.target.value, 10);
      if (e.target.value === '' || isNaN(v)) return;
      if (e.target.id === 'clkh' && v >= 1 && v <= 12) c.h = v;
      if (e.target.id === 'clkm' && v >= 0 && v <= 59) c.m = v;
    });
    $('#overlays').appendChild(ov);
  renderClockDial();
}
function clockAPButtons() {
  const c = clockState;
  return `<div class="clock-ap">
    <button class="ap-btn ${c.ap === 'AM' ? 'on' : ''}" data-ap="AM" type="button">AM</button>
    <button class="ap-btn ${c.ap === 'PM' ? 'on' : ''}" data-ap="PM" type="button">PM</button>
  </div>`;
}
function renderClockDial() {
  const ov = document.querySelector('.clock-overlay'); if (!ov || !clockState) return;
  const c = clockState;
  const toggle = `<button class="dlg-toggle" data-clock-toggle="1" aria-label="Switch entry mode">${I[c.view === 'dial' ? 'keyboard' : 'clock'](17)}</button>`;
  const boxes = c.view === 'input'
    ? `<div class="tm-col"><div class="clk-box active"><input id="clkh" inputmode="numeric" maxlength="2" value="${c.h}"></div><span class="tm-label">${T('hour')}</span></div>
       <span class="tm-colon">:</span>
       <div class="tm-col"><div class="clk-box"><input id="clkm" inputmode="numeric" maxlength="2" value="${String(c.m).padStart(2, '0')}"></div><span class="tm-label">${T('minute')}</span></div>`
    : `<div class="tm-col"><button class="clk-box ${c.mode === 'h' ? 'active' : ''}" data-tm="h" type="button">${c.h}</button></div>
       <span class="tm-colon">:</span>
       <div class="tm-col"><button class="clk-box ${c.mode === 'm' ? 'active' : ''}" data-tm="m" type="button">${String(c.m).padStart(2, '0')}</button></div>`;
  let dial = '';
  if (c.view === 'dial') {
    const vals = c.mode === 'h' ? [12,1,2,3,4,5,6,7,8,9,10,11] : [0,5,10,15,20,25,30,35,40,45,50,55];
    const sel = c.mode === 'h' ? c.h : c.m;
    const chips = vals.map((v, i) => {
      const ang = (i * 30 - 90) * Math.PI / 180;           // math angle, i=0 at 12 o'clock
      const x = 50 + 38 * Math.cos(ang);
      const y = 50 + 38 * Math.sin(ang);
      return `<span class="cd-num ${sel === v ? 'on' : ''}" style="left:${x}%;top:${y}%;" data-cd="${v}">${c.mode === 'm' && v === 0 ? '00' : v}</span>`;
    }).join('');
    let idx = vals.indexOf(sel);
    if (idx < 0) idx = Math.round(sel / 5) % 12;           // typed off-grid minute → nearest chip
    const rot = (180 + idx * 30) % 360;                    // hand base points down (6 o'clock)
    dial = `<div class="clock-dial"><span class="cd-hand" style="transform:translateX(-50%) rotate(${rot}deg);"></span>${chips}</div>`;
  }
  let sheetEl = ov.querySelector('.sheet.clock-sheet');
  if (!sheetEl) {
    sheetEl = document.createElement('div');
    sheetEl.className = 'sheet clock-sheet';
    ov.appendChild(sheetEl);
  }
  sheetEl.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="dlg-head"><span class="sheet-title">${esc(c.title)}</span>${toggle}</div>
    <div class="tm-row">${boxes}${clockAPButtons()}</div>
    ${dial}
    <div class="dlg-row">
      <button class="dlg-btn" data-clock-cancel="1" type="button">${T('cancel')}</button>
      <button class="dlg-btn" data-clock-set="1" type="button">${T('done')}</button>
    </div>`;
  if (c._focus) { c._focus = false; const h = ov.querySelector('#clkh'); if (h) { h.focus(); h.select(); } }
}
function pickTimeSheet() {
  clockPickSheet({
    title: T('pickTime'),
    initial: creating.pickedAlert,
    onSet: ts => { creating.pickedAlert = ts; render(); }
  });
}

/* ---------- actions ---------- */
function completeReminder(id, silent = false) {
  stopActiveVoiceListener();
  stopVoiceClip();
  const r = find(id);
  if (r) {
    r.status = 'completed';
    log(r, 'completed');
    if (r.repeat && r.repeat !== 'Never') {
      const nxt = nextWhen(r.when, r.repeat);
      if (nxt && nxt > Date.now()) {
        state.reminders.push({ id: uid(), task: r.task, when: nxt, remindLabel: r.remindLabel, repeat: r.repeat, voiceClip: r.voiceClip || null, status: 'upcoming', created: Date.now() });
        state.log.push({ type: 'created', task: r.task, at: Date.now(), hour: new Date().getHours() });
      }
    }
  }
  if (active) { active = null; state.activeId = null; }
  save(); resetTo('home');
  if (!silent) toast(['Done. You remembered.', "Nice. That's one less thing to carry in your head.", 'You got it done.'][Math.floor(Math.random() * 3)]);
}
function deleteReminder(id, _fromSheet = false) {
  stopActiveVoiceListener();
  stopVoiceClip();
  state.reminders = state.reminders.filter(r => String(r.id) !== String(id));
  if (active && String(active.id) === String(id)) { active = null; state.activeId = null; }
  save(); resetTo('home');
  toast('Reminder deleted.');
}
function quickDone(id) { completeReminder(id); }
function editReminder(id) {
  const r = find(id);
  const d = new Date(r.when), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrowDay = d.toDateString() === new Date(now.getTime() + DAY_MS).toDateString();
  creating = {
    task: r.task, editId: r.id,
    whenDay: sameDay ? 'Today' : tomorrowDay ? 'Tomorrow' : 'Pick',
    pickedWhen: sameDay || tomorrowDay ? null : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    pickedWhenISO: sameDay || tomorrowDay ? null : d.getTime(),
    alert: r.remindLabel === 'At the time' ? 'Pick a time' : r.remindLabel,
    pickedAlert: r.remindLabel === 'At the time' ? d.getTime() : null,
    repeat: r.repeat, customDays: typeof r.repeat === 'object' ? r.repeat.days.slice() : [],
    voiceClip: r.voiceClip || null
  };
  go('create');
}

/* ---------- event delegation ---------- */
screensEl.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('#overlays')) return;
  const a = el.dataset.action, id = el.dataset.id;
  // while active takeover is open, only its own controls respond
  const takeoverAllowed = ['complete', 'snooze', 'not-today'];
  if (active && !takeoverAllowed.includes(a)) return;
  if (a === 'go-new') {
    if (state.settings.defaultTiming === 'In 30 minutes') creating = { task: '', whenDay: 'Today', alert: 'In 30 minutes', pickedWhen: null, pickedWhenISO: null, pickedAlert: null, repeat: 'Never', customDays: [], editId: null, voiceClip: null };
    else if (state.settings.defaultTiming === 'In 1 hour') creating = { task: '', whenDay: 'Today', alert: 'In 1 hour', pickedWhen: null, pickedWhenISO: null, pickedAlert: null, repeat: 'Never', customDays: [], editId: null, voiceClip: null };
    else creating = { task: '', whenDay: 'Today', alert: 'In 30 minutes', pickedWhen: null, pickedWhenISO: null, pickedAlert: null, repeat: 'Never', customDays: [], editId: null, voiceClip: null };
    nlpSuggestion = null;
    go('create');
  }
  else if (a === 'open-focus') openFocusSheet();
  else if (a === 'go-settings') go('settings');
  else if (a === 'go-voice') go('voice');
  else if (a === 'go-theme') go('theme');
  else if (a === 'go-timing') go('timing');
  else if (a === 'go-about') go('about');
  else if (a === 'go-permissions' || a === 'open-permissions-guide') go('permissions');
  else if (a === 'toggle-perm') {
    const type = t.dataset.perm || t.closest('[data-perm]')?.dataset?.perm;
    if (type) togglePermission(type);
  }
  else if (a === 'open-phone-perm') {
    const type = t.dataset.perm || t.closest('[data-perm]')?.dataset?.perm;
    if (type) openPhoneSetting(type);
  }
  else if (a === 'perm-allow-now') {
    speech.prime();
    earconAudio.prime();
    if ('Notification' in window) {
      Notification.requestPermission().then(p => {
        state.settings.notifications = (p === 'granted');
        state.settings.seenBanner = true;
        save();
        render();
        if (p === 'granted') {
          toast('Notifications allowed! Recall is ready.');
        } else {
          toast('Still blocked. Follow the steps below in Chrome site settings.');
        }
      });
    } else {
      toast('Notifications not supported in this browser.');
    }
  }
  else if (a === 'perm-test-alert') {
    speech.say('This is a test reminder from Recall. Everything is set up.');
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = 'Recall Test Alert';
      const options = {
        body: "Your reminders will alert you like this! Tap to open.",
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: 'recall-test',
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      };
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options)).catch(() => new Notification(title, options));
      } else {
        try { new Notification(title, options); } catch (e) {}
      }
      toast('Test alert sent! Check your notification bar.');
    } else {
      toast('Playing test audio. Allow notifications above for phone popups.');
    }
  }
  else if (a === 'go-week') go('week');
  else if (a === 'open-details') { if (el.classList.contains('check-btn')) return; go('details', { id }); }
  else if (a === 'quick-done') quickDone(id);
  else if (a === 'back') { stopVoiceClip(); back(); }
  else if (a === 'pick-when') {
    creating.whenDay = el.dataset.val;
    if (el.dataset.val === 'Pick') pickDateSheet(); else { creating.pickedWhen = null; creating.pickedWhenISO = null; render(); }
  }
  else if (a === 'pick-date-again') pickDateSheet();
  else if (a === 'pick-alert') { creating.alert = el.dataset.val; if (el.dataset.val === 'Pick a time') pickTimeSheet(); else { creating.pickedAlert = null; render(); } }
  else if (a === 'pick-time-again') pickTimeSheet();
  else if (a === 'pick-repeat') {
    const v = el.dataset.val;
    if (v === 'Custom' || v === 'Customize') {
      const order = [1, 2, 3, 4, 5, 6, 0];      // MON … SUN, like the design
      const l = state.settings.lang || 'en';
      const wdShort = WD_SHORT[l] || WD_SHORT.en;
      const circle = i => `<button class="wd-circle ${creating.customDays.includes(i) ? 'selected' : ''}" data-wd="${i}">${wdShort[i]}</button>`;
      const days0 = creating.customDays.slice();   // Cancel restores these
      const el2 = sheet(`
        <div class="sheet-handle"></div>
        <div class="sheet-title" style="font-size:18px;">${T('customRepeat')}</div>
        <div class="wd-row">${order.slice(0, 4).map(circle).join('')}</div>
        <div class="wd-row" style="margin-top:10px;">${order.slice(4).map(circle).join('')}</div>
        <div class="dlg-row">
          <button class="dlg-btn" data-wd-cancel="1">${T('cancel')}</button>
          <button class="dlg-btn" data-wd-save="1">${T('done')}</button>
        </div>`);
      el2.addEventListener('click', ev => {
        const wd = ev.target.closest('[data-wd]');
        if (wd) {
          const i = +wd.dataset.wd, k = creating.customDays.indexOf(i);
          if (k >= 0) creating.customDays.splice(k, 1); else creating.customDays.push(i);
          wd.classList.toggle('selected'); return;
        }
        if (ev.target.closest('[data-wd-cancel]')) { el2.remove(); creating.customDays = days0; return; }
        if (ev.target.closest('[data-wd-save]')) {
          el2.remove();
          creating.repeat = creating.customDays.length ? { days: creating.customDays.slice() } : 'Never';
          render();
        }
      });
    } else { creating.repeat = v; render(); }
  }
  else if (a === 'start-recording-vn') {
    voiceNoteRecorder.start(
      () => {},
      clip => { creating.voiceClip = clip; render(); },
      () => render()
    );
  }
  else if (a === 'stop-recording-vn') {
    voiceNoteRecorder.stop();
  }
  else if (a === 'preview-voice-note') {
    const clipData = el.dataset.clip || (creating.voiceClip && creating.voiceClip.data);
    if (clipData) togglePreviewVoiceClip(clipData);
  }
  else if (a === 'delete-voice-note') {
    creating.voiceClip = null;
    stopVoiceClip();
    render();
    toast('Voice note removed.');
  }
  else if (a === 'apply-nlp') {
    applyNlpSchedule(nlpSuggestion);
  }
  else if (a === 'hear-week-reflection') {
    toggleWeekReflection();
  }
  else if (a === 'save-reminder') {
    const inp = $('#taskInput');
    creating.task = inp ? inp.value : creating.task;
    saveReminder();
  }
  else if (a === 'edit-reminder') editReminder(id);
  else if (a === 'hear-reminder') {
    const r = find(id);
    if (r && r.voiceClip && r.voiceClip.data) {
      togglePreviewVoiceClip(r.voiceClip.data);
      toast("Playing personal voice note...");
    } else if (r) {
      const spokenPing = speech.t('ping', r.task);
      speech.say(spokenPing);
      toast(spokenPing);
    }
  }
  else if (a === 'complete') completeReminder(id);
  else if (a === 'quick-again') {}
  else if (a === 'remind-again') remindAgainSheet(id);
  else if (a === 'not-today') {
    notToday(id);
  }
  else if (a === 'confirm-delete') confirmDelete(id);
  else if (a === 'snooze') snoozeSheet(id);
  else if (a === 'toggle-setting') {
    state.settings.voice = !state.settings.voice; save(); render();
    if (state.settings.voice) { speech.say(speech.t('voiceOn')); toast('Voice reminders are on.'); }
    else toast('Voice reminders are off.');
  }
  else if (a === 'toggle-notifications') {
    const turningOn = !state.settings.notifications;
    if (turningOn && 'Notification' in window) {
      Notification.requestPermission().then(p => {
        state.settings.notifications = p === 'granted';
        state.settings.seenBanner = true;
        save(); render();
        toast(p === 'granted' ? 'Notifications are on.' : 'Notifications are blocked in your browser settings.');
      });
    } else {
      state.settings.notifications = false; state.settings.seenBanner = true;
      save(); render();
      if (!('Notification' in window)) toast('Notifications are not supported here.');
    }
  }
  else if (a === 'start-dictation') startDictation();
  else if (a === 'open-language') langSheet();
  else if (a === 'open-pace') paceSheet();
  else if (a === 'open-permissions-guide' || a === 'go-permissions') go('permissions');
  else if (a === 'about') go('about');
});

/* ---------- screen-side pickers (Theme / Voice / Timing pages) ---------- */
screensEl.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'pick-theme') {
    state.settings.theme = el.dataset.val || 'system';
    state.settings.themeExplicit = true;
    save();
    applyTheme();
    render();
  }
  else if (a === 'pick-personality') {
    const key = el.dataset.val || 'warm';
    state.settings.personality = key;
    save();

    const carousel = el.closest('.vp-carousel');
    if (carousel) {
      carousel.querySelectorAll('.vp-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.val === key);
      });
      const dotsWrap = carousel.nextElementSibling;
      if (dotsWrap && dotsWrap.classList.contains('vp-dots')) {
        const VOICE_ORDER = ['warm', 'buttery', 'airy', 'bold', 'mellow'];
        const idx = VOICE_ORDER.indexOf(key);
        dotsWrap.querySelectorAll('.vp-dot').forEach((dot, i) => {
          dot.classList.toggle('on', i === idx);
        });
      }
      centerSelectedVoice(true);
    } else {
      render();
      requestAnimationFrame(() => centerSelectedVoice(true));
    }
    /* auditioning a character always plays, even with reminders muted —
       otherwise there is no way to hear how two voices differ */
    speech.say(speech.introLine(), true);
  }
  else if (a === 'pick-timing') {
    state.settings.defaultTiming = el.dataset.timing; save(); back();
    toast(`Default timing set to ${el.dataset.timing.toLowerCase()}.`);
  }
  else if (a === 'audition-due') {
    speech.say(speech.auditionDue(), true);
    toast(`Auditioning ${speech.personality().name}'s reminder style`);
  }
  else if (a === 'pick-soundscape') {
    focusEngine.playSoundscape(el.dataset.sound);
    render();
  }
  else if (a === 'pick-focus-duration') {
    const mins = parseInt(el.dataset.min, 10);
    focusEngine.initialSec = mins * 60;
    if (focusEngine.state === 'stopped') focusEngine.timerSec = mins * 60;
    render();
  }
  else if (a === 'focus-start') {
    const input = document.getElementById('focusPageTimeInput');
    if (input) commitFocusInputTime(input);
    focusEngine.start(null, focusEngine.activeType);
    render();
  }
  else if (a === 'focus-pause') {
    focusEngine.pause();
    render();
  }
  else if (a === 'focus-resume') {
    focusEngine.resume();
    render();
  }
  else if (a === 'focus-stop') {
    focusEngine.stop();
    render();
    toast('Focus session ended.');
  }
});

// input binding (task field survives re-renders)
screensEl.addEventListener('input', e => {
  if (e.target.dataset.actionInput === 'task') {
    creating.task = e.target.value;
    nlpSuggestion = parseNaturalSchedule(e.target.value);
    const wrap = document.getElementById('nlpChipWrap');
    if (wrap) {
      wrap.innerHTML = nlpSuggestion ?
        `<div class="nlp-suggestion-chip" data-action="apply-nlp">${I.sparkle(13)}<span>${T('detected') || 'Detected'}: <strong>${esc(nlpSuggestion.summary)}</strong> · ${T('tapToApply') || 'Tap to apply'}</span></div>` : '';
    }
  }
});

function parseDurationInput(val) {
  if (!val) return null;
  val = String(val).trim().toLowerCase();
  if (val.includes('h')) {
    const hrs = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (!isNaN(hrs) && hrs > 0) return Math.round(hrs * 3600);
  }
  if (val.includes(':')) {
    const parts = val.split(':');
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    const total = mins * 60 + secs;
    return total > 0 ? total : 60;
  }
  const num = parseFloat(val.replace(/[^0-9.]/g, ''));
  if (!isNaN(num) && num > 0) {
    return Math.round(num * 60);
  }
  return null;
}

function commitFocusInputTime(input) {
  if (!input) return;
  const parsed = parseDurationInput(input.value);
  if (parsed && parsed > 0) {
    focusEngine.initialSec = parsed;
    if (focusEngine.state === 'stopped') {
      focusEngine.timerSec = parsed;
    }
    input.value = focusEngine.fmt(focusEngine.timerSec);
    const curMin = Math.round(parsed / 60);
    document.querySelectorAll('[data-action="pick-focus-duration"]').forEach(chip => {
      const m = parseInt(chip.dataset.min, 10);
      chip.classList.toggle('selected', m === curMin && parsed % 60 === 0);
    });
  } else {
    input.value = focusEngine.fmt(focusEngine.timerSec);
  }
}

screensEl.addEventListener('focusin', e => {
  if (e.target && e.target.id === 'focusPageTimeInput') {
    e.target.select();
    e.target.addEventListener('blur', () => commitFocusInputTime(e.target), { once: true });
  }
});

screensEl.addEventListener('change', e => {
  if (e.target && e.target.id === 'focusPageTimeInput') {
    commitFocusInputTime(e.target);
  }
});

screensEl.addEventListener('keydown', e => {
  if (e.target && e.target.id === 'focusPageTimeInput' && e.key === 'Enter') {
    commitFocusInputTime(e.target);
    e.target.blur();
  }
});

const devEl = document.getElementById('device');
if (devEl) {
  devEl.addEventListener('click', e => {
    if (focusMiniJustDragged) return;
    const mini = e.target.closest('#focusMiniBar');
    if (!mini) return;
    const el = e.target.closest('[data-action]');
    if (el && mini.contains(el)) {
      const a = el.dataset.action;
      if (a === 'open-focus' || a === 'nav-focus') go('focus');
      else if (a === 'focus-pause') focusEngine.pause();
      else if (a === 'focus-resume') focusEngine.resume();
      else if (a === 'focus-stop') {
        focusEngine.stop();
        toast('Focus session ended.');
      }
    } else {
      go('focus');
    }
  });
}

// active takeover screen actions handled by the main delegation above

function buildNotificationBody(r) {
  const l = state.settings.lang || 'en';
  const isAction = isActionVerbTask(r.task, l);
  const t = fmtTime(r.when);
  const f = isAction ? r.task.charAt(0).toLowerCase() + r.task.slice(1) : r.task;
  if (l === 'es') {
    return isAction ? `Son las ${t} — hora de ${f}.` : `Son las ${t} — ${r.task}.`;
  }
  if (l === 'fr') {
    return isAction ? `Il est ${t} — l'heure de ${f}.` : `Il est ${t} — ${r.task}.`;
  }
  if (l === 'de') {
    return isAction ? `Es ist ${t} — Zeit für: ${r.task}.` : `Es ist ${t} — ${r.task}.`;
  }
  if (l === 'pt') {
    return isAction ? `São ${t} — hora de ${f}.` : `São ${t} — ${r.task}.`;
  }
  return isAction ? `Hey, it's ${t} — time to ${f}.` : `Hey, it's ${t} — ${r.task}.`;
}

function notifyIfNeeded(r) {
  if (!state.settings.notifications) return;
  if (document.visibilityState === 'visible') return;

  const title = 'Recall';
  const options = {
    body: buildNotificationBody(r),
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: `reminder-${r.id}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { id: r.id }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, options).catch(() => fallbackNotif(title, options, r));
    }).catch(() => fallbackNotif(title, options, r));
  } else {
    fallbackNotif(title, options, r);
  }
}

function fallbackNotif(title, options, r) {
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      state.activeId = r.id;
      active = r;
      openActive(r);
    };
  } catch (e) {}
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'OPEN_REMINDER' && e.data.id) {
      const r = find(e.data.id);
      if (r) {
        state.activeId = r.id;
        active = r;
        openActive(r);
      }
    }
  });
}

/* ---------- hardware back, swipe back, keyboard & typing feel ---------- */
function closeTopOverlay() {
  const ovs = Array.from(document.querySelectorAll('#overlays > .sheet-overlay, #overlays > .clock-overlay'));
  if (!ovs.length) return false;
  const el = ovs[ovs.length - 1];
  el.remove();
  if (el.classList.contains('clock-overlay')) { dateState = null; clockState = null; }
  return true;
}
window.addEventListener('popstate', () => {
  const d = histD();
  if (closeTopOverlay()) {            // back closes a sheet before leaving the screen
    pushHist();                       // stay here, and keep back working
    return;
  }
  if (d < navStack.length - 1) {      // land exactly on the screen that entry owns
    while (navStack.length - 1 > d) navStack.pop();
    render('back');
  } else if (d > navStack.length - 1) {
    /* a forward jump into a stale entry: keep the entry honest */
    try { history.replaceState({ d: navStack.length - 1 }, ''); } catch (e) {}
  }
  /* at home there is nothing left to pop — the browser leaves the app */
});

/* swipe in from the left edge to go back, like a native gesture */
let swipe = null;
document.addEventListener('touchstart', e => {
  if (navStack.length <= 1 || active || document.querySelector('#overlays > *')) { swipe = null; return; }
  const t = e.touches[0];
  if (!t || t.clientX > 32) { swipe = null; return; }
  swipe = { x0: t.clientX, y0: t.clientY, dx: 0, el: screensEl.querySelector('.screen') };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!swipe) return;
  const t = e.touches[0]; if (!t) return;
  const dx = t.clientX - swipe.x0, dy = t.clientY - swipe.y0;
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) { swipe = null; return; }   // that was a scroll
  if (dx <= 0) return;
  swipe.dx = dx;
  if (swipe.el) { swipe.el.style.transition = 'none'; swipe.el.style.transform = `translateX(${dx}px)`; }
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!swipe) return;
  const s = swipe; swipe = null;
  const el = s.el; if (!el) return;
  if (s.dx > 90) {
    el.style.transition = 'transform .16s ease-out, opacity .16s ease-out';
    el.style.transform = 'translateX(100%)';
    el.style.opacity = '.7';
    setTimeout(() => { el.style.cssText = ''; back(); }, 150);
  } else {
    el.style.transition = 'transform .18s ease-out';
    el.style.transform = 'translateX(0)';
  }
}, { passive: true });
document.addEventListener('touchcancel', () => { swipe = null; }, { passive: true });

/* keep the save dock, sheets and toasts above the on-screen keyboard */
function syncKeyboard() {
  const vv = window.visualViewport;
  const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  document.documentElement.style.setProperty('--kb', Math.round(kb) + 'px');
  const dev = document.getElementById('device');
  if (dev) dev.classList.toggle('kb-open', kb > 90);
}
if (window.visualViewport) {
  visualViewport.addEventListener('resize', syncKeyboard);
  visualViewport.addEventListener('scroll', syncKeyboard);
}
screensEl.addEventListener('focusin', e => {
  const t = e.target;
  if (!t || !t.matches || !t.matches('input,textarea')) return;
  setTimeout(() => {
    syncKeyboard();
    if (t.closest('.screen-scroll') && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 260);
});
screensEl.addEventListener('focusout', () => setTimeout(syncKeyboard, 140));
/* return saves the reminder, like the keyboard's Done key */
screensEl.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.dataset || e.target.dataset.actionInput !== 'task') return;
  e.preventDefault();
  creating.task = e.target.value;
  e.target.blur();
  saveReminder();
});

/* ---------- boot ---------- */
if ('Notification' in window && Notification.permission === 'granted') state.settings.notifications = true;
applyTheme();
render();
syncKeyboard();

// First-time permission trigger: prompt new users gently on first opening
setTimeout(() => {
  if (!state.settings.seenPermissionPrompt && (!('Notification' in window) || Notification.permission !== 'granted')) {
    openPermissionPromptSheet();
  }
}, 700);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  tick();
  if (!active && !document.querySelector('#overlays > *')) render();
});
/* keep the greeting / Today / Tomorrow labels honest while the app sits open */
setInterval(() => {
  if (document.visibilityState !== 'visible' || active) return;
  const cur = navStack[navStack.length - 1];
  if (cur && cur.name === 'home' && !document.querySelector('#overlays > *')) render();
}, 30000);
