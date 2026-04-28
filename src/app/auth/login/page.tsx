import { LoginForm } from "./login-form";

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
