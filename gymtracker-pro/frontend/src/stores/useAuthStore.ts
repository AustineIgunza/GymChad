import { create } from "zustand";
import type { User } from "../types";

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  userId: string;
  setUserId: (id: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  userId: localStorage.getItem("gymchad-user-id") || `guest_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
  setUser: (user) => set({ user }),
  setUserId: (id) => {
    localStorage.setItem("gymchad-user-id", id);
    set({ userId: id });
  },
}));
