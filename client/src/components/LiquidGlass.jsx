import React, { useState, useLayoutEffect, useRef, useId, useEffect } from 'react';

// Cache to prevent recreating the same displacement maps (canvas -> PNG data URL)
const mapCache = new Map();
const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v);

const PAD = 20; // Padded margin to allow refraction to pull pixels from outside the element boundary

/**
 * Builds a displacement map as a PNG Data URL using a signed distance field (SDF)
 * representing a rounded rectangle of the element's actual size and border-radius.
 */
function buildLensMap(mw, mh, radius, splay, curve, feather) {
  const key = `${mw}:${mh}:${radius}:${splay}:${curve}:${feather}`;
  const hit = mapCache.get(key);
  if (hit) return hit;

  const cv = document.createElement('canvas');
  cv.width = mw;
  cv.height = mh;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';

  const img = ctx.createImageData(mw, mh);
  const px = img.data;
  const BOOST = 0.8; // Coordinates offset boost

  // winW and winH are the actual inner dimensions of the lens (map size minus padding)
  const winW = mw - 2 * PAD;
  const winH = mh - 2 * PAD;
  const hx = winW / 2;
  const hy = winH / 2;

  // Signed distance function to a rounded rectangle representing the element boundaries
  const sdf = (x, y) => {
    // Clamp radius so it does not exceed the half-dimensions (preventing inside-out geometry)
    const r = Math.min(radius, hx, hy);
    const qx = Math.abs(x - mw / 2) - (hx - r);
    const qy = Math.abs(y - mh / 2) - (hy - r);
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
  };

  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      const s = sdf(cx, cy); // Distance to the edge (negative inside, positive outside)
      
      // Calculate normal vector (gradient of distance field)
      const gx = sdf(cx + 1, cy) - sdf(cx - 1, cy);
      const gy = sdf(cx, cy + 1) - sdf(cx, cy - 1);
      const len = Math.hypot(gx, gy) || 1;
      const nx = gx / len;
      const ny = gy / len;

      // Inner boundary gets a wider, softer splay/feather falloff for natural bevel look
      const span = s < 0 ? splay + feather : splay;
      let amt = Math.max(0, 1 - Math.abs(s) / span);
      amt = amt * amt * amt * (amt * (amt * 6 - 15) + 10); // Smootherstep ease
      amt = Math.pow(amt, curve);

      const i = (y * mw + x) * 4;
      // Red: X displacement (maps to -1 to +1 coordinates)
      px[i]     = clamp255(Math.round(127.5 - nx * amt * 127 * BOOST));
      // Green: Y displacement
      px[i + 1] = clamp255(Math.round(127.5 - ny * amt * 127 * BOOST));
      // Blue: Unused
      px[i + 2] = 128;
      // Alpha: Opaque map
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/png');

  // Limit cache size to prevent memory leaks from scrubbed/scanned resizes
  if (mapCache.size > 200) {
    const firstKey = mapCache.keys().next().value;
    mapCache.delete(firstKey);
  }
  mapCache.set(key, url);
  return url;
}

