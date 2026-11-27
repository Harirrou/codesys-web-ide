// Run with: npm test   (starts the local Firestore emulator; nothing touches a real project)
import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, Timestamp,
} from 'firebase/firestore';

const HOME = 'home1';
const days = (n) => Timestamp.fromMillis(Date.now() + n * 24 * 60 * 60 * 1000);

let env;
const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());

/** Writes test data directly, bypassing the rules. */
async function seed(fn) {
  await env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));
}

/** A home owned by Sara, with Omar as a member, one pet, one need and today's logs. */
async function seedHome() {
  await seed(async (admin) => {
    await setDoc(doc(admin, `homes/${HOME}`), { name: 'Our home', tz: 'America/New_York', createdBy: 'sara' });
    await setDoc(doc(admin, `homes/${HOME}/members/sara`), { name: 'Sara', role: 'owner' });
    await setDoc(doc(admin, `homes/${HOME}/members/omar`), { name: 'Omar', role: 'member', inviteCode: 'OLDCODE1' });
    await setDoc(doc(admin, `homes/${HOME}/pets/luna`), { name: 'Luna', species: 'dog' });
    await setDoc(doc(admin, `homes/${HOME}/needs/meals`), { petId: 'luna', label: 'Meals', guard: 'soft' });
    await setDoc(doc(admin, `homes/${HOME}/days/2026-11-27`), { logs: { a1: { needId: 'meals', by: 'sara' } } });
    await setDoc(doc(admin, `homes/${HOME}/supplies/kibble`), { label: 'Kibble', remaining: 24 });
  });
}

async function seedSitter(uid, accessUntil) {
  await seed(async (admin) => {
    await setDoc(doc(admin, `homes/${HOME}/members/${uid}`), { name: 'Maya', role: 'sitter', expiresAt: accessUntil });
  });
}

