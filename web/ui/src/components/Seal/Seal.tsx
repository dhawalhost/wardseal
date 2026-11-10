import * as React from "react";
import { cn } from "../../lib/utils";

const SHIELD =
  "M171.642 0L0 45V194.776C8.35821 317.164 118.408 382.587 172.388 400C227.281 378.705 265.311 349.284 291.113 318.657C330.416 272.005 340.298 222.388 340.298 194.776V45.5224L171.642 0Z";
const CUTS = [
  "M45 200.205V33.1992L76.1836 25.0195V166.387L172.704 45.3927L246.761 134.823L217.995 147.599L172.704 91.9868L85.0931 211.359L45 200.205Z",
  "M85.0931 231.769L45 222.579C47.7224 248.131 80.6384 306.32 172.704 346C270.71 306.32 301.854 246.494 298.923 194.155L262.396 211.359C264.623 270.729 205.373 298.654 172.704 312.182C118.653 288.133 91.7753 248.553 85.0931 231.769Z",
  "M316 134.823C237.299 135.981 179.386 202.46 129.641 253.563L154.885 273.103C243.238 180.666 276.649 171.648 311.545 166.387L316 134.823Z",
  "M269.225 122.799V37.126L298.923 45.3927V115.284L269.225 122.799Z",
];

export interface SealProps extends React.SVGAttributes<SVGSVGElement> {
  /** Engraved ring text; repeated twice around the seal. */
  label?: string;
}

/**
 * WardSeal brand seal — the shield inside a ring of engraved text.
 * Decorative; the signature motif for verified decisions. Use once per surface.
 */
const Seal = React.forwardRef<SVGSVGElement, SealProps>(
  ({ className, label = "WARDSEAL · VERIFIED DECISION · ", ...props }, ref) => {
    const id = React.useId().replace(/:/g, "");
    return (
      <svg ref={ref} viewBox="0 0 120 120" aria-hidden focusable="false" className={cn("h-28 w-28", className)} {...props}>
        <defs>
          <path id={`seal-ring-${id}`} d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
        </defs>
        <circle cx="60" cy="60" r="58" fill="hsl(var(--secondary))" />
        <circle cx="60" cy="60" r="53" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="0.75" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="0.75" />
        <text fill="rgb(255 255 255 / 0.85)" fontFamily="var(--font-mono)" fontSize="7.5" letterSpacing="0.06em">
          <textPath href={`#seal-ring-${id}`} textLength="276">
            {label.repeat(2)}
          </textPath>
        </text>
        <g transform="translate(46 43) scale(0.082)">
          <path d={SHIELD} fill="#fff" />
          {CUTS.map((d) => (
            <path key={d.slice(0, 12)} d={d} fill="hsl(var(--secondary))" />
          ))}
        </g>
      </svg>
    );
  }
);
Seal.displayName = "Seal";

export { Seal };
