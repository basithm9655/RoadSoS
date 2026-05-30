import {
  doc, setDoc, getDoc, updateDoc, collection,
  addDoc, query, where, onSnapshot, getDocs,
  serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { encode as geohashEncode } from './geohash';

// ── User helpers ─────────────────────────────────────────────

export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function setUser(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

export async function updateFamilyContacts(uid, contacts) {
  await setDoc(doc(db, 'users', uid), { familyContacts: contacts }, { merge: true });
}

// ── SOS Events ───────────────────────────────────────────────

export async function createSOSEvent(uid, userName, lat, lon) {
  const geohash = geohashEncode(lat, lon, 7);
  const ref = await addDoc(collection(db, 'sos_events'), {
    uid,
    userName,
    lat,
    lon,
    geohash,
    timestamp: serverTimestamp(),
    status: 'pending',
    acceptedBy: null,
  });
  return ref.id;
}

export async function acceptSOSEvent(eventId, driverUid) {
  await updateDoc(doc(db, 'sos_events', eventId), {
    status: 'accepted',
    acceptedBy: driverUid,
  });
}

export async function resolveSOSEvent(eventId) {
  await updateDoc(doc(db, 'sos_events', eventId), { status: 'resolved' });
}

export function subscribePendingSOSEvents(callback) {
  const q = query(collection(db, 'sos_events'), where('status', '==', 'pending'));
  return onSnapshot(q, snapshot => {
    const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(events);
  });
}

// ── Ambulance helpers ─────────────────────────────────────────

export async function updateAmbulanceLocation(uid, lat, lon, available) {
  await setDoc(doc(db, 'ambulances', uid), {
    lat, lon,
    geohash: geohashEncode(lat, lon, 7),
    available,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getNearbyAmbulances(lat, lon, radiusKm = 10) {
  const snap = await getDocs(query(collection(db, 'ambulances'), where('available', '==', true)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Volunteer helpers ─────────────────────────────────────────

export async function registerVolunteer(uid, data) {
  await setDoc(doc(db, 'volunteers', uid), {
    ...data,
    geohash: geohashEncode(data.lat, data.lon, 7),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getNearbyVolunteers(lat, lon) {
  const snap = await getDocs(collection(db, 'volunteers'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
