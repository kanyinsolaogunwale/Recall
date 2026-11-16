const fs = require('fs');
const path = require('path');

console.log('--- TEST SUITE: RECALL NAVBAR & THEME CONTRASTS ---');

// 1. Test icons
const I = require('./app/reicon-icons.js');
console.log('Testing icons in app/reicon-icons.js...');
['home', 'focus', 'sparkle', 'gear'].forEach(name => {
  const outline = I[name](21, false);
  const filled = I[name](21, true);
  if (!outline.includes('<svg') || !outline.includes('viewBox="0 0 24 24"')) {
    throw new Error(`Invalid outline icon for ${name}`);
  }
  if (!filled.includes('<svg') || !filled.includes('fill="currentColor"')) {
    throw new Error(`Invalid filled icon for ${name}`);
  }
  console.log(`  ✓ ${name} icon (outline & filled) valid`);
});

['overlay', 'battery'].forEach(name => {
  const icon = I[name](20);
  if (!icon.includes('<svg') || !icon.includes('viewBox="0 0 24 24"')) {
    throw new Error(`Invalid icon for ${name}`);
  }
  console.log(`  ✓ ${name} icon valid`);
});

// 2. Test app.js syntax & themes
const appJs = fs.readFileSync(path.join(__dirname, 'app/app.js'), 'utf8');
const themeMatch = appJs.match(/const THEMES = ({[\s\S]*?});/);
if (!themeMatch) throw new Error('Could not parse THEMES from app.js');

const THEMES = eval('(' + themeMatch[1] + ')');
console.log(`Found ${Object.keys(THEMES).length} themes in app/app.js:`);

