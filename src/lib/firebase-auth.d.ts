// The Firebase JS SDK (v13) does not expose getReactNativePersistence
// through its public types: the package's "types" export condition points
// at auth-public.d.ts, which omits it, and that condition is always
// resolved before the "react-native" one. The function does exist at
// runtime in the react-native build (dist/rn), which Metro resolves.
// This augmentation declares it so TypeScript accepts the import in
// src/lib/firebase.ts. Do not remove it without checking that
// getReactNativePersistence still typechecks — without it, the session
// persistence import fails and sign-in stops surviving restarts.

import type { Persistence } from '@firebase/auth';
import type AsyncStorage from '@react-native-async-storage/async-storage';

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
}
