/**
 * The artwork itself. Fixed behind everything, slowly drifting, then faded
 * into the deep indigo base so the lower sections stay readable.
 *
 * The image is a downscaled + compressed copy of the source art (61KB vs 2.7MB).
 * A soft gradient survives that compression with no visible loss.
 */
export default function FacetBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg.jpg"
        alt=""
        className="h-full w-full animate-drift object-cover"
        style={{ transformOrigin: "center" }}
      />

      {/* Legibility scrim — darkens the whole field just enough for white text */}
      <div className="absolute inset-0 bg-night-950/35" />

      {/* Fades the artwork out toward the bottom of the first screen so the
          content sections below sit on solid indigo instead of competing color */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-night-950/70 to-night-950" />
    </div>
  );
}
