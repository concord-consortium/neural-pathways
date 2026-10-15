import fs from "fs";
import path from "path";
import { createRng } from "../../generator/alien/rng";
import { NEGATIVE_COLOR, POSITIVE_COLOR, RULE_COLOR } from "../../src/core/colors";
import { layoutNetwork, PILL_GAP, Point } from "../../src/core/network-diagram/layout";

/**
 * Draws the network layout options in docs/images/network-layout-options/ as standalone SVGs, and
 * prints the numbers its README's table reports. Straight columns come from the diagram's own
 * layoutNetwork, so the pictures follow it if it changes. The interleaved, curved and partial
 * columns rearrange its nodes.
 *
 * Usage: npm run draw:network-layout-options [-- <output directory>]
 */

const OUTPUT_DIR = process.argv[2] ?? "docs/images/network-layout-options";

// colors.scss values the diagram's stylesheet uses; colors.ts doesn't export them.
const APPROACH = "#D9722E";
const APPROACH_SOFT = "#FAE6D6";
const APPROACH_TEXT = "#A15522";
const WAIT = "#3A72BE";
const WAIT_TEXT = "#3568AD";
const INK = "#1E242C";
const INK_2 = "#58616F";
const INK_3 = "#6A727C";
const NODE_OUTLINE = "#6E7580";
/** Marks a node a line cuts through. Not a lesson color. */
const CROSSED = "#C0262D";
/** network-drawing.tsx's EDGE_WIDTHS. */
const EDGE_WIDTHS = [1, 2, 3];
/** The pills' sizes, which layout.ts doesn't export. */
const PILL_PAD_LEFT = 4;
const PILL_LABEL_WIDTH = 60;
const PILL_PAD_RIGHT = 13;
/** WCAG 2.5.8: targets under 24 px pass if 24 px circles centered on them don't overlap. */
const TARGET_SPACING = 24;

interface Size { label: string; width: number; height: number }

/** The smallest diagram Trace a Case draws, and what it gets at its designed 1024 × 562. */
const SIZES: Size[] = [
  { label: "Smallest layout, 380 × 300", width: 380, height: 300 },
  { label: "About the designed size, 510 × 339", width: 510, height: 339 },
];

type Shape =
  | { kind: "straight" }
  /** `shown` nodes, then a "+n more" marker in the next row. */
  | { kind: "partial"; shown: number }
  /** Alternating between two lines, so neighbors stay as far apart as in a 10-node column. */
  | { kind: "zigzag" }
  /** Along an arc as long as a 10-node column's spacing needs, bowed by `bow`: -1 left, 1 right. */
  | { kind: "arc"; bow: -1 | 1 };

interface Column { count: number; caption: string; shape?: Shape }

interface Option {
  file: string;
  title: string;
  subtitle: string;
  columns: Column[];
  sizes?: Size[];
  /** Moves the first column right, for shapes that reach further left than a straight column. */
  firstColumnRoom?: number;
}

interface Drawing {
  radius: number;
  nodes: Point[][];
  columnX: number[];
  captionY: number;
  more: { at: Point; count: number }[];
  pillWidth: number;
}

function rowsOf(column: Column): number {
  return column.shape?.kind === "partial" ? column.shape.shown + 1 : column.count;
}

/** Puts a column's nodes on an arc through its straight column's ends, keeping `step` between them. */
function arc(count: number, x: number, top: number, bottom: number, step: number, bow: number): Point[] {
  const chord = bottom - top;
  const length = (count - 1) * step;
  const middle = (top + bottom) / 2;
  if (length <= chord) {
    return Array.from({ length: count }, (_, i) => ({ x, y: middle - length / 2 + i * step }));
  }
  // The half angle t with sin(t) / t = chord / length, by bisection.
  let low = 1e-6;
  let high = Math.PI - 1e-6;
  for (let round = 0; round < 80; round++) {
    const t = (low + high) / 2;
    if (Math.sin(t) / t > chord / length) {
      low = t;
    } else {
      high = t;
    }
  }
  const half = (low + high) / 2;
  const radius = length / (2 * half);
  const sagitta = radius * (1 - Math.cos(half));
  return Array.from({ length: count }, (_, i) => {
    const angle = -half + (2 * half * i) / (count - 1);
    const offset = radius * Math.cos(angle) - radius * Math.cos(half) - sagitta / 2;
    return { x: x + bow * offset, y: middle + radius * Math.sin(angle) };
  });
}

