import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

/** Keep the shell's signed-in state aligned with Supabase auth events. */
export function useSystemAdminAuthListener(
  onSignedOut: () => void,
  onSignedIn: () => void,
): void {
  const callbacks = useRef({ onSignedOut, onSignedIn });

  useEffect(() => {
    callbacks.current = { onSignedOut, onSignedIn };
  }, [onSignedOut, onSignedIn]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        callbacks.current.onSignedOut();
        return;
      }

      callbacks.current.onSignedIn();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
}
