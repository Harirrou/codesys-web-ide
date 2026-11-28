// A scripted "second phone" for end-to-end tests against the local emulators.
// usage: node e2e/second-phone.mjs <command> [args]
//   join <code> <name>                 sign in and join the home
//   tick <needLabel>                   tick a task as this person
//   addNeed <petName> <label> <HH:MM>  add a daily task at that time (UTC)
//   show                               print the home as this person sees it
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, setDoc, updateDoc, collection, deleteField,
} from 'firebase/firestore';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const STATE = new URL('./.second-phone.json', import.meta.url);
const app = initializeApp({ projectId: 'demo-fedyet', apiKey: 'demo-key' });
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE)) : {};
const [cmd, ...args] = process.argv.slice(2);

// The app signs in anonymously. This script uses a fixed emulator account instead, so that
// every run is the same person (the rules only care about the uid, not how it signed in).
let user;
try {
  user = (await signInWithEmailAndPassword(auth, 'sara@example.test', 'second-phone')).user;
} catch {
  user = (await createUserWithEmailAndPassword(auth, 'sara@example.test', 'second-phone')).user;
}

async function join(code, name) {
  const invite = await getDoc(doc(db, 'invites', code));
  if (!invite.exists()) throw new Error('no such invite');
  const homeId = invite.data().homeId;
  await setDoc(doc(db, `homes/${homeId}/members/${user.uid}`), { name, tint: 0xFF7FB2FF, role: 'member', inviteCode: code });
  Object.assign(state, { uid: user.uid, code, name, homeId });
  writeFileSync(STATE, JSON.stringify(state));
  console.log(`joined home ${homeId} as ${name} (${user.uid})`);
}

const home = () => `homes/${state.homeId}`;
const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);

if (cmd === 'join') {
  await join(args[0], args[1]);
} else if (cmd === 'show') {
  const h = await getDoc(doc(db, home()));
  console.log('home:', h.data().name, h.data().tz);
  for (const c of ['members', 'pets', 'needs', 'supplies']) {
    const s = await getDocs(collection(db, `${home()}/${c}`));
    console.log(`${c}:`, s.docs.map((d) => d.data().name ?? d.data().label).join(', '));
  }
} else if (cmd === 'tick') {
  const needs = await getDocs(collection(db, `${home()}/needs`));
  const need = needs.docs.find((d) => d.data().label === args[0]);
  if (!need) throw new Error(`no task called ${args[0]}`);
  const at = Date.now();
  const id = randomUUID();
  await setDoc(doc(db, `${home()}/days/${dayKey(at)}`), { logs: { [id]: { needId: need.id, by: user.uid, at, undone: false } } }, { merge: true });
  await updateDoc(need.ref, { lastDone: { id, at, by: user.uid }, prevDone: need.data().lastDone ?? deleteField() });
  console.log(`ticked ${args[0]} at ${new Date(at).toISOString()}`);
} else if (cmd === 'addNeed') {
  const pets = await getDocs(collection(db, `${home()}/pets`));
  const pet = pets.docs.find((d) => d.data().name === args[0]);
  if (!pet) throw new Error(`no pet called ${args[0]}`);
  const id = randomUUID();
  await setDoc(doc(db, `${home()}/needs/${id}`), {
    petId: pet.id, kind: 'MEDICINE', label: args[1],
    schedule: { type: 'daily', slots: [{ time: args[2], label: null }] },
    createdAt: Date.now() - 2 * 86400000, guard: 'HARD', earlyMinutes: 90, lateMinutes: 90, minGapMinutes: null, active: true,
  });
  console.log(`added ${args[1]} for ${args[0]} at ${args[2]} UTC`);
} else {
  console.log('unknown command');
}
process.exit(0);