function draw(option: Option, size: Size): Drawing {
  const shaped = option.columns.some(column => column.shape && column.shape.kind !== "straight"
    && column.shape.kind !== "partial");
  // Straight and partial columns take the layout's own sizing. The rearranged shapes keep the node
  // size and spacing of a 10-node column, today's tallest, and fit the taller column in another way.
  const sizing = shaped
    ? option.columns.map(column => (column.shape && column.shape.kind !== "partial" ? 10 : rowsOf(column)))
    : option.columns.map(rowsOf);
  const base = layoutNetwork(sizing, size.width, size.height);
  const reference = layoutNetwork(option.columns.map(column => (column.shape ? 10 : rowsOf(column))),
    size.width, size.height);
  const tallest = layoutNetwork(option.columns.map(rowsOf), size.width, size.height);
  const step = reference.nodes[0][1].y - reference.nodes[0][0].y;
  // The room moves the first column right and squeezes the gaps after it, so the last column stays.
  const last = option.columns.length - 1;
  const columnX = base.columnX.map((x, i) => x + (option.firstColumnRoom ?? 0) * (1 - i / last));
  const more: Drawing["more"] = [];

  const nodes = option.columns.map((column, i): Point[] => {
    const x = columnX[i];
    const placed = tallest.nodes[i].map(p => ({ x, y: p.y }));
    const shape = column.shape ?? { kind: "straight" };
    switch (shape.kind) {
      case "partial":
        more.push({ at: placed[shape.shown], count: column.count - shape.shown });
        return base.nodes[i].slice(0, shape.shown).map(p => ({ x, y: p.y }));
      case "zigzag": {
        const pitch = placed[1].y - placed[0].y;
        const across = Math.sqrt(Math.max(0, step * step - pitch * pitch));
        return placed.map((p, row) => ({ x: x + (row % 2 === 0 ? -across / 2 : across / 2), y: p.y }));
      }
      case "arc":
        return arc(column.count, x, placed[0].y, placed[placed.length - 1].y, step, shape.bow);
      default:
        return base.nodes[i].map(p => ({ x, y: p.y }));
    }
  });
  return {
    radius: base.radius,
    nodes,
    columnX,
    captionY: base.captionY,
    more,
    pillWidth: PILL_PAD_LEFT + base.radius * 2 + PILL_GAP + PILL_LABEL_WIDTH + PILL_PAD_RIGHT,
  };
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

interface Measures {
  nearest: number;
  lines: number;
  linesThrough: number;
  crossed: Set<Point>;
}

/** The closest two node centers, and the lines that pass through a node they don't connect to. */
function measure(drawing: Drawing): Measures {
  const all = drawing.nodes.flat();
  let nearest = Infinity;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      nearest = Math.min(nearest, Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y));
    }
  }
  let lines = 0;
  let linesThrough = 0;
  const crossed = new Set<Point>();
  for (let c = 0; c < drawing.nodes.length - 1; c++) {
    for (const a of drawing.nodes[c]) {
      for (const b of drawing.nodes[c + 1]) {
        lines++;
        // Through the node, not just grazing its rim.
        const through = all.filter(p => p !== a && p !== b && distanceToSegment(p, a, b) < drawing.radius - 1);
        through.forEach(p => crossed.add(p));
        if (through.length > 0) linesThrough++;
      }
    }
  }
  return { nearest, lines, linesThrough, crossed };
}

const fixed = (value: number) => value.toFixed(1);
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const lato = `font-family="Lato, Arial, sans-serif"`;

