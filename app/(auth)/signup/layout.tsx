import { SignupProvider } from "./_context";

// Wraps both /signup (step 1) and /signup/location (step 2) so that
// client-side navigation between the two steps preserves the React state
// held in SignupContext — no browser storage or URL params needed.
export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <SignupProvider>{children}</SignupProvider>;
}
