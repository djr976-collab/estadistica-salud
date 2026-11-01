"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { cloudEnabled, friendlyError, getSupabase, type Course, type Profile } from "./supabase";
import { flushOutbox, pullProgress, refreshCloudBank, schedulePushProgress, setCloudUser } from "./cloud";
import { onProgressSaved, setProgressOwner } from "./progress";
import { setCourseSpicy } from "./settings";
import { load, save } from "./storage";

const PENDING_CODE = "nc.pendingCourseCode";

interface AuthState {
  cloud: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** El usuario llegó desde el enlace de "olvidé mi contraseña". */
  recovery: boolean;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(fullName: string, email: string, password: string, courseCode?: string): Promise<{ error: string | null; needsConfirmation: boolean }>;
  sendReset(email: string): Promise<string | null>;
  setNewPassword(password: string): Promise<string | null>;
  signOut(): Promise<void>;
  joinCourse(code: string): Promise<string | null>;
  updateName(name: string): Promise<string | null>;
  refreshProfile(): Promise<void>;
  accessToken(): Promise<string | null>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(cloudEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recovery, setRecovery] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    const sb = getSupabase()!;
    const { data } = await sb.from("profiles").select("id,full_name,role,course_id").eq("id", userId).maybeSingle<Profile>();
    if (!data) {
      setProfile(null);
      return;
    }
    let course: Course | null = null;
    if (data.course_id) {
      const r = await sb.from("courses").select("*").eq("id", data.course_id).maybeSingle<Course>();
      course = r.data;
    }
    setCourseSpicy(course ? course.allow_spicy : null);
    setProfile({ ...data, course });
  }, []);

  // Al iniciar sesión: progreso propio, sincronización y banco compartido.
  const onUser = useCallback(
    async (s: Session | null) => {
      setSession(s);
      const uid = s?.user.id ?? null;
      setCloudUser(uid);
      setProgressOwner(uid);
      if (!uid) {
        setProfile(null);
        setCourseSpicy(null);
        return;
      }
      await loadProfile(uid);
      const code = load<string | null>(PENDING_CODE, null);
      if (code) {
        const { error } = await getSupabase()!.rpc("join_course", { code });
        if (!error) {
          save(PENDING_CODE, null);
          await loadProfile(uid);
        }
      }
      void pullProgress();
      void flushOutbox();
      void refreshCloudBank();
    },
    [loadProfile],
  );

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let lastUser: string | null | undefined;
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "TOKEN_REFRESHED") setSession(s);
      // Supabase recomienda no esperar otras llamadas dentro de este callback: se difiere.
      const uid = s?.user.id ?? null;
      if (event === "INITIAL_SESSION" || ((event === "SIGNED_IN" || event === "SIGNED_OUT") && uid !== lastUser) || event === "USER_UPDATED") {
        lastUser = uid;
        setTimeout(() => void onUser(s).finally(() => setLoading(false)), 0);
      }
    });
    const unsub = onProgressSaved(schedulePushProgress);
    const online = () => void flushOutbox();
    window.addEventListener("online", online);
    return () => {
      sub.subscription.unsubscribe();
      unsub();
      window.removeEventListener("online", online);
    };
  }, [onUser]);

  const value = useMemo<AuthState>(
    () => ({
      cloud: cloudEnabled,
      loading,
      session,
      profile,
      recovery,
      async signIn(email, password) {
        const { error } = await getSupabase()!.auth.signInWithPassword({ email: email.trim(), password });
        return error ? friendlyError(error.message) : null;
      },
      async signUp(fullName, email, password, courseCode) {
        if (courseCode?.trim()) save(PENDING_CODE, courseCode.trim().toUpperCase());
        const { data, error } = await getSupabase()!.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/cuenta` },
        });
        if (error) return { error: friendlyError(error.message), needsConfirmation: false };
        return { error: null, needsConfirmation: !data.session };
      },
      async sendReset(email) {
        const { error } = await getSupabase()!.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/cuenta` });
        return error ? friendlyError(error.message) : null;
      },
      async setNewPassword(password) {
        const { error } = await getSupabase()!.auth.updateUser({ password });
        if (!error) setRecovery(false);
        return error ? friendlyError(error.message) : null;
      },
      async signOut() {
        await flushOutbox();
        await getSupabase()!.auth.signOut();
      },
      async joinCourse(code) {
        const { error } = await getSupabase()!.rpc("join_course", { code: code.trim() });
        if (error) return friendlyError(error.message);
        if (session) await loadProfile(session.user.id);
        return null;
      },
      async updateName(name) {
        if (!session) return "Sin sesión";
        const { error } = await getSupabase()!.from("profiles").update({ full_name: name.trim() }).eq("id", session.user.id);
        if (error) return friendlyError(error.message);
        await loadProfile(session.user.id);
        return null;
      },
      async refreshProfile() {
        if (session) await loadProfile(session.user.id);
      },
      async accessToken() {
        const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
        return data.session?.access_token ?? null;
      },
    }),
    [loading, session, profile, recovery, loadProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Token para las rutas /api/ai (fuera de React). */
export async function currentAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}
