import type { BrandingConfig } from "@/lib/branding";

type DocumentBrandMarkProps = {
  branding: BrandingConfig;
  className?: string;
  initialsClassName?: string;
  imageClassName?: string;
};

export function DocumentBrandMark({
  branding,
  className = "flex h-18 w-18 shrink-0 items-center justify-center rounded-[1.4rem] border border-[rgba(29,23,16,0.1)] bg-[rgba(255,255,255,0.88)] p-2",
  initialsClassName = "text-lg font-semibold text-[var(--voucher-accent)]",
  imageClassName = "h-full w-full rounded-[1rem] object-cover",
}: DocumentBrandMarkProps) {
  const initials = (branding.companyName || "BD")
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className={className}>
      {branding.logoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoDataUrl}
          alt={`${branding.companyName || "Company"} logo`}
          className={imageClassName}
        />
      ) : (
        <span className={initialsClassName}>{initials}</span>
      )}
    </div>
  );
}