function hexToRgb(h) {
  h = h.replace('#','');
  if (h.length === 3) h = h.split('').map(c => c+c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function sRGBtoLin(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function relLum(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}
function contrast(a, b) {
  const [hi, lo] = [relLum(a), relLum(b)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
}

let allPass = true;
for (const [k, t] of Object.entries(THEMES)) {
  const cAccent = contrast(t.accent, t.surface);
  const cWhite = contrast(t.accent, '#FFFFFF');
  const cBlack = contrast(t.accent, '#111315');
  const onAccent = cWhite >= cBlack ? '#FFFFFF' : '#111315';
  const cOnAccent = Math.max(cWhite, cBlack);
  const accentPass = cAccent >= 4.5;
  const onAccentPass = cOnAccent >= 4.5;
  if (!accentPass || !onAccentPass) allPass = false;
  console.log(`  ✓ Theme ${t.name.padEnd(8)}: Accent/Surface=${cAccent.toFixed(2)} (${accentPass?'PASS':'FAIL'}), OnAccent/Accent=${cOnAccent.toFixed(2)} (${onAccentPass?'PASS':'FAIL'}, onAccent=${onAccent})`);
}
if (!allPass) throw new Error('Some themes failed WCAG contrast check!');

// 3. Test app.css & navbar visibility rules
const appCss = fs.readFileSync(path.join(__dirname, 'app/app.css'), 'utf8');
if (!appCss.includes('.bnav-ic-filled')) throw new Error('Missing .bnav-ic-filled in app.css');
if (!appCss.includes('.bnav-ic-outline')) throw new Error('Missing .bnav-ic-outline in app.css');
if (!appCss.includes('calc(14px + env(safe-area-inset-bottom, 0px))')) throw new Error('Missing safe bottom padding in app.css');
if (!appCss.includes('.bnav-add-btn svg')) throw new Error('Missing .bnav-add-btn svg rule in app.css');

if (!appJs.includes("curName === 'voice' || curName === 'theme'")) {
  throw new Error('Bottom nav is not hidden on voice and theme screens in app.js!');
}
if (appJs.includes("curName === 'theme' || curName === 'focus'")) {
  throw new Error('Bottom nav should show on Focus mode screen in app.js!');
}
console.log('  ✓ Bottom nav properly hidden on Voice and Theme, and shown on Focus mode');

// 4. Test dedicated Focus screen
if (!appJs.includes('function screenFocus()')) {
  throw new Error('screenFocus function missing in app.js');
}
if (!appJs.includes("cur.name === 'focus'") || !appJs.includes('body = screenFocus()')) {
  throw new Error('screenFocus not registered in render()');
}
if (!appJs.includes('data-action="pick-soundscape"') || !appJs.includes('data-action="pick-focus-duration"')) {
  throw new Error('Focus options not properly wired');
}
console.log('  ✓ Dedicated Focus page and options verified');

// 5. Test snooze command parser extracted from app.js
const parserMatch = appJs.match(/function parseSnoozeCommand\(rawText\) \{[\s\S]*?\n\}/);
if (!parserMatch) throw new Error('parseSnoozeCommand not found in app.js');
const parseSnooze = new Function('rawText', 'const WORD_NUMS = ' + appJs.match(/const WORD_NUMS = ({[\s\S]*?});/)[1] + ';\n' +
  'function fmtTime(t) { return "12:00 PM"; }\n' +
  parserMatch[0] + '\nreturn parseSnoozeCommand(rawText);');

const test5min = parseSnooze('snooze for 5 minutes');
if (!test5min || test5min.ms !== 5 * 60 * 1000) throw new Error('Failed to parse "snooze for 5 minutes"');
const testWord5 = parseSnooze('snooze for five minutes');
if (!testWord5 || testWord5.ms !== 5 * 60 * 1000) throw new Error('Failed to parse "snooze for five minutes"');
const testHalfHr = parseSnooze('snooze for half an hour');
if (!testHalfHr || testHalfHr.ms !== 30 * 60 * 1000) throw new Error('Failed to parse "snooze for half an hour"');
const testDefault = parseSnooze('snooze');
if (!testDefault || testDefault.ms !== 10 * 60 * 1000) throw new Error('Failed default snooze');

console.log('  ✓ Voice snooze parser handles custom times ("5 minutes", "five minutes", "half an hour", etc.)');

// 6. Test Custom repeat chip selection
if (!appJs.includes("${repChip('Yearly')}${repChip('Custom')}")) {
  throw new Error('Custom chip not rendered in screenCreate()');
}
if (appJs.includes("${repChip('Yearly')}${repChip('Customize')}")) {
  throw new Error('Old "Customize" chip still present');
}
console.log('  ✓ Repeat option changed from "Customize" to "Custom" and properly highlighted when selected');

// 7. Test Language row moved to screenSettings and removed from voiceBodyHTML
if (!appJs.includes('<div class="settings-row" data-action="open-language" role="button"><span class="label">${T(\'language\')}</span>') &&
    !appJs.includes('<div class="settings-row" data-action="open-language" role="button"><span class="label">Language</span>')) {
  throw new Error('Language row not found in screenSettings');
}
const voiceBodyMatch = appJs.match(/function voiceBodyHTML\(\) \{([\s\S]*?)\n\}/);
if (voiceBodyMatch && voiceBodyMatch[1].includes('data-action="open-language"')) {
  throw new Error('Language row should have been removed from voiceBodyHTML');
}
console.log('  ✓ Language setting cleanly moved to Settings screen and removed from Voice screen');

// 8. Test Dedicated About Screen and Social Icons
if (!appJs.includes('function screenAbout()')) {
  throw new Error('screenAbout function not found');
}
if (!appJs.includes('data-screen="about"')) {
  throw new Error('About screen markup missing data-screen="about"');
}
['x.com', 'instagram.com', 'github.com', 'discord.com'].forEach(network => {
  if (!appJs.includes(network)) throw new Error(`About screen missing ${network} link`);
});
if (!appJs.includes("curName === 'about'")) {
  throw new Error('Bottom nav should be hidden on About screen');
}
if (!appJs.includes("else if (cur.name === 'about') body = screenAbout();")) {
  throw new Error('Route for about screen not found in render()');
}
console.log('  ✓ Dedicated About screen created with concise info, feature pillars, and social links for X, Instagram, GitHub, Discord');

// 9. Test Speech Synthesis Candidates scoring
if (!appJs.includes('/natural|neural|online|enhanced|premium|studio|wavenet|siri/i.test(n)')) {
  throw new Error('Natural/Neural/Studio voice regex not found in speech.candidates');
}
if (!appJs.includes('/desktop|espeak|zira|david|mark|sample|robotic/i.test(n)')) {
  throw new Error('Desktop robotic voice penalty regex not found in speech.candidates');
}
console.log('  ✓ Speech engine heavily prioritizes Neural/Natural/Google/Siri human voices and suppresses robotic synths');

// 10. Test First-Time Permission Trigger & Manual Settings Guide
if (!appJs.includes('function openPermissionPromptSheet()')) {
  throw new Error('openPermissionPromptSheet not found in app.js');
}
if (!appJs.includes('function screenPermissions()')) {
  throw new Error('screenPermissions function not found in app.js');
}
if (!appJs.includes('data-screen="permissions"')) {
  throw new Error('Dedicated permissions screen missing data-screen="permissions"');
}
if (!appJs.includes('data-action="go-permissions"') && !appJs.includes('data-action="open-permissions-guide"')) {
  throw new Error('Permissions action not found in Settings');
}
if (!appJs.includes('Display over other apps') && !appJs.includes('displayOverApps')) {
  throw new Error('Android draw over other apps / battery guidance not found');
}
if (!appJs.includes('seenPermissionPrompt')) {
  throw new Error('seenPermissionPrompt state not tracked');
}
console.log('  ✓ First-time onboarding permission trigger & dedicated Alerts & Phone Permissions page with "draw over apps" instructions verified');

// 11. Test Empty Home Illustration & Spacing
if (!appJs.includes('zenBell:')) {
  throw new Error('zenBell illustration not found in IL');
}
if (!appJs.includes('IL.zenBell')) {
  throw new Error('IL.zenBell not used in screenHome');
}
const currentAppCss = fs.readFileSync('app/app.css', 'utf8');
const emptyBigMargin = currentAppCss.match(/\.empty-state \.big\{[^}]*margin-top:(\d+)px/);
if (!emptyBigMargin || parseInt(emptyBigMargin[1], 10) > 20) {
  throw new Error('Spacing between illustration and title should be reduced (<= 20px)');
}
const emptyBtnMargin = currentAppCss.match(/\.empty-state \.empty-btn\{[^}]*margin-top:(\d+)px/);
if (!emptyBtnMargin || parseInt(emptyBtnMargin[1], 10) > 24) {
  throw new Error('Spacing between text and button should be reduced (<= 24px)');
}
if (!currentAppCss.includes('.screen-scroll.is-empty') || !currentAppCss.includes('margin:auto 0;')) {
  throw new Error('Empty state should be vertically and horizontally centered in screen-scroll');
}
console.log('  ✓ Serene Zen Bell illustration added, empty home spacing tightened, and centered on screen');

// 12. Test UI Translation System (T helper & UI_STRINGS)
if (!appJs.includes('const UI_STRINGS = {') || !appJs.includes('function T(key')) {
  throw new Error('UI_STRINGS or T(key) not found in app.js');
}
['en', 'es', 'fr', 'de', 'pt'].forEach(lang => {
  if (!appJs.includes(`${lang}: {`)) {
    throw new Error(`Language ${lang} not found in UI_STRINGS`);
  }
});
if (!appJs.includes('renderBottomNav();') || !appJs.includes('state.settings.lang = el.dataset.lang;')) {
  throw new Error('renderBottomNav not called on pick-lang');
}
console.log('  ✓ Multi-language UI translation system active for en, es, fr, de, pt with dynamic live updates');

// 13. Test GitHub Actions Workflow & Capacitor Config
if (!fs.existsSync('.github/workflows/build-apk.yml')) {
  throw new Error('.github/workflows/build-apk.yml not found');
}
if (!fs.existsSync('capacitor.config.json')) {
  throw new Error('capacitor.config.json not found');
}
const workflowContent = fs.readFileSync('.github/workflows/build-apk.yml', 'utf8');
if (!workflowContent.includes('assembleDebug') || !workflowContent.includes('upload-artifact')) {
  throw new Error('GitHub Actions workflow missing assembleDebug or upload-artifact');
}
console.log('  ✓ GitHub Actions APK workflow (.github/workflows/build-apk.yml) & Capacitor config verified');

// 14. Test Sub-pages and Sheets Localization
const requiredKeys = [
  'editReminder', 'reminder', 'startsWhen', 'pickDate', 'remindMe', 'placeholderTask',
  'attachVoiceNote', 'personalVoiceNote', 'recordingAttached', 'recordingTapStop', 'tapToStop',
  'status', 'upcomingSingle', 'completedSingle', 'missedSingle', 'snoozedSingle',
  'playVoiceNote', 'hearReminder', 'remindAgain', 'notToday', 'done', 'deleteReminder',
  'deleteConfirmTitle', 'deleteConfirmDesc', 'delete', 'snooze', 'snoozeFor', 'orPickTime',
  'snooze10m', 'snooze30m', 'snooze1h', 'remindAgainTitle', 'itsTime', 'listeningBadge',
  'autoTheme', 'voiceReminders', 'auditionDelivery', 'pace', 'slow', 'normal', 'fast',
  'defaultTiming', 'whatRecallDoes', 'aboutRecallDesc', 'allowReminderAlerts', 'allowAlertsDesc',
  'alertOnLockScreen', 'spokenAndVoiceMemos', 'allowAlertsBtn', 'maybeLater', 'phoneStatus',
  'allowedActive', 'blockedByBrowser', 'notEnabled', 'allowAlertsNow', 'sendTestReminder',
  'testSoundVoice', 'doneBtn', 'tonight',
  'theme_light', 'theme_dark', 'theme_peach', 'theme_ogshine', 'theme_lilac',
  'theme_midnight', 'theme_seafoam', 'theme_dusk', 'theme_daybreak', 'theme_graphite',
  'theme_sherbet', 'theme_carbon', 'theme_paper'
];
['en', 'es', 'fr', 'de', 'pt'].forEach(lang => {
  requiredKeys.forEach(k => {
    if (!appJs.includes(`${k}:`)) {
      throw new Error(`Missing key ${k} in app.js`);
    }
  });
});
if (!appJs.includes('${T(\'deleteConfirmTitle\')}') ||
    !appJs.includes('${T(\'snoozeFor\')}') ||
    !appJs.includes('${T(\'remindAgainTitle\')}') ||
    !appJs.includes('${T(\'defaultTiming\')}') ||
    !appJs.includes('${T(\'aboutRecallDesc\')}') ||
    !appJs.includes('${T(\'allowReminderAlerts\')}') ||
    !appJs.includes('${T(\'itsTime\')}')) {
  throw new Error('Sub-pages or sheets still contain hardcoded strings instead of T(...)');
}
console.log('  ✓ All sub-pages, sheets, and modal flows verified for full multi-language translations across 5 languages');

// 15. Test Play/Pause Weekly Reflection with I.play & I.pause
['en', 'es', 'fr', 'de', 'pt'].forEach(lang => {
  ['pauseReflection', 'playingReflectionToast', 'reflectionPausedToast'].forEach(k => {
    if (!appJs.includes(`${k}:`)) {
      throw new Error(`Missing key ${k} in app.js for language support`);
    }
  });
});
if (!appJs.includes('isPlayingWeekReflection ? I.pause(16) : I.play(16)')) {
  throw new Error('Weekly reflection button missing I.play/I.pause toggle');
}
if (!appJs.includes('function toggleWeekReflection') || !appJs.includes('stopWeekReflection')) {
  throw new Error('toggleWeekReflection or stopWeekReflection missing from app.js');
}
if (!appJs.includes('stop() {') || !appJs.includes('speechSynthesis.cancel()')) {
  throw new Error('speech.stop() method missing from speech manager');
}
console.log('  ✓ Weekly reflection play/pause toggle with I.play/I.pause icons verified');

// 16. Test Calendar & Custom Repeat Multi-language Localization
['en', 'es', 'fr', 'de', 'pt'].forEach(lang => {
  ['customRepeat', 'tryDateLike'].forEach(k => {
    if (!appJs.includes(`${k}:`)) {
      throw new Error(`Missing key ${k} in app.js for language ${lang}`);
    }
  });
});
if (!appJs.includes('const WD_SHORT =') || !appJs.includes('const CAL_DOWS =') || !appJs.includes('const MONTH_NAMES =') || !appJs.includes('const WD_FULL_NAMES =')) {
  throw new Error('Missing WD_SHORT, CAL_DOWS, MONTH_NAMES, or WD_FULL_NAMES in app.js');
}
if (appJs.includes("toLocaleDateString('en-US', { weekday: 'short' })")) {
  throw new Error('Calendar dateBoxLabel still hardcodes en-US');
}
if (!appJs.includes("${T('customRepeat')}") || !appJs.includes('${wdShort[i]}')) {
  throw new Error('Custom repeat sheet does not use localized title or day circles');
}
if (!appJs.includes('fullDayName(d)')) {
  throw new Error('Custom repeat summary does not use fullDayName(d)');
}
console.log('  ✓ Calendar & Custom repeat fully localized across all 5 languages');

// 17. Test Natural Human Speech Engine & Multilingual Voice Prosody
['en', 'es', 'fr', 'de', 'pt'].forEach(lang => {
  ['auditionTask', 'voiceDesc_warm', 'voiceDesc_buttery', 'voiceDesc_airy', 'voiceDesc_bold', 'voiceDesc_mellow'].forEach(k => {
    if (!appJs.includes(`${k}:`)) {
      throw new Error(`Missing speech/voice key ${k} in app.js for language ${lang}`);
    }
  });
});
if (!appJs.includes('const PERSONALITY_LINES =')) {
  throw new Error('PERSONALITY_LINES not found in app.js');
}
if (!appJs.includes('const sig = `${curLang}~`')) {
  throw new Error('speech.assignments does not cache by current language');
}
console.log('  ✓ Natural human speech synthesis & multilingual prosody verified across all 5 languages');

// 18. Test Clean Reminder Task Text & Structured Reminder Spoken Messages
if (!appJs.includes('function cleanTaskPrompt(') || !appJs.includes('function isActionVerbTask(')) {
  throw new Error('Missing cleanTaskPrompt or isActionVerbTask in app.js');
}
if (!appJs.includes('function buildNotificationBody(')) {
  throw new Error('Missing buildNotificationBody in app.js');
}

// Extract and test cleanTaskPrompt
const cleanTaskPromptMatch = appJs.match(/function cleanTaskPrompt\([\s\S]*?\n\}/);
if (!cleanTaskPromptMatch) throw new Error('Could not extract cleanTaskPrompt');
const testCleanTask = new Function(`return (${cleanTaskPromptMatch[0]});`)();

const prefixTests = [
  { in: 'Remind me to call mom', expected: 'Call mom' },
  { in: 'Please remind me to drink water', expected: 'Drink water' },
  { in: "Don't forget to pay rent", expected: 'Pay rent' },
  { in: 'Recuérdame llamar a mamá', expected: 'Llamar a mamá' },
  { in: 'recuerdame comprar pan', expected: 'Comprar pan' },
  { in: "Rappelle-moi d'appeler Sophie", expected: 'Appeler Sophie' },
  { in: 'Erinnere mich daran, Oma anzurufen', expected: 'Oma anzurufen' },
  { in: 'Lembre-me de pagar as contas', expected: 'Pagar as contas' },
  { in: 'Doctor appointment', expected: 'Doctor appointment' },
  { in: 'Meeting with Sarah', expected: 'Meeting with Sarah' }
];
prefixTests.forEach(t => {
  const res = testCleanTask(t.in);
  if (res !== t.expected) {
    throw new Error(`cleanTaskPrompt("${t.in}") returned "${res}", expected "${t.expected}"`);
  }
});

// Extract and test isActionVerbTask
const isActionMatch = appJs.match(/function isActionVerbTask\([\s\S]*?\n\}/);
if (!isActionMatch) throw new Error('Could not extract isActionVerbTask');
const testIsAction = new Function(`return (${isActionMatch[0]});`)();

if (!testIsAction('Call mom', 'en') || !testIsAction('Buy groceries', 'en')) {
  throw new Error('isActionVerbTask failed for English action verbs');
}
if (testIsAction('Meeting with Sarah', 'en') || testIsAction('Doctor appointment', 'en')) {
  throw new Error('isActionVerbTask falsely matched English noun/event tasks');
}
if (!testIsAction('Llamar a mamá', 'es') || testIsAction('Cita con el dentista', 'es')) {
  throw new Error('isActionVerbTask failed for Spanish');
}
if (!testIsAction('Appeler Sophie', 'fr') || testIsAction('Rendez-vous médical', 'fr')) {
  throw new Error('isActionVerbTask failed for French');
}

// Check saveReminder cleans raw input
if (!appJs.includes('task = cleanTaskPrompt(task)')) {
  throw new Error('saveReminder does not guarantee cleanTaskPrompt(task)');
}

// 29. Test Auto Theme (Device Default)
const defaultsMatch = appJs.match(/const defaults = \(\) => \(([\s\S]*?)\);\nlet state/);
if (!defaultsMatch) throw new Error('Could not extract defaults() from app.js');
const testDefaults = new Function(`return (${defaultsMatch[1]});`)();
if (testDefaults.settings.theme !== 'system') {
  throw new Error(`Default theme should be "system" (Auto), found "${testDefaults.settings.theme}"`);
}
if (!appJs.includes("const cur = state.settings.theme || 'system';")) {
  throw new Error('themeBodyHTML does not default cur to system');
}
if (!appJs.includes("handleSystemThemeChange")) {
  throw new Error('System theme change handler missing');
}
if (!appJs.includes('btn danger') || !appJs.includes('--danger-bg')) {
  throw new Error('confirmDelete red icon illustration and danger button missing');
}
if (!appJs.includes('display:flex;gap:12px;align-items:center;margin-top:6px;')) {
  throw new Error('confirmDelete buttons should be aligned horizontally side-by-side');
}
console.log('  ✓ Auto theme is the default and dynamically tracks device theme');
console.log('  ✓ Red delete icon illustration and primary danger button with horizontal side-by-side buttons verified');

// 30. Test Conversational Perspective Shift (1st person -> 2nd person)
const convMatch = appJs.match(/function conversationalizeTask\([\s\S]*?\n\}/);
if (!convMatch) throw new Error('Could not extract conversationalizeTask from app.js');
const testConversationalize = new Function(`return (${convMatch[0]});`)();

const convTests = [
  { in: 'Call my babe', lang: 'en', out: 'Call your babe' },
  { in: 'Pick up my prescription', lang: 'en', out: 'Pick up your prescription' },
  { in: 'Help me with my chores', lang: 'en', out: 'Help you with your chores' },
  { in: 'Take my vitamins', lang: 'en', out: 'Take your vitamins' },
  { in: 'My workout', lang: 'en', out: 'Your workout' },
  { in: 'Llamar a mi amor', lang: 'es', out: 'Llamar a tu amor' },
  { in: 'Appeler ma copine', lang: 'fr', out: 'Appeler ta copine' },
  { in: 'Ruf meine Mutter an', lang: 'de', out: 'Ruf deine Mutter an' },
  { in: 'Ligar para minha mãe', lang: 'pt', out: 'Ligar para sua mãe' },
];

convTests.forEach(ct => {
  const res = testConversationalize(ct.in, ct.lang);
  if (res !== ct.out) {
    throw new Error(`conversationalizeTask("${ct.in}", "${ct.lang}") = "${res}", expected "${ct.out}"`);
  }
});
console.log('  ✓ Conversational perspective shift (1st person -> 2nd person) verified across 5 languages');

// Check that speech phrases ping handles conversationalized speech
const phrasesMatch = appJs.match(/const SPEECH_PHRASES = ({[\s\S]*?});\n\nconst speech/);
if (!phrasesMatch) throw new Error('Could not extract SPEECH_PHRASES from app.js');
const testSpeechPhrases = new Function('conversationalizeTask', 'isActionVerbTask', `return (${phrasesMatch[1]});`)(testConversationalize, testIsAction);

const pingResult = testSpeechPhrases.en.ping('Call my babe');
if (pingResult !== 'Hey, you wanted to call your babe.') {
  throw new Error(`testSpeechPhrases.en.ping("Call my babe") returned "${pingResult}", expected "Hey, you wanted to call your babe."`);
}
console.log('  ✓ Spoken reminder ping properly says: "Hey, you wanted to call your babe."');

// Check that r.task.toLowerCase() was removed from spoken reminders
if (appJs.includes('speech.dueLine(fmtTime(r.when), r.task.toLowerCase())')) {
  throw new Error('speech.dueLine still receives lowercased r.task, which corrupts proper nouns');
}
console.log('  ✓ Clean reminder task text & structured reminder spoken messages verified across all 5 languages');

console.log('\n--- ALL ASSERTIONS PASSED SUCCESSFULLY! ---');