function panelSvg(option: Option, size: Size, drawing: Drawing, measures: Measures, seed: number): string {
  // Seeded, so the random colors and fills come out the same on every run.
  const rng = createRng(seed);
  const random = () => rng.next();
  const last = drawing.nodes.length - 1;
  const out: string[] = [`<rect width="${size.width}" height="${size.height}" fill="#fff" stroke="${RULE_COLOR}"/>`];
  // Every line colored and banded, as if mid forward pass.
  for (let c = 0; c < last; c++) {
    for (const a of drawing.nodes[c]) {
      for (const b of drawing.nodes[c + 1]) {
        const color = random() < 0.5 ? POSITIVE_COLOR : NEGATIVE_COLOR;
        const width = EDGE_WIDTHS[Math.floor(random() * EDGE_WIDTHS.length)];
        out.push(`<line x1="${fixed(a.x)}" y1="${fixed(a.y)}" x2="${fixed(b.x)}" y2="${fixed(b.y)}" `
          + `stroke="${color}" stroke-width="${width}" stroke-opacity="0.45"/>`);
      }
    }
  }
  const r = drawing.radius;
  drawing.nodes.forEach((column, c) => column.forEach((p, row) => {
    if (c === last) {
      const approach = row === 0;
      const height = r * 2 + 8;
      out.push(`<rect x="${fixed(p.x - r - PILL_PAD_LEFT)}" y="${fixed(p.y - height / 2)}" `
        + `width="${drawing.pillWidth}" height="${height}" rx="${height / 2}" `
        + `fill="${approach ? APPROACH_SOFT : "#fff"}" stroke="${approach ? APPROACH : WAIT}" stroke-width="2"/>`);
      out.push(`<text x="${fixed(p.x + r + PILL_GAP)}" y="${fixed(p.y + 4)}" `
        + `font-family="Barlow Condensed, Arial Narrow, sans-serif" font-size="13" font-weight="600" `
        + `fill="${approach ? APPROACH_TEXT : WAIT_TEXT}">${approach ? "APPROACH" : "WAIT"}</text>`);
    }
    const crossed = measures.crossed.has(p);
    out.push(`<circle cx="${fixed(p.x)}" cy="${fixed(p.y)}" r="${r}" fill="#fff" `
      + `stroke="${crossed ? CROSSED : NODE_OUTLINE}" stroke-width="${crossed ? 2 : 1}"/>`);
    if (c < last) {
      // A gauge filled from the bottom, as the diagram shows an activation.
      const level = random();
      const height = 2 * r * (0.35 + 0.6 * level);
      const clip = `clip-${seed}-${c}-${row}`;
      out.push(`<clipPath id="${clip}"><circle cx="${fixed(p.x)}" cy="${fixed(p.y)}" r="${r - 1}"/></clipPath>`);
      out.push(`<rect clip-path="url(#${clip})" x="${fixed(p.x - r)}" y="${fixed(p.y + r - height)}" width="${2 * r}" `
        + `height="${fixed(height)}" fill="${level < 0.5 ? NEGATIVE_COLOR : POSITIVE_COLOR}" fill-opacity="0.75"/>`);
    }
  }));
  for (const { at, count } of drawing.more) {
    out.push(`<text x="${fixed(at.x)}" y="${fixed(at.y + 4)}" text-anchor="middle" ${lato} font-size="12" `
      + `fill="${INK_2}">+${count} more</text>`);
  }
  option.columns.forEach((column, c) => {
    const count = column.shape?.kind === "partial" ? `${column.shape.shown} of ${column.count}` : `${column.count}`;
    out.push(`<text x="${fixed(drawing.columnX[c])}" y="${drawing.captionY}" text-anchor="middle" ${lato} `
      + `font-size="12" fill="${INK_2}">${escape(column.caption)}</text>`);
    out.push(`<text x="${fixed(drawing.columnX[c])}" y="${drawing.captionY + 14}" text-anchor="middle" ${lato} `
      + `font-size="11" fill="${INK_3}">${count}</text>`);
  });
  return out.join("\n");
}

