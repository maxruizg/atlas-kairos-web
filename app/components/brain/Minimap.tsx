import { useEffect, useRef } from "react";
import type { GraphNode } from "~/lib/graph/graph-types";
import type { GraphColors } from "~/lib/graph/graph-colors";

export interface MinimapProps {
  /** react-force-graph ref (for screen2GraphCoords viewport readout). */
  fgRef: React.MutableRefObject<any>;
  /** Live nodes array (positions mutated in place by the sim). */
  nodes: GraphNode[];
  colors: GraphColors;
  containerSize: { w: number; h: number };
}

const MAP_W = 168;
const MAP_H = 112;
const PAD = 8;

export function Minimap({ fgRef, nodes, colors, containerSize }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) { raf = requestAnimationFrame(draw); return; }

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== MAP_W * dpr) { canvas.width = MAP_W * dpr; canvas.height = MAP_H * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, MAP_W, MAP_H);

      const positioned = nodes.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
      if (positioned.length === 0) { raf = requestAnimationFrame(draw); return; }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of positioned) {
        minX = Math.min(minX, n.x!); maxX = Math.max(maxX, n.x!);
        minY = Math.min(minY, n.y!); maxY = Math.max(maxY, n.y!);
      }
      const gW = maxX - minX || 1, gH = maxY - minY || 1;
      const scale = Math.min((MAP_W - PAD * 2) / gW, (MAP_H - PAD * 2) / gH);
      const ox = (MAP_W - gW * scale) / 2;
      const oy = (MAP_H - gH * scale) / 2;
      const tx = (x: number) => ox + (x - minX) * scale;
      const ty = (y: number) => oy + (y - minY) * scale;

      // Nodes
      for (const n of positioned) {
        ctx.fillStyle = colors.nodeType(n.type);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(tx(n.x!), ty(n.y!), 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Viewport rectangle
      const fg = fgRef.current;
      if (fg?.screen2GraphCoords && containerSize.w > 0) {
        try {
          const tl = fg.screen2GraphCoords(0, 0);
          const br = fg.screen2GraphCoords(containerSize.w, containerSize.h);
          ctx.strokeStyle = colors.tokens.purple;
          ctx.lineWidth = 1;
          ctx.strokeRect(tx(tl.x), ty(tl.y), (br.x - tl.x) * scale, (br.y - tl.y) * scale);
        } catch {
          /* coords not ready yet */
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [fgRef, nodes, colors, containerSize.w, containerSize.h]);

  return (
    <div className="absolute right-4 bottom-4 z-[110] rounded-lg overflow-hidden border border-atlas-border bg-atlas-card/90 backdrop-blur shadow-lg">
      <canvas ref={canvasRef} style={{ width: MAP_W, height: MAP_H, display: "block" }} />
    </div>
  );
}
