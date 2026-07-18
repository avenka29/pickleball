import { useEffect } from "react";
import { AuthGate } from "./features/auth/AuthGate";
import { authKeys } from "./features/auth/api";
import { Dashboard } from "./features/dashboard/Dashboard";
import { queryClient } from "./lib/queryClient";
import { supabase } from "./lib/supabase";

export default function App() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: authKeys.session });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthGate>{(auth) => <Dashboard auth={auth} />}</AuthGate>;
}
