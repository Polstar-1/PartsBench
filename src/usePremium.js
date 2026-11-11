import { useEffect, useState } from "react";
import { supabase, configured } from "./supabase";
import { rowIsPremium } from "./premium";

// Whether the signed-in account has Premium. Signed out, or any trouble reaching the account service: false.
export default function usePremium(user, tick = 0) {
  const uid = user ? user.id : null;
  const [state, setState] = useState({ uid: null, premium: false });

  useEffect(() => {
    if (!configured || !uid) return undefined;
    let live = true;
    supabase.from("premium").select("active,until").eq("user_id", uid).maybeSingle()
      .then(({ data, error }) => { if (live) setState({ uid, premium: !error && rowIsPremium(data) }); })
      .catch(() => { if (live) setState({ uid, premium: false }); });
    return () => { live = false; };
  }, [uid, tick]);

  return uid !== null && state.uid === uid && state.premium;
}
