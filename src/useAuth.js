import { useEffect, useState } from "react";
import { supabase, configured } from "./supabase";

// Turns Supabase's error text into something a person can act on.
function friendly(error) {
  if (!error) return null;
  const msg = (error.message || "").toLowerCase();
  if (error.status === 429 || /rate limit|security purposes|after \d+ seconds/.test(msg)) return "Too many tries. Wait a minute, then ask for a new code.";
  if (/not authorized/.test(msg)) return "That address isn't allowed to receive email yet. Email sending is still in test mode.";
  if (/expired|invalid/.test(msg) && /token|otp|code/.test(msg)) return "That code is wrong or has expired. Check it, or ask for a new one.";
  if (/already (been )?registered|already exists|email_exists/.test(msg)) return "That email is already used by another account.";
  if (/invalid.*email|email.*invalid|unable to validate email/.test(msg)) return "That doesn't look like a valid email address.";
  if (/failed to fetch|network/.test(msg)) return "Couldn't reach the account service. Check your connection and try again.";
  return error.message || "Something went wrong. Try again.";
}

const OK = { error: null };
const NOT_SET = { error: "Accounts aren't switched on yet." };

export default function useAuth() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!configured);

  useEffect(() => {
    if (!configured) return undefined;
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { live = false; data.subscription.unsubscribe(); };
  }, []);

  const user = session ? session.user : null;

  async function sendCode(email, name) {
    if (!configured) return NOT_SET;
    const options = { shouldCreateUser: true };
    if (name) options.data = { username: name };
    const { error } = await supabase.auth.signInWithOtp({ email, options });
    return error ? { error: friendly(error) } : OK;
  }

  async function verifyCode(email, token, name) {
    if (!configured) return NOT_SET;
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { error: friendly(error) };
    // New accounts get the name they typed; existing accounts keep theirs.
    if (name && data.user && !(data.user.user_metadata && data.user.user_metadata.username)) {
      await supabase.auth.updateUser({ data: { username: name } });
    }
    return OK;
  }

  async function saveName(name) {
    if (!configured) return NOT_SET;
    const { error } = await supabase.auth.updateUser({ data: { username: name } });
    return error ? { error: friendly(error) } : OK;
  }

  async function startEmailChange(newEmail) {
    if (!configured) return NOT_SET;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    return error ? { error: friendly(error) } : OK;
  }

  async function confirmEmailChange(newEmail, token) {
    if (!configured) return NOT_SET;
    const { error } = await supabase.auth.verifyOtp({ email: newEmail, token, type: "email_change" });
    return error ? { error: friendly(error) } : OK;
  }

  async function signOut() {
    if (!configured) return OK;
    await supabase.auth.signOut();
    return OK;
  }

  return {
    configured, ready, user,
    name: user && user.user_metadata ? user.user_metadata.username || "" : "",
    sendCode, verifyCode, saveName, startEmailChange, confirmEmailChange, signOut,
  };
}
