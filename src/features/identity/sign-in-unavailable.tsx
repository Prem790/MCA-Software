import { AccountCard } from "./account-card";
export function SignInUnavailable() {
  return (
    <AccountCard title="Sign-in is unavailable" showSignInLink={false}>
      <p>
        Your workspace is not ready for sign-in yet. Contact the person who
        manages your firm’s access.
      </p>
    </AccountCard>
  );
}
