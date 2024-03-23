import { atom } from "nanostores";

import { type WarmupResponse } from "./api";

export const metaAtom = atom<WarmupResponse | undefined>(undefined);
