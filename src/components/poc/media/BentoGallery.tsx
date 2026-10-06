import type { ResolvedImage } from "@/lib/poc/types";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/StaggerGroup";

/**
 * Adaptive bento gallery. Server component; picks a deliberately different
 * composition per image count so a rich record never renders as a row of
 * identical cards and a sparse record never renders empty grid cells:
 *
 *   1 image  — one wide panel with a caption slot
 *   2 images — asymmetric 3:2 split
 *   3 images — feature + stacked pair
 *   4+       — two-row bento with varied spans
 *
 * Themes style the frames and captions through the render-prop; nothing is
 * invented — captions come from image alt text and the gallery title only.
 */
export function BentoGallery({
  images,
  renderCaption,
  className,
  mobileClassName = "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4",
}: {
  images: ResolvedImage[];
  renderCaption?: (image: ResolvedImage, index: number) => React.ReactNode;
  className?: string;
  /** Mobile composition; default is an intentional horizontal snap strip. */
  mobileClassName?: string;
}) {
  if (images.length === 0) return null;

  const count = Math.min(images.length, 4);
  const shown = images.slice(0, 4);
  const at = (index: number): ResolvedImage => shown[index] as ResolvedImage;

  return (
    <div className={className}>
      {/* Mobile: deliberate horizontal strip, not a shrunken desktop grid. */}
      <div className={`${mobileClassName} md:hidden`}>
        {shown.map((image, index) => (
          <Reveal
            key={image.url}
            media
            delay={index * 0.04}
            className={`w-[78vw] shrink-0 snap-center ${index === 0 ? "" : ""}`}
          >
            <figure className="h-full">
              {renderFrame(image, "aspect-[4/5]")}
              {renderCaption ? (
                <figcaption className="mt-3">{renderCaption(image, index)}</figcaption>
              ) : null}
            </figure>
          </Reveal>
        ))}
      </div>

      {/* Desktop bento. */}
      <StaggerGroup className="hidden grid-cols-12 gap-5 md:grid" gap={0.1}>
        {count === 1 ? (
          <StaggerItem>
            <figure>
              {renderFrame(at(0), "aspect-[16/9]")}
              {renderCaption ? (
                <figcaption className="mt-3">{renderCaption(at(0), 0)}</figcaption>
              ) : null}
            </figure>
          </StaggerItem>
        ) : count === 2 ? (
          <>
            <StaggerItem className="md:col-span-7">
              <figure>
                {renderFrame(at(0), "aspect-[4/3]")}
                {renderCaption ? (
                  <figcaption className="mt-3">{renderCaption(at(0), 0)}</figcaption>
                ) : null}
              </figure>
            </StaggerItem>
            <StaggerItem className="md:col-span-5 md:pt-14">
              <figure>
                {renderFrame(at(1), "aspect-[3/4]")}
                {renderCaption ? (
                  <figcaption className="mt-3">{renderCaption(at(1), 1)}</figcaption>
                ) : null}
              </figure>
            </StaggerItem>
          </>
        ) : count === 3 ? (
          <>
            <StaggerItem className="md:col-span-7 md:row-span-2">
              <figure className="h-full">
                {renderFrame(at(0), "h-full min-h-[420px]")}
                {renderCaption ? (
                  <figcaption className="mt-3">{renderCaption(at(0), 0)}</figcaption>
                ) : null}
              </figure>
            </StaggerItem>
            <StaggerItem className="md:col-span-5">
              <figure>
                {renderFrame(at(1), "aspect-[4/3]")}
                {renderCaption ? (
                  <figcaption className="mt-3">{renderCaption(at(1), 1)}</figcaption>
                ) : null}
              </figure>
            </StaggerItem>
            <StaggerItem className="md:col-span-5">
              <figure>
                {renderFrame(at(2), "aspect-[4/3]")}
                {renderCaption ? (
                  <figcaption className="mt-3">{renderCaption(at(2), 2)}</figcaption>
                ) : null}
              </figure>
            </StaggerItem>
          </>
        ) : (
          <>
            <StaggerItem className="md:col-span-7 md:row-span-2">
              <figure className="h-full">
                {renderFrame(at(0), "h-full min-h-[420px]")}
                {renderCaption ? (
                  <figcaption className="mt-3">{renderCaption(at(0), 0)}</figcaption>
                ) : null}
              </figure>
            </StaggerItem>
            <StaggerItem className="md:col-span-5">
              <figure>
                {renderFrame(at(1), "aspect-[4/3]")}
                {renderCaption ? (
                  <figcaption className="mt-3">{renderCaption(at(1), 1)}</figcaption>
                ) : null}
              </figure>
            </StaggerItem>
            <StaggerItem className="md:col-span-5">
              <figure>
                {renderFrame(at(2), "aspect-[4/3]")}
                {renderCaption ? (
                  <figcaption className="mt-3">{renderCaption(at(2), 2)}</figcaption>
                ) : null}
              </figure>
            </StaggerItem>
            <StaggerItem className="md:col-span-12">
              <figure>
                {renderFrame(at(3), "aspect-[21/9]")}
                {renderCaption ? (
                  <figcaption className="mt-3">{renderCaption(at(3), 3)}</figcaption>
                ) : null}
              </figure>
            </StaggerItem>
          </>
        )}
      </StaggerGroup>
    </div>
  );
}

function renderFrame(image: ResolvedImage, frameClass: string): React.ReactNode {
  return (
    <div className={`relative overflow-hidden ${frameClass}`}>
      <SmartImage
        image={image}
        fill
        sizes="(min-width: 1024px) 50vw, 78vw"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
