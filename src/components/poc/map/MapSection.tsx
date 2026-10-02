import type { ResolvedBusiness, ResolvedLocation } from "@/lib/poc/types";
import { mapsQueryUrl } from "@/lib/poc/url";
import { ActionLink } from "@/components/poc/ActionLink";

/**
 * Accessible map section with three rendering modes:
 *   1. An explicit trusted embedUrl from the record.
 *   2. A Google Maps embed when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set
 *      (client-safe public variable only; no server secrets).
 *   3. A styled location card fallback that works with zero credentials.
 *
 * Every mode ships a text alternative with the address and a directions
 * link. Themes compose this primitive inside their own framing.
 */
export function MapSection({
  location,
  businessName,
  directionsCta,
  className,
  cardClassName,
  addressClassName,
  buttonClassName,
  embedClassName,
  iframeTitle,
}: {
  location: ResolvedLocation;
  businessName: string;
  directionsCta: ResolvedBusiness["cta"]["primary"];
  className?: string;
  cardClassName?: string;
  addressClassName?: string;
  buttonClassName?: string;
  embedClassName?: string;
  iframeTitle?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const q =
    location.latitude != null && location.longitude != null
      ? `${location.latitude},${location.longitude}`
      : (location.formattedAddress ?? location.shortAddress ?? "");

  const trustedEmbed = location.embedUrl;
  const keyedEmbed = apiKey && q ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(q)}` : null;
  const embed = trustedEmbed ?? keyedEmbed;

  const address = location.formattedAddress ?? location.shortAddress;
  const directionsHref =
    directionsCta?.href ??
    mapsQueryUrl({
      latitude: location.latitude,
      longitude: location.longitude,
      formattedAddress: location.formattedAddress,
    });

  return (
    <div className={className}>
      {embed ? (
        <iframe
          title={iframeTitle ?? `Map showing the location of ${businessName}`}
          src={embed}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className={embedClassName ?? "h-[380px] w-full border-0"}
        />
      ) : (
        <div className={cardClassName}>
          <p className={addressClassName}>{address}</p>
          {location.latitude != null && location.longitude != null ? (
            <p className="font-mono text-xs opacity-70">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          ) : null}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        {address ? (
          <p className={addressClassName ?? "text-sm"}>{address}</p>
        ) : null}
        {directionsHref ? (
          <ActionLink
            cta={
              directionsCta ?? {
                label: "Get directions",
                href: directionsHref,
                kind: "directions",
                external: true,
              }
            }
            className={buttonClassName}
          >
            {directionsCta?.label ?? "Get directions"}
          </ActionLink>
        ) : null}
      </div>
    </div>
  );
}