export default function LiquidGlass({
  children,
  tagName = 'div',
  className = '',
  style = {},
  depth = 60,          // Scale of the displacement refraction (matches CodePen)
  splay = 2,           // Sharp bevel offset width
  feather = 24,        // Soft bevel depth splay
  curve = 2.0,         // Curvature profile exponent
  blur = 0,            // Backdrop blur radius (0 = clear glass, matching CodePen)
  glint = 25,          // Specular highlight opacity (0 to 100)
  tint = 0,            // Multiply color tint opacity (0 to 1)
  tintColor = '#ffffff', // Multiply color tint hex
  hoverParams = null,  // Parameters to override on hover (e.g. increase depth/glint)
  ...props
}) {
  const containerRef = useRef(null);
  const cloneRef = useRef(null);
  const frameRef = useRef(null);
  const filterId = useId().replace(/:/g, '-');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [computedRadius, setComputedRadius] = useState(12);
  const [isHovered, setIsHovered] = useState(false);
  const [mapUrl, setMapUrl] = useState('');

  // Measure size and get border-radius dynamically from styles
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateMeasurements = () => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      const r = parseInt(computed.borderRadius) || 0;

      setSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
      setComputedRadius(r);
    };

    updateMeasurements();

    const observer = new ResizeObserver(() => {
      updateMeasurements();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Determine active parameters based on hover state
  const activeParams = isHovered && hoverParams
    ? { depth, splay, feather, curve, blur, glint, tint, tintColor, ...hoverParams }
    : { depth, splay, feather, curve, blur, glint, tint, tintColor };

  // Re-build map when size or geometry parameters change
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;

    // Displacement map dimensions include padding
    const url = buildLensMap(
      size.width + 2 * PAD,
      size.height + 2 * PAD,
      computedRadius,
      activeParams.splay,
      activeParams.curve,
      activeParams.feather
    );
    setMapUrl(url);
  }, [size.width, size.height, computedRadius, activeParams.splay, activeParams.curve, activeParams.feather]);

  // Sync background scene clone and offset positioning in requestAnimationFrame loop
  useEffect(() => {
    const tick = () => {
      const sceneEl = document.getElementById('liquid-glass-scene');
      const container = containerRef.current;
      const clone = cloneRef.current;

      if (sceneEl && container && clone) {
        // Clone HTML structure once it's available and not already cloned
        if (clone.children.length === 0) {
          clone.innerHTML = sceneEl.innerHTML;
        }

        const sceneRect = sceneEl.getBoundingClientRect();
        const lensRect = container.getBoundingClientRect();

        // Calculate offset position of this element relative to the background scene
        const leftOffset = lensRect.left - sceneRect.left;
        const topOffset = lensRect.top - sceneRect.top;

        // Size clone container to match actual scene dimensions exactly
        clone.style.width = `${sceneRect.width}px`;
        clone.style.height = `${sceneRect.height}px`;

        // Position clone to line up with the background (adjusting for refraction's margin offset)
        clone.style.left = `${-leftOffset + PAD}px`;
        clone.style.top = `${-topOffset + PAD}px`;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [size]);

  const Tag = tagName;

  // Custom inline styles for container to ensure correct isolation
  const containerStyles = {
    position: 'relative',
    isolation: 'isolate', // Contain mix-blend-modes of inner layers
    ...style
  };

  return (
    <>
      {/* SVG Displacement Map definition */}
      {mapUrl && (
        <svg
          width="0"
          height="0"
          style={{ position: 'absolute', pointerEvents: 'none', width: 0, height: 0 }}
          aria-hidden="true"
        >
          <defs>
            <filter
              id={`liquid-glass-filter-${filterId}`}
              x="0"
              y="0"
              width="100%"
              height="100%"
              filterUnits="objectBoundingBox"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={mapUrl}
                x="0"
                y="0"
                width={size.width + 2 * PAD}
                height={size.height + 2 * PAD}
                preserveAspectRatio="none"
                result="map"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={activeParams.depth}
                xChannelSelector="R"
                yChannelSelector="G"
                result="disp"
              />
            </filter>
          </defs>
        </svg>
      )}

      <Tag
        ref={containerRef}
        className={`liquid-glass-container ${className}`}
        style={containerStyles}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {/* Rounded mask for composited inner layers */}
        <div 
          className="lens-clip" 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            clipPath: `inset(0 round ${computedRadius}px)`,
            zIndex: -3,
            overflow: 'hidden'
          }}
        >
          {/* Layer 1: Standalone Blur */}
          <div 
            className="lens-blur" 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              filter: activeParams.blur > 0 ? `blur(${activeParams.blur}px)` : 'none',
              willChange: 'filter'
            }}
          >
            {/* Layer 2: SVG Refracted Scene Clone */}
            <div
              className="lens-refraction"
              style={{
                position: 'absolute',
                filter: mapUrl ? `url(#liquid-glass-filter-${filterId})` : 'none',
                width: `${size.width + 2 * PAD}px`,
                height: `${size.height + 2 * PAD}px`,
                left: `${-PAD}px`,
                top: `${-PAD}px`,
                transformOrigin: 'top left',
                clipPath: `inset(${PAD}px round ${computedRadius}px)`,
                pointerEvents: 'none',
                willChange: 'filter',
                overflow: 'hidden'
              }}
            >
              {/* Cloned DOM of background scene sits here, aligned by negative top/left */}
              <div 
                ref={cloneRef} 
                className="refraction-scene-clone" 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transformOrigin: 'top left'
                }}
              />
            </div>
          </div>

          {/* Layer 3: Glass Color Tint (Multiply Blend Mode) */}
          <div
            className="lens-tint"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              mixBlendMode: 'multiply',
              backgroundColor: activeParams.tintColor,
              opacity: activeParams.tint,
              transition: 'opacity 0.3s ease, background-color 0.3s ease'
            }}
          />

          {/* Layer 4: Bevel Highlight Overlay (Glint) */}
          <div
            className="lens-glint"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              boxShadow: `inset 1.5px 1.5px 4px rgba(255, 255, 255, 0.4), inset -1.5px -1.5px 4px rgba(0, 0, 0, 0.25)`,
              opacity: activeParams.glint / 100,
              transition: 'opacity 0.3s ease'
            }}
          />
        </div>

        {/* Content Wrapper */}
        <div 
          className="liquid-glass-content" 
          style={{ 
            position: 'relative', 
            zIndex: 1, 
            height: '100%', 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 'inherit' 
          }}
        >
          {children}
        </div>
      </Tag>
    </>
  );
}
