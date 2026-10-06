export const STORAGE_KEY = 'cue.session.v1';
export const KIND_LABELS = { auto: 'Auto-detect', 'multiple-choice': 'Multiple choice', written: 'Written response', numerical: 'Numerical reasoning', coding: 'Coding problem', situational: 'Situational judgment' };
export function question(text = '', kind = 'auto') {
  return { id: crypto.randomUUID(), text, kind, draft: '', answer: '', followups: [], flagged: false, reviewed: false, sample: false, stale: false, usage: 0 };
}
export function freshWorkspace() { const q = question(); return { title: '', items: [q], selected: q.id }; }
export function initialState() {
  return { version: 1, mode: 'assessment', context: '', preferences: { language: 'English', codeLanguage: 'Python', autoAnswer: true }, workspaces: { assessment: freshWorkspace(), interview: freshWorkspace() } };
}
export function parseSession(value) {
  if (!value || value.version !== 1 || !value.workspaces) throw new Error('This is not a Cue session export.');
  const state = initialState();
  state.mode = value.mode === 'interview' ? 'interview' : 'assessment';
  state.context = typeof value.context === 'string' ? value.context.slice(0, 12000) : '';
  for (const key of ['language', 'codeLanguage']) if (typeof value.preferences?.[key] === 'string') state.preferences[key] = value.preferences[key].slice(0, 40);
  state.preferences.autoAnswer = value.preferences?.autoAnswer !== false;
  for (const mode of ['interview', 'assessment']) {
    const w = value.workspaces[mode];
    if (!w || !Array.isArray(w.items) || w.items.length > 100) throw new Error('Invalid session: each workspace supports up to 100 questions.');
    const oldIndex = w.items.findIndex(q => q.id === w.selected);
    const items = w.items.map(q => {
      if (!q || typeof q.text !== 'string') throw new Error('Invalid question in session.');
      const clean = question(q.text.slice(0, 30000), Object.hasOwn(KIND_LABELS, q.kind) ? q.kind : 'auto');
      for (const key of ['draft', 'answer']) clean[key] = typeof q[key] === 'string' ? q[key].slice(0, 60000) : '';
      clean.flagged = q.flagged === true; clean.reviewed = q.reviewed === true; clean.sample = q.sample === true;
      clean.stale = q.stale === true;
      clean.followups = (Array.isArray(q.followups) ? q.followups : []).slice(-20).filter(f => typeof f?.question === 'string' && typeof f?.answer === 'string').map(f => ({ question: f.question.slice(0, 3000), answer: f.answer.slice(0, 30000) }));
      clean.usage = Number.isFinite(q.usage) ? Math.max(0, q.usage) : 0;
      return clean;
    });
    if (!items.length) items.push(question());
    state.workspaces[mode] = { title: typeof w.title === 'string' ? w.title.slice(0, 100) : '', items, selected: items[Math.max(0, oldIndex)]?.id || items[0].id };
  }
  return state;
}
export function exportSession(state) {
  const safe = parseSession(state);
  return JSON.stringify({ ...safe, exportedAt: new Date().toISOString() }, null, 2);
}
export function samples(mode) {
  if (mode === 'interview') {
    const q = question('Tell me about a time you diagnosed a difficult technical issue.', 'written');
    q.sample = true;
    q.answer = '## Build your answer around one real incident\n\nUse this structure and replace the brackets with your own experience.\n\n**Situation:** We were experiencing [specific issue] that affected [users or workflow].\n\n**Task:** My responsibility was to [your actual responsibility].\n\n**Action:** I reproduced the issue, checked [relevant evidence], and isolated [root cause]. I then [your action] and verified the result with [check].\n\n**Result:** The change led to [an outcome you can substantiate].\n\n## Likely follow-up\nWhat evidence helped you rule out your first hypothesis?';
    return [q];
  }
  const a = question('A user can reach websites by IP address but cannot open them by domain name. Other users are unaffected. What should you check FIRST?\n\nA. Replace the Ethernet cable\nB. Check the device’s DNS configuration\nC. Reinstall the operating system\nD. Increase the firewall timeout', 'multiple-choice');
  a.answer = '## B. Check the device’s DNS configuration\n\nIP connectivity works, but name-based access fails. That points to name resolution on the affected device.\n\n## How to verify\n1. Check which DNS servers the device is using.\n2. Run `nslookup example.com` and inspect the response.\n3. Compare its DNS settings with a working device.\n\n## Why the other choices do not fit\n- **A:** A cable fault would not usually distinguish IP addresses from domain names.\n- **C:** Reinstalling is disproportionate before basic diagnosis.\n- **D:** A firewall timeout is not the first explanation for failed name resolution.\n\n## Check the wording\nThe question asks what to check **first**, not which fix is guaranteed to resolve it.';
  a.sample = true;
  return [a, question('A team resolved 240 tickets last week and 276 this week. What was the percentage increase? Show your calculation.', 'numerical'), question('A customer says: “I’ve contacted support three times and nobody has fixed this.” Write a calm reply in fewer than 80 words without promising an unverified resolution time.', 'written')];
}
