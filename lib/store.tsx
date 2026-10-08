"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Application, CoverLetter, KanbanStage } from "./types";
import { DEFAULT_PROFILE } from "./seed";

export type Profile = { skills: string[]; targetRole: string; major: string; career: string };

type Store = {
  hydrated: boolean;
  profile: Profile;
  setProfile: (p: Profile) => void;
  bookmarks: string[];
  toggleBookmark: (jobId: string) => void;
  applications: Application[];
  addApplication: (jobId: string) => { ok: boolean; duplicate: boolean };
  moveApplication: (jobId: string, status: KanbanStage) => void;
  removeApplication: (jobId: string) => void;
  getApplication: (jobId: string) => Application | undefined;
  coverLetters: CoverLetter[];
  saveCoverLetter: (cl: CoverLetter) => void;
};

const Ctx = createContext<Store | null>(null);
const KEY = "jobfilter-mvp-v1";

type Persisted = {
  profile: Profile;
  bookmarks: string[];
  applications: Application[];
  coverLetters: CoverLetter[];
};

const initial: Persisted = {
  profile: DEFAULT_PROFILE,
  bookmarks: [],
  applications: [],
  coverLetters: [],
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const setProfile = useCallback((p: Profile) => setState((s) => ({ ...s, profile: p })), []);

  const toggleBookmark = useCallback(
    (jobId: string) =>
      setState((s) => ({
        ...s,
        bookmarks: s.bookmarks.includes(jobId)
          ? s.bookmarks.filter((b) => b !== jobId)
          : [...s.bookmarks, jobId],
      })),
    []
  );

  const addApplication = useCallback((jobId: string) => {
    let result = { ok: false, duplicate: false };
    setState((s) => {
      if (s.applications.some((a) => a.jobId === jobId)) {
        result = { ok: false, duplicate: true }; // F-18 중복 지원 차단
        return s;
      }
      result = { ok: true, duplicate: false };
      return {
        ...s,
        applications: [
          ...s.applications,
          {
            jobId,
            status: "PREPARING" as KanbanStage,
            memo: "",
            updatedAt: new Date().toISOString(),
            history: [{ status: "PREPARING" as KanbanStage, changedAt: new Date().toISOString() }],
          },
        ],
      };
    });
    return result;
  }, []);

  const moveApplication = useCallback((jobId: string, status: KanbanStage) => {
    setState((s) => ({
      ...s,
      applications: s.applications.map((a) =>
        a.jobId === jobId && a.status !== status
          ? {
              ...a,
              status,
              updatedAt: new Date().toISOString(),
              history: [...a.history, { status, changedAt: new Date().toISOString() }],
            }
          : a
      ),
    }));
  }, []);

  const removeApplication = useCallback((jobId: string) => {
    setState((s) => ({ ...s, applications: s.applications.filter((a) => a.jobId !== jobId) }));
  }, []);

  const getApplication = useCallback(
    (jobId: string) => state.applications.find((a) => a.jobId === jobId),
    [state.applications]
  );

  const saveCoverLetter = useCallback((cl: CoverLetter) => {
    setState((s) => ({
      ...s,
      coverLetters: [...s.coverLetters.filter((c) => c.id !== cl.id), cl],
    }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      hydrated,
      profile: state.profile,
      setProfile,
      bookmarks: state.bookmarks,
      toggleBookmark,
      applications: state.applications,
      addApplication,
      moveApplication,
      removeApplication,
      getApplication,
      coverLetters: state.coverLetters,
      saveCoverLetter,
    }),
    [hydrated, state, setProfile, toggleBookmark, addApplication, moveApplication, removeApplication, getApplication, saveCoverLetter]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
