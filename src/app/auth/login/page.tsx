import { LoginForm } from "./login-form";

// searchParams values may be string | string[] | undefined in Next.js 15+.
// Pick the first value of an array, or undefined if absent.
function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Async server component: reads search params at request time so the full
// LoginForm HTML (including pre-filled email and error messages) is
// server-rendered and visible immediately — before any client JS loads.
// This prevents the blank-page flash that occurs when useSearchParams() is
// used inside a Suspense boundary (client-only rendering).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <LoginForm
      initialError={first(params.error) ?? ""}
      initialEmail={first(params.email) ?? first(params.sso_email) ?? ""}
      initialOrgSlug={first(params.org) ?? ""}
      callbackUrl={first(params.callbackUrl) ?? null}
      ssoRequired={first(params.sso_required) === "1"}
      ssoErrorCode={first(params.sso_error) ?? null}
    />
  );
}