async function seedInvite(code, fields) {
  await seed(async (admin) => {
    await setDoc(doc(admin, `invites/${code}`), { homeId: HOME, createdBy: 'sara', role: 'member', expiresAt: days(2), ...fields });
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-fedyet',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

describe('people outside a home', () => {
  beforeEach(seedHome);

  test('someone not signed in reads nothing', async () => {
    await assertFails(getDoc(doc(db(null), `homes/${HOME}`)));
    await assertFails(getDoc(doc(db(null), `homes/${HOME}/pets/luna`)));
    await assertFails(getDoc(doc(db(null), 'invites/ANYCODE1')));
  });

  test('a signed-in stranger reads nothing in the home', async () => {
    const stranger = db('stranger');
    await assertFails(getDoc(doc(stranger, `homes/${HOME}`)));
    await assertFails(getDoc(doc(stranger, `homes/${HOME}/pets/luna`)));
    await assertFails(getDoc(doc(stranger, `homes/${HOME}/needs/meals`)));
    await assertFails(getDoc(doc(stranger, `homes/${HOME}/days/2026-11-27`)));
    await assertFails(getDoc(doc(stranger, `homes/${HOME}/supplies/kibble`)));
    await assertFails(getDocs(collection(stranger, `homes/${HOME}/members`)));
  });

  test('a stranger writes nothing in the home', async () => {
    const stranger = db('stranger');
    await assertFails(setDoc(doc(stranger, `homes/${HOME}/pets/rex`), { name: 'Rex' }));
    await assertFails(setDoc(doc(stranger, `homes/${HOME}/days/2026-11-27`), { logs: {} }));
    await assertFails(updateDoc(doc(stranger, `homes/${HOME}`), { name: 'Mine now' }));
  });

  test('nobody can list homes or invites', async () => {
    await assertFails(getDocs(collection(db('sara'), 'homes')));
    await assertFails(getDocs(collection(db('sara'), 'invites')));
  });
});

describe('creating a home', () => {
  test('a home and its owner record are created together', async () => {
    const sara = db('sara');
    const batch = writeBatch(sara);
    batch.set(doc(sara, 'homes/new1'), { name: 'New home', tz: 'Europe/Paris', createdBy: 'sara' });
    batch.set(doc(sara, 'homes/new1/members/sara'), { name: 'Sara', role: 'owner' });
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(sara, 'homes/new1')));
  });

  test('a home without an owner record is refused', async () => {
    await assertFails(setDoc(doc(db('sara'), 'homes/new2'), { name: 'New home', createdBy: 'sara' }));
  });

  test('a home cannot be created in someone else\'s name', async () => {
    const sara = db('sara');
    const batch = writeBatch(sara);
    batch.set(doc(sara, 'homes/new3'), { name: 'New home', createdBy: 'omar' });
    batch.set(doc(sara, 'homes/new3/members/sara'), { name: 'Sara', role: 'owner' });
    await assertFails(batch.commit());
  });

  test('nobody can make themselves owner of a home that already exists', async () => {
    await seedHome();
    await assertFails(setDoc(doc(db('stranger'), `homes/${HOME}/members/stranger`), { name: 'X', role: 'owner' }));
  });
});

describe('joining with an invite', () => {
  beforeEach(seedHome);

  test('a valid code lets a new person join as a member', async () => {
    await seedInvite('GOODCODE');
    const ines = db('ines');
    await assertSucceeds(getDoc(doc(ines, 'invites/GOODCODE')));
    await assertSucceeds(setDoc(doc(ines, `homes/${HOME}/members/ines`), { name: 'Ines', role: 'member', inviteCode: 'GOODCODE' }));
    await assertSucceeds(getDoc(doc(ines, `homes/${HOME}/pets/luna`)));
  });

  test('joining without a code is refused', async () => {
    await assertFails(setDoc(doc(db('ines'), `homes/${HOME}/members/ines`), { name: 'Ines', role: 'member' }));
  });

  test('a made-up code is refused', async () => {
    await assertFails(setDoc(doc(db('ines'), `homes/${HOME}/members/ines`), { name: 'Ines', role: 'member', inviteCode: 'NOSUCHCD' }));
  });

  test('an expired code is refused', async () => {
    await seedInvite('OLDCODE9', { expiresAt: days(-1) });
    await assertFails(setDoc(doc(db('ines'), `homes/${HOME}/members/ines`), { name: 'Ines', role: 'member', inviteCode: 'OLDCODE9' }));
  });

  test('a code for another home is refused', async () => {
    await seedInvite('OTHERHOM', { homeId: 'home2' });
    await assertFails(setDoc(doc(db('ines'), `homes/${HOME}/members/ines`), { name: 'Ines', role: 'member', inviteCode: 'OTHERHOM' }));
  });

  test('a member code cannot be used to become owner', async () => {
    await seedInvite('GOODCODE');
    await assertFails(setDoc(doc(db('ines'), `homes/${HOME}/members/ines`), { name: 'Ines', role: 'owner', inviteCode: 'GOODCODE' }));
  });

  test('nobody can join on behalf of another person', async () => {
    await seedInvite('GOODCODE');
    await assertFails(setDoc(doc(db('ines'), `homes/${HOME}/members/victim`), { name: 'V', role: 'member', inviteCode: 'GOODCODE' }));
  });

  test('a sitter code gives sitter access with the pass end date, and nothing longer', async () => {
    const until = days(4);
    await seedInvite('SITCODE1', { role: 'sitter', accessUntil: until });
    const maya = db('maya');
    await assertFails(setDoc(doc(maya, `homes/${HOME}/members/maya`), { name: 'Maya', role: 'sitter', inviteCode: 'SITCODE1', expiresAt: days(400) }));
    await assertFails(setDoc(doc(maya, `homes/${HOME}/members/maya`), { name: 'Maya', role: 'member', inviteCode: 'SITCODE1' }));
    await assertSucceeds(setDoc(doc(maya, `homes/${HOME}/members/maya`), { name: 'Maya', role: 'sitter', inviteCode: 'SITCODE1', expiresAt: until }));
  });
});

describe('members', () => {
  beforeEach(seedHome);

  test('a member reads and edits pets, needs, supplies and logs', async () => {
    const omar = db('omar');
    await assertSucceeds(getDoc(doc(omar, `homes/${HOME}`)));
    await assertSucceeds(setDoc(doc(omar, `homes/${HOME}/pets/miso`), { name: 'Miso', species: 'cat' }));
    await assertSucceeds(updateDoc(doc(omar, `homes/${HOME}/needs/meals`), { label: 'Food' }));
    await assertSucceeds(updateDoc(doc(omar, `homes/${HOME}/supplies/kibble`), { remaining: 22 }));
    await assertSucceeds(updateDoc(doc(omar, `homes/${HOME}/days/2026-11-27`), { 'logs.b2': { needId: 'meals', by: 'omar' } }));
    await assertSucceeds(setDoc(doc(omar, `homes/${HOME}/days/2026-11-28`), { logs: {} }));
  });

  test('a member can rename themselves but not change their role', async () => {
    const omar = db('omar');
    await assertSucceeds(updateDoc(doc(omar, `homes/${HOME}/members/omar`), { name: 'Omar H', tint: '#F3DFC4', fcmTokens: ['t1'] }));
    await assertFails(updateDoc(doc(omar, `homes/${HOME}/members/omar`), { role: 'owner' }));
  });

  test('a member cannot edit another member, rename the home or delete it', async () => {
    const omar = db('omar');
    await assertFails(updateDoc(doc(omar, `homes/${HOME}/members/sara`), { name: 'Hacked' }));
    await assertFails(updateDoc(doc(omar, `homes/${HOME}`), { name: 'Omar\'s home' }));
    await assertFails(deleteDoc(doc(omar, `homes/${HOME}`)));
    await assertFails(deleteDoc(doc(omar, `homes/${HOME}/members/sara`)));
  });

  test('a day document holds logs and nothing else', async () => {
    const omar = db('omar');
    await assertFails(setDoc(doc(omar, `homes/${HOME}/days/2026-11-29`), { logs: {}, extra: 'x' }));
    await assertFails(updateDoc(doc(omar, `homes/${HOME}/days/2026-11-27`), { extra: 'x' }));
  });

  test('a member can leave, and then sees nothing', async () => {
    const omar = db('omar');
    await assertSucceeds(deleteDoc(doc(omar, `homes/${HOME}/members/omar`)));
    await assertFails(getDoc(doc(omar, `homes/${HOME}/pets/luna`)));
  });

  test('the owner can remove a member, rename the home and delete it', async () => {
    const sara = db('sara');
    await assertSucceeds(deleteDoc(doc(sara, `homes/${HOME}/members/omar`)));
    await assertFails(getDoc(doc(db('omar'), `homes/${HOME}/pets/luna`)));
    await assertSucceeds(updateDoc(doc(sara, `homes/${HOME}`), { name: 'Sara\'s home' }));
    await assertFails(updateDoc(doc(sara, `homes/${HOME}`), { createdBy: 'omar' }));
    await assertSucceeds(deleteDoc(doc(sara, `homes/${HOME}`)));
  });
});

describe('sitters', () => {
  beforeEach(seedHome);

  test('a sitter reads the home and ticks tasks', async () => {
    await seedSitter('maya', days(3));
    const maya = db('maya');
    await assertSucceeds(getDoc(doc(maya, `homes/${HOME}/pets/luna`)));
    await assertSucceeds(getDoc(doc(maya, `homes/${HOME}/needs/meals`)));
    await assertSucceeds(updateDoc(doc(maya, `homes/${HOME}/days/2026-11-27`), { 'logs.c3': { needId: 'meals', by: 'maya' } }));
    await assertSucceeds(updateDoc(doc(maya, `homes/${HOME}/needs/meals`), { lastDoneAt: Timestamp.now(), lastDoneBy: 'maya' }));
  });

  test('a sitter cannot change pets, schedules, supplies or members, or invite people', async () => {
    await seedSitter('maya', days(3));
    const maya = db('maya');
    await assertFails(setDoc(doc(maya, `homes/${HOME}/pets/rex`), { name: 'Rex' }));
    await assertFails(updateDoc(doc(maya, `homes/${HOME}/pets/luna`), { name: 'Lulu' }));
    await assertFails(updateDoc(doc(maya, `homes/${HOME}/needs/meals`), { label: 'Changed' }));
    await assertFails(deleteDoc(doc(maya, `homes/${HOME}/needs/meals`)));
    await assertFails(updateDoc(doc(maya, `homes/${HOME}/supplies/kibble`), { remaining: 0 }));
    await assertFails(deleteDoc(doc(maya, `homes/${HOME}/members/omar`)));
    await assertFails(setDoc(doc(maya, 'invites/SITINV01'), { homeId: HOME, createdBy: 'maya', role: 'member', expiresAt: days(1) }));
  });

  test('a sitter cannot extend their own pass', async () => {
    await seedSitter('maya', days(3));
    await assertFails(updateDoc(doc(db('maya'), `homes/${HOME}/members/maya`), { expiresAt: days(300) }));
    await assertFails(updateDoc(doc(db('maya'), `homes/${HOME}/members/maya`), { role: 'member' }));
  });

  test('when the pass ends the sitter sees nothing', async () => {
    await seedSitter('maya', days(-1));
    const maya = db('maya');
    await assertFails(getDoc(doc(maya, `homes/${HOME}/pets/luna`)));
    await assertFails(updateDoc(doc(maya, `homes/${HOME}/days/2026-11-27`), { 'logs.d4': { needId: 'meals', by: 'maya' } }));
  });
});

describe('invites', () => {
  beforeEach(seedHome);

  test('a member creates a member invite and a sitter pass', async () => {
    const omar = db('omar');
    await assertSucceeds(setDoc(doc(omar, 'invites/NEWCODE1'), { homeId: HOME, createdBy: 'omar', role: 'member', expiresAt: days(2) }));
    await assertSucceeds(setDoc(doc(omar, 'invites/NEWCODE2'), { homeId: HOME, createdBy: 'omar', role: 'sitter', expiresAt: days(2), accessUntil: days(5) }));
  });

  test('an invite never grants owner, lasts at most a week, and needs an end date for sitters', async () => {
    const omar = db('omar');
    await assertFails(setDoc(doc(omar, 'invites/BADCODE1'), { homeId: HOME, createdBy: 'omar', role: 'owner', expiresAt: days(2) }));
    await assertFails(setDoc(doc(omar, 'invites/BADCODE2'), { homeId: HOME, createdBy: 'omar', role: 'member', expiresAt: days(30) }));
    await assertFails(setDoc(doc(omar, 'invites/BADCODE3'), { homeId: HOME, createdBy: 'omar', role: 'sitter', expiresAt: days(2) }));
  });

  test('a stranger cannot create an invite for a home they are not in', async () => {
    await assertFails(setDoc(doc(db('stranger'), 'invites/EVILCODE'), { homeId: HOME, createdBy: 'stranger', role: 'member', expiresAt: days(2) }));
  });

  test('an invite cannot be edited, and only members can cancel it', async () => {
    await seedInvite('GOODCODE');
    await assertFails(updateDoc(doc(db('omar'), 'invites/GOODCODE'), { role: 'sitter' }));
    await assertFails(deleteDoc(doc(db('stranger'), 'invites/GOODCODE')));
    await assertSucceeds(deleteDoc(doc(db('omar'), 'invites/GOODCODE')));
  });
});