function render(option: Option): void {
  const sizes = option.sizes ?? SIZES;
  const margin = 20;
  const gap = 30;
  const titleHeight = 56;
  const factsHeight = 92;
  const width = margin * 2 + gap * (sizes.length - 1) + sizes.reduce((sum, size) => sum + size.width, 0);
  const height = titleHeight + Math.max(...sizes.map(size => size.height)) + factsHeight;
  const parts: string[] = [];
  console.log(option.file);
  let x = margin;
  sizes.forEach((size, k) => {
    const drawing = draw(option, size);
    const measures = measure(drawing);
    const panel = panelSvg(option, size, drawing, measures, 7 + k);
    parts.push(`<g transform="translate(${x},${titleHeight})">\n${panel}\n</g>`);
    const spacing = measures.nearest >= TARGET_SPACING ? "meets" : "under";
    const facts = [
      size.label,
      `Node radius ${drawing.radius} px (${2 * drawing.radius} px across)`,
      `Nearest node centers ${measures.nearest.toFixed(1)} px apart (${spacing} the ${TARGET_SPACING} px spacing)`,
      `${measures.linesThrough} of ${measures.lines} lines cut through a node they don't connect to`,
    ];
    facts.forEach((line, i) => {
      const weight = i === 0 ? `font-size="12" font-weight="700"` : `font-size="11"`;
      parts.push(`<text x="${x}" y="${titleHeight + size.height + 18 + i * 15}" ${lato} ${weight} `
        + `fill="${INK_2}">${escape(line)}</text>`);
    });
    console.log(`  ${size.label.padEnd(42)} radius ${drawing.radius}  nearest ${measures.nearest.toFixed(1)}  `
      + `through ${measures.linesThrough}/${measures.lines}`);
    x += size.width + gap;
  });
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<title>${escape(option.title)}</title>`,
    `<rect width="100%" height="100%" fill="#fff"/>`,
    `<text x="${margin}" y="26" ${lato} font-size="16" font-weight="700" fill="${INK}">${escape(option.title)}</text>`,
    `<text x="${margin}" y="44" ${lato} font-size="12" fill="${INK_2}">${escape(option.subtitle)}</text>`,
    ...parts,
    `<text x="${margin}" y="${height - 14}" ${lato} font-size="11" fill="${INK_3}">Red rings mark nodes that a line `
      + `cuts through. Line colors and widths, and node fills, are random, as if mid forward pass.</text>`,
    `</svg>`,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUTPUT_DIR, option.file), svg);
}

const inputs = (count: number, shape?: Shape): Column => ({ count, caption: "Input Layer", shape });
const pathwayLayer: Column = { count: 10, caption: "Hidden Layer 1" };
const decisionLayer: Column = { count: 4, caption: "Hidden Layer 2" };
const outputs: Column = { count: 2, caption: "Output Layer" };

/** 13 nodes 24 px apart need 12 × 24 px between the first and the last, plus the layout's 58 px. */
const TALL_ENOUGH: Size[] = [
  { label: "Smallest layout, 46 px taller: 380 × 346", width: 380, height: 346 },
  { label: "Designed width, 7 px taller: 510 × 346", width: 510, height: 346 },
];

const OPTIONS: Option[] = [
  {
    file: "1-today-10-8-6-2.svg",
    title: "Today: 10 → 8 → 6 → 2 (for reference)",
    subtitle: "The toy network. Factor analysis can't recover the alien pathways from it.",
    columns: [inputs(10), { count: 8, caption: "Hidden Layer 1" }, { count: 6, caption: "Hidden Layer 2" }, outputs],
  },
  {
    file: "2-straight-13-10-4-2.svg",
    title: "A. Straight columns: 13 → 10 → 4 → 2",
    subtitle: "Every node drawn in a straight column, at today's heights, sized by today's layout rule.",
    columns: [inputs(13), pathwayLayer, decisionLayer, outputs],
  },
  {
    file: "3-straight-taller-13-10-4-2.svg",
    title: "B. Straight columns, tall enough for 24 px spacing: 13 → 10 → 4 → 2",
    subtitle: "Option A with the diagram 346 px tall, the least that keeps 13 nodes 24 px apart.",
    sizes: TALL_ENOUGH,
    columns: [inputs(13), pathwayLayer, decisionLayer, outputs],
  },
  {
    file: "4-partial-input-10-of-13-10-4-2.svg",
    title: "C. Part of the input layer: 10 of 13 → 10 → 4 → 2",
    subtitle: "Only 10 inputs drawn, with a \"+3 more\" marker. Today's heights.",
    columns: [inputs(13, { kind: "partial", shown: 10 }), pathwayLayer, decisionLayer, outputs],
  },
  {
    file: "5-zigzag-input-13-10-4-2.svg",
    title: "D. Interleaved input layer: 13 → 10 → 4 → 2",
    subtitle: "Today's node size and heights. The 13 inputs zigzag between two lines, keeping neighbors as far "
      + "apart as today's.",
    firstColumnRoom: 8,
    columns: [inputs(13, { kind: "zigzag" }), pathwayLayer, decisionLayer, outputs],
  },
  {
    file: "6-arc-input-13-10-4-2.svg",
    title: "E. Curved input layer: 13 → 10 → 4 → 2",
    subtitle: "Today's node size, spacing and heights. The 13 inputs follow an arc, bowed toward the left edge.",
    firstColumnRoom: 14,
    columns: [inputs(13, { kind: "arc", bow: -1 }), pathwayLayer, decisionLayer, outputs],
  },
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
OPTIONS.forEach(render);
