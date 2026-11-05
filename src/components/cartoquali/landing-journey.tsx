import { useEffect, useRef, type ReactNode } from "react";
import {
  HERO_PHASE,
  clamp,
  figureTransforms,
  journeyTarget,
  mix,
  poseAt,
  ramp,
  standing,
  type FigurePart,
  type Keyframe,
  type Pose,
} from "@/lib/landing-journey";

// The client's visit, told behind the page as the visitor scrolls: arrives, waits, is served, rates.
// All of it is a static illustration: no data, no third-party assets, nothing read from the product.

const GROUND = 190;

const paint = {
  navy: "var(--color-brand-navy)",
  gold: "var(--color-brand-gold)",
  goldDark: "var(--color-brand-gold-dark)",
  paper: "var(--color-brand-paper)",
  blue: "var(--primary)",
  star: "var(--rating)",
  sky: "#d7e3ef",
  skyFar: "#bfd0e0",
  wall: "#ece3d0",
  wallLow: "#d9cdb4",
  floor: "#c7b89b",
  wood: "#8a6a45",
  woodDark: "#6e5236",
  green: "#4f7f68",
  greenDark: "#3c6553",
  stone: "#f3eee3",
  stoneDark: "#ddd4c2",
  sidewalk: "#cfc8ba",
  street: "#9fabb9",
  skinClient: "#8d5a3b",
  hairClient: "#2c1c14",
  blouse: "#d9a441",
  skinClerk: "#d4a27c",
  hairClerk: "#4a3324",
  skinOther: "#b98258",
  coatOther: "#6d7f96",
} as const;

const journeyBeats = [
  {
    title: "Ela chega ao cartório.",
    text: "Toda avaliação começa com alguém que precisava de um serviço.",
  },
  {
    title: "Espera ser chamada.",
    text: "Cada minuto de espera forma uma opinião. Sem perguntar, o cartório não fica sabendo.",
  },
  {
    title: "Recebe o serviço.",
    text: "Saiu satisfeita e, como quase todo mundo, iria embora sem dizer nada.",
  },
  {
    title: "E conta como foi, pelo QR Code.",
    text: "Sem aplicativo e sem cadastro, antes de sair. A opinião dela agora chega à gestão.",
  },
] as const;

const SEAT_X = -120;
const seated: Partial<Pose> = {
  x: SEAT_X,
  thighF: -88,
  shinF: 88,
  thighB: -80,
  shinB: 80,
  armF: -24,
  foreF: -58,
  armB: -18,
  foreB: -50,
  lean: 2,
};

const clientTracks: Keyframe[][] = [
  [
    { at: 0, pose: { x: -430, walk: 1 } },
    { at: 0.84, pose: { x: 180, walk: 1 } },
    { at: 1, pose: { x: 240, walk: 1 } },
  ],
  [
    { at: 0, pose: { ...seated, head: 4 } },
    { at: 0.16, pose: { ...seated, head: -8 } },
    { at: 0.3, pose: { ...seated, head: 6 } },
    { at: 0.44, pose: { ...seated, head: -12 } },
    { at: 0.54, pose: { ...seated, head: -12 } },
    { at: 0.62, pose: { x: SEAT_X, head: -4 } },
    { at: 0.66, pose: { x: SEAT_X + 8, walk: 1 } },
    { at: 1, pose: { x: 470, walk: 1 } },
  ],
  [
    { at: 0, pose: { x: -440, walk: 1 } },
    { at: 0.2, pose: { x: -4, walk: 1 } },
    { at: 0.24, pose: { x: 0 } },
    { at: 0.38, pose: { x: 0, armF: 0, head: 4 } },
    { at: 0.46, pose: { x: 0, armF: -24, foreF: -14, lean: 5, head: 8 } },
    { at: 0.52, pose: { x: 0, armF: -24, foreF: -14, lean: 5, head: 8 } },
    { at: 0.6, pose: { x: 0, armF: -34, foreF: -82, head: -6 } },
    { at: 1, pose: { x: 0, armF: -34, foreF: -82, head: -6 } },
  ],
  [
    { at: 0, pose: { x: -470, walk: 1 } },
    { at: 0.18, pose: { x: -194, walk: 1 } },
    { at: 0.22, pose: { x: -190 } },
    { at: 0.3, pose: { x: -190, armF: -60, foreF: -45, head: 6 } },
    { at: 1, pose: { x: -190, armF: -60, foreF: -45, head: 4 } },
  ],
];

const clerkTrack: Keyframe[] = [
  { at: 0, pose: { armF: 6, foreF: -60, lean: 6 } },
  { at: 0.2, pose: { armF: -8, foreF: -70, lean: 6 } },
  { at: 0.27, pose: { armF: -62, foreF: -56, lean: 6 } },
  { at: 0.32, pose: { armF: -28, foreF: -22, lean: 10 } },
  { at: 0.36, pose: { armF: -28, foreF: -22, lean: 10 } },
  { at: 0.39, pose: { armF: -50, foreF: -40, lean: 6 } },
  { at: 0.44, pose: { armF: -66, foreF: -12, lean: 12 } },
  { at: 0.5, pose: { armF: -66, foreF: -12, lean: 12 } },
  { at: 0.58, pose: { armF: 4, foreF: -30, lean: 4 } },
  { at: 1, pose: { armF: 4, foreF: -30, lean: 4 } },
];

/** A moment that reads well as a still image, used when the visitor prefers reduced motion. */
const stillPhase = [0.7, 0.46, 0.7, 0.8];

/** On wide screens the action moves off the caption's corner. */
const wideShift = [0, 90, 40, 90];

/** How small the street starts, so all of it fits the strip below the hero. */
const farScale = { wide: 0.3, narrow: 0.5 };

const limb = (color: string, width: number) => ({
  stroke: color,
  strokeWidth: width,
  strokeLinecap: "round" as const,
});

function Figure({
  name,
  pose,
  skin,
  hair,
  top,
  bottom,
  shoe,
  hairStyle,
  children,
  bag,
}: {
  name?: string;
  pose: Pose;
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoe: string;
  hairStyle: "long" | "short";
  children?: ReactNode;
  bag?: boolean;
}) {
  const t = figureTransforms(pose, GROUND);
  const part = (id: FigurePart) => ({
    "data-part": name ? `${name}.${id}` : undefined,
    transform: t[id],
  });
  return (
    <g {...part("root")}>
      <g {...part("armB")}>
        <line x1="0" y1="0" x2="0" y2="46" {...limb(top, 15)} />
        <g {...part("foreB")}>
          <line x1="0" y1="0" x2="0" y2="42" {...limb(skin, 12)} />
        </g>
      </g>
      <g {...part("thighB")}>
        <line x1="0" y1="0" x2="0" y2="62" {...limb(bottom, 21)} />
        <g {...part("shinB")}>
          <line x1="0" y1="0" x2="0" y2="58" {...limb(bottom, 17)} />
          <path d="M-9 56h16a12 8 0 0 1 12 8v2h-28z" fill={shoe} />
        </g>
      </g>
      <g {...part("thighF")}>
        <line x1="0" y1="0" x2="0" y2="62" {...limb(bottom, 22)} />
        <g {...part("shinF")}>
          <line x1="0" y1="0" x2="0" y2="58" {...limb(bottom, 18)} />
          <path d="M-9 56h16a12 8 0 0 1 12 8v2h-28z" fill={shoe} />
        </g>
      </g>
      <g {...part("torso")}>
        {bag && (
          <>
            <path d="M6 -80 L-19 -18" stroke={paint.woodDark} strokeWidth="3" fill="none" />
            <rect x="-34" y="-22" width="30" height="24" rx="5" fill={paint.woodDark} />
          </>
        )}
        <path d="M-17 -80q17 -9 36 0l3 84h-42z" fill={top} />
        <rect x="-3" y="-98" width="14" height="22" rx="6" fill={skin} />
        <g {...part("head")}>
          {hairStyle === "long" && (
            <path
              d="M-26 -22c-2 -24 16 -32 30 -30c16 2 22 14 18 22l-20 2l-4 44c-12 2 -24 -14 -24 -38z"
              fill={hair}
            />
          )}
          <circle cx="3" cy="-24" r="21" fill={skin} />
          <path d="M23 -24l6 6l-7 2z" fill={skin} />
          {hairStyle === "long" ? (
            <path
              d="M-17 -30c0 -14 12 -22 25 -20c10 1 16 8 16 13c-14 2 -26 0 -32 -3c-1 4 -4 8 -9 10z"
              fill={hair}
            />
          ) : (
            <path
              d="M-19 -22c-4 -20 12 -28 25 -26c11 1 18 8 18 14c-12 1 -22 0 -29 -3c0 6 -3 12 -6 16c-3 2 -7 1 -8 -1z"
              fill={hair}
            />
          )}
          <circle cx="14" cy="-27" r="2.4" fill={paint.navy} />
          <path
            data-part={name ? `${name}.smile` : undefined}
            d="M8 -14q6 5 12 0"
            fill="none"
            stroke={paint.navy}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
        <g {...part("armF")}>
          <line x1="0" y1="0" x2="0" y2="46" {...limb(top, 16)} />
          <g {...part("foreF")}>
            <line x1="0" y1="0" x2="0" y2="42" {...limb(skin, 13)} />
            {children}
          </g>
        </g>
      </g>
    </g>
  );
}

function Tree({ x, scale = 1 }: { x: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${GROUND}) scale(${scale})`}>
      <rect x="-9" y="-130" width="18" height="130" fill={paint.woodDark} />
      <circle cx="0" cy="-185" r="74" fill={paint.green} />
      <circle cx="-48" cy="-140" r="46" fill={paint.greenDark} />
      <circle cx="46" cy="-146" r="50" fill={paint.greenDark} />
    </g>
  );
}

function ArrivalSet() {
  return (
    <g data-set="0">
      <rect x="-4000" y="-2200" width="8000" height="4400" fill={paint.sky} />
      <circle cx="-300" cy="-210" r="48" fill={paint.stone} />
      <path d="M-2600 190V60h300v-70h240v40h280v-90h300v120h260V-20h240v210z" fill={paint.skyFar} />
      <path d="M430 190V-70h260v-60h300v90h260V40h1400v150z" fill={paint.skyFar} />
      <Tree x={-250} />
      <Tree x={-880} scale={0.85} />
      <Tree x={770} scale={0.9} />
      <rect x="-4000" y={GROUND} width="8000" height="60" fill={paint.sidewalk} />
      <rect x="-4000" y={GROUND + 60} width="8000" height="2200" fill={paint.street} />
      <rect x="-4000" y={GROUND + 60} width="8000" height="6" fill={paint.stoneDark} />
      {/* The registry's façade: pediment, name over the door, columns and tall windows. */}
      <rect x="-60" y="-152" width="520" height="342" fill={paint.stone} />
      <path d="M-84 -152L200 -262L484 -152z" fill={paint.stoneDark} />
      <path d="M-44 -162L200 -248L444 -162z" fill={paint.stone} />
      <rect x="-84" y="-152" width="568" height="16" fill={paint.navy} />
      <text
        x="200"
        y="-101"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="700"
        fontSize="34"
        letterSpacing="6"
        fill={paint.navy}
      >
        CARTÓRIO
      </text>
      {[-30, 110, 270, 410].map((x) => (
        <rect key={x} x={x - 8} y="-78" width="20" height="268" fill={paint.stoneDark} />
      ))}
      {[40, 340].map((x) => (
        <g key={x}>
          <path d={`M${x - 30} 90V-20a30 30 0 0 1 60 0V90z`} fill={paint.navy} opacity="0.9" />
          <path d={`M${x} -48V90M${x - 30} 26H${x + 30}`} stroke={paint.stone} strokeWidth="3" />
        </g>
      ))}
      {/* Door: the opening is dark and warm, and the leaves swing away as she reaches it. */}
      <path d="M140 190V-40a60 44 0 0 1 120 0V190z" fill={paint.wood} />
      <path d="M150 190V-36a50 36 0 0 1 100 0V190z" fill="#f4d58d" />
      <g data-part="doorL" transform="translate(150 0)">
        <rect x="0" y="-38" width="50" height="228" fill={paint.woodDark} />
        <rect x="9" y="-22" width="32" height="88" fill={paint.wood} />
        <rect x="9" y="82" width="32" height="88" fill={paint.wood} />
      </g>
      <g data-part="doorR" transform="translate(250 0)">
        <rect x="-50" y="-38" width="50" height="228" fill={paint.woodDark} />
        <rect x="-41" y="-22" width="32" height="88" fill={paint.wood} />
        <rect x="-41" y="82" width="32" height="88" fill={paint.wood} />
      </g>
      <rect x="110" y="182" width="180" height="8" fill={paint.stoneDark} />
    </g>
  );
}

function Chair({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${GROUND})`}>
      <rect x="-30" y="-122" width="9" height="70" rx="4" fill={paint.navy} />
      <rect x="-30" y="-60" width="64" height="11" rx="5" fill={paint.navy} />
      <path
        d="M-22 -50L-30 0M26 -50L34 0"
        stroke={paint.navy}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </g>
  );
}

function InteriorShell({ wall = paint.wall }: { wall?: string }) {
  return (
    <>
      <rect x="-4000" y="-2200" width="8000" height="4400" fill={wall} />
      <rect x="-4000" y={GROUND - 74} width="8000" height="74" fill={paint.wallLow} />
      <rect x="-4000" y={GROUND - 78} width="8000" height="5" fill={paint.goldDark} />
      <rect x="-4000" y={GROUND} width="8000" height="2200" fill={paint.floor} />
      <rect x="-4000" y={GROUND} width="8000" height="5" fill={paint.woodDark} />
    </>
  );
}

function WaitingSet() {
  const other = { ...standing, ...seated };
  return (
    <g data-set="1">
      <InteriorShell />
      {/* Ticket display on the wall: the number advances and her turn arrives. */}
      <g transform="translate(120 -176)">
        <rect x="-102" y="-52" width="204" height="118" rx="8" fill={paint.navy} />
        <text
          x="0"
          y="-20"
          textAnchor="middle"
          fontFamily="var(--font-sans)"
          fontSize="17"
          fontWeight="600"
          fill={paint.stone}
        >
          Senha
        </text>
        <text
          data-part="ticket"
          x="0"
          y="42"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="56"
          fontWeight="700"
          fill={paint.blouse}
        >
          041
        </text>
      </g>
      {/* Wall clock: minutes pass while she waits. */}
      <g transform="translate(-200 -180)">
        <circle r="44" fill={paint.stone} stroke={paint.navy} strokeWidth="7" />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-22"
          stroke={paint.navy}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line
          data-part="clock"
          x1="0"
          y1="0"
          x2="0"
          y2="-34"
          stroke={paint.goldDark}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle r="5" fill={paint.navy} />
      </g>
      <Chair x={-250} />
      <Chair x={SEAT_X} />
      <Chair x={10} />
      <g transform="translate(-130 0)">
        <Figure
          pose={other}
          skin={paint.skinOther}
          hair={paint.hairClerk}
          top={paint.coatOther}
          bottom={paint.navy}
          shoe={paint.woodDark}
          hairStyle="short"
        />
      </g>
      {/* A plant and a shelf of registry books keep the room recognisable without crowding it. */}
      <g transform={`translate(330 ${GROUND})`}>
        <path d="M-24 -56h48l-8 56h-32z" fill={paint.woodDark} />
        <path
          d="M0 -56c-40 -30 -40 -80 -34 -110c20 16 34 50 34 110zM0 -56c40 -30 44 -70 36 -104c-20 16 -36 48 -36 104z"
          fill={paint.green}
        />
        <path d="M0 -56c-8 -40 -4 -90 0 -130c8 40 10 90 0 130z" fill={paint.greenDark} />
      </g>
      <g transform="translate(-520 -150)">
        <rect x="-120" y="52" width="240" height="10" fill={paint.woodDark} />
        {[-104, -76, -48, -20, 8, 36, 64].map((x, index) => (
          <rect
            key={x}
            x={x}
            y={index % 3 === 0 ? -8 : 2}
            width="24"
            height={index % 3 === 0 ? 60 : 50}
            fill={index % 2 === 0 ? paint.navy : paint.goldDark}
          />
        ))}
      </g>
    </g>
  );
}

function BooksShelf({ y }: { y: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      {Array.from({ length: 16 }, (_, index) => (
        <rect
          key={index}
          x={-300 + index * 42}
          y={index % 4 === 1 ? 6 : -4}
          width="36"
          height={index % 4 === 1 ? 54 : 64}
          fill={index % 3 === 0 ? paint.navy : index % 3 === 1 ? paint.goldDark : paint.green}
        />
      ))}
      <rect x="-320" y="60" width="720" height="10" fill={paint.woodDark} />
    </g>
  );
}

function ServiceSet({ clerkPose }: { clerkPose: Pose }) {
  return (
    <g data-set="2">
      <InteriorShell />
      <BooksShelf y={-230} />
      <BooksShelf y={-124} />
      <g transform="translate(190 0) scale(-1 1)">
        <Figure
          name="clerk"
          pose={clerkPose}
          skin={paint.skinClerk}
          hair={paint.hairClerk}
          top={paint.navy}
          bottom={paint.navy}
          shoe={paint.woodDark}
          hairStyle="short"
        >
          <g data-part="stamp">
            <rect x="-6" y="40" width="12" height="16" rx="3" fill={paint.woodDark} />
            <rect x="-12" y="54" width="24" height="9" rx="2" fill={paint.gold} />
          </g>
        </Figure>
      </g>
      {/* Counter between them, with the document that gets stamped and handed over. */}
      <rect x="22" y="92" width="278" height="98" fill={paint.wood} />
      <rect x="10" y="82" width="302" height="12" rx="3" fill={paint.woodDark} />
      <g data-part="doc" transform="translate(120 0)">
        <rect x="-28" y="74" width="56" height="8" rx="1.5" fill={paint.stone} />
        <ellipse data-part="seal" cx="6" cy="76" rx="9" ry="3" fill={paint.gold} opacity="0" />
      </g>
      <g data-part="done" opacity="0" transform="translate(-10 -100)">
        <circle r="26" fill={paint.green} />
        <path
          d="M-11 0l8 9l15 -18"
          fill="none"
          stroke={paint.stone}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

const qrPattern = ["1110111", "1010101", "1110111", "0100010", "1011101", "0110100", "1101011"];

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * index - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  });
  return <polygon points={points.join(" ")} />;
}

function RatingSet() {
  return (
    <g data-set="3">
      <InteriorShell wall="#2f4d78" />
      <rect x="-4000" y={GROUND - 74} width="8000" height="74" fill="#26406a" />
      {/* Exit door behind her: the visit is over, the opinion is what remains. */}
      <g transform={`translate(-560 ${GROUND})`}>
        <rect x="-70" y="-290" width="140" height="290" fill={paint.wood} />
        <rect x="-58" y="-278" width="116" height="278" fill="#f4d58d" />
      </g>
      {/* QR Code stand, as printed for the counter. */}
      <g transform={`translate(-40 ${GROUND})`}>
        <rect x="-5" y="-96" width="10" height="96" fill={paint.stoneDark} />
        <rect x="-30" y="-6" width="60" height="6" rx="2" fill={paint.stoneDark} />
        <rect x="-40" y="-192" width="80" height="104" rx="5" fill={paint.stone} />
        <text
          x="0"
          y="-174"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="11"
          fontWeight="700"
          fill={paint.navy}
        >
          CartoQuali
        </text>
        <g transform="translate(-24.5 -166)" fill={paint.navy}>
          {qrPattern.flatMap((row, y) =>
            [...row].map((cell, x) =>
              cell === "1" ? (
                <rect key={`${x}-${y}`} x={x * 7} y={y * 7} width="7" height="7" />
              ) : null,
            ),
          )}
        </g>
      </g>
      <path data-part="beam" d="M-108 -8L-64 24L-64 73z" fill={paint.blouse} opacity="0" />
      {/* Her phone, enlarged: same question and same screens as the real evaluation. */}
      <g data-part="phone" opacity="0" transform="translate(170 30) scale(0.3)">
        <rect x="-98" y="-178" width="196" height="356" rx="26" fill={paint.navy} />
        <rect x="-88" y="-168" width="176" height="336" rx="18" fill={paint.stone} />
        <rect x="-26" y="-158" width="52" height="6" rx="3" fill={paint.navy} />
        <g data-part="askScreen">
          <text
            x="0"
            y="-114"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontWeight="700"
            fontSize="20"
            fill={paint.navy}
          >
            CartoQuali
          </text>
          <text
            x="0"
            y="-62"
            textAnchor="middle"
            fontFamily="var(--font-sans)"
            fontSize="14"
            fill={paint.navy}
          >
            Como foi sua
          </text>
          <text
            x="0"
            y="-42"
            textAnchor="middle"
            fontFamily="var(--font-sans)"
            fontSize="14"
            fill={paint.navy}
          >
            experiência hoje?
          </text>
          {[0, 1, 2, 3, 4].map((index) => (
            <g key={index} data-part={`star${index}`} fill={paint.stoneDark}>
              <Star cx={-64 + index * 32} cy={6} r={15} />
            </g>
          ))}
          <rect data-part="send" x="-70" y="56" width="140" height="38" rx="8" fill={paint.blue} />
          <text
            x="0"
            y="80"
            textAnchor="middle"
            fontFamily="var(--font-sans)"
            fontSize="13"
            fontWeight="600"
            fill={paint.stone}
          >
            Enviar avaliação
          </text>
        </g>
        <g data-part="thanksScreen" opacity="0">
          <circle cx="0" cy="-58" r="32" fill={paint.green} />
          <path
            d="M-14 -58l10 12l19 -24"
            fill="none"
            stroke={paint.stone}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontWeight="700"
            fontSize="18"
            fill={paint.navy}
          >
            Obrigado pela
          </text>
          <text
            x="0"
            y="30"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontWeight="700"
            fontSize="18"
            fill={paint.navy}
          >
            avaliação!
          </text>
          <text
            x="0"
            y="66"
            textAnchor="middle"
            fontFamily="var(--font-sans)"
            fontSize="12"
            fill={paint.navy}
          >
            Sua opinião ajuda
          </text>
          <text
            x="0"
            y="84"
            textAnchor="middle"
            fontFamily="var(--font-sans)"
            fontSize="12"
            fill={paint.navy}
          >
            o cartório a melhorar.
          </text>
        </g>
      </g>
    </g>
  );
}

const figureParts: FigurePart[] = [
  "root",
  "thighF",
  "shinF",
  "thighB",
  "shinB",
  "torso",
  "head",
  "armF",
  "foreF",
  "armB",
  "foreB",
];

/** Fits the stage: wide screens frame it by height, phones by width. */
function viewBoxFor(width: number, height: number) {
  const aspect = width / Math.max(1, height);
  const wide = aspect >= 1.1;
  const boxWidth = wide ? 640 * aspect : 600;
  const boxHeight = boxWidth / aspect;
  const viewBox = `${(-boxWidth / 2).toFixed(1)} ${(-boxHeight / 2).toFixed(1)} ${boxWidth.toFixed(1)} ${boxHeight.toFixed(1)}`;
  return { viewBox, wide, height: boxHeight };
}

/** The fixed illustration behind the page. It reads where the windows are and redraws to match. */
export function JourneyBackdrop() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const layer = svg.parentElement;
    if (!layer) return;
    const find = (name: string) => svg.querySelector(`[data-part="${name}"]`);
    const partsOf = (name: string) => figureParts.map((id) => [id, find(`${name}.${id}`)] as const);
    const client = partsOf("client");
    const clerk = partsOf("clerk");
    const clientGroup = find("client.group");
    const clientPhone = find("client.phone");
    const clientDoc = find("client.doc");
    const clientSmile = find("client.smile");
    const stamp = find("stamp");
    const doorL = find("doorL");
    const doorR = find("doorR");
    const ticket = find("ticket");
    const clock = find("clock");
    const doc = find("doc");
    const seal = find("seal");
    const done = find("done");
    const beam = find("beam");
    const phone = find("phone");
    const askScreen = find("askScreen");
    const thanksScreen = find("thanksScreen");
    const send = find("send");
    const camera = find("camera");
    const stars = [0, 1, 2, 3, 4].map((index) => find(`star${index}`));
    const sets = [0, 1, 2, 3].map((index) => svg.querySelector(`[data-set="${index}"]`));

    const setAttr = (element: Element | null, name: string, value: string) => {
      if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
    };
    const applyFigure = (
      parts: ReadonlyArray<readonly [FigurePart, Element | null]>,
      pose: Pose,
    ) => {
      const transforms = figureTransforms(pose, GROUND);
      for (const [id, element] of parts) setAttr(element, "transform", transforms[id]);
    };

    let wide = true;
    let halfHeight = 320;
    const placeCamera = (beat: number, phase: number) => {
      const shift = wide ? (wideShift[beat] ?? 0) : 0;
      // The arrival starts as a small street along the bottom edge and closes in as the window opens.
      const closing = beat === 0 ? ramp((phase - HERO_PHASE) / (1 - HERO_PHASE), 0.1, 0.34) : 1;
      const scale = mix(wide ? farScale.wide : farScale.narrow, 1, closing);
      const lift = (halfHeight - 24 - GROUND * scale) * (1 - closing);
      setAttr(
        camera,
        "transform",
        `translate(${shift} ${lift.toFixed(2)}) scale(${scale.toFixed(4)})`,
      );
    };

    const draw = (beat: number, phase: number) => {
      placeCamera(beat, phase);
      sets.forEach((set, index) =>
        setAttr(set, "visibility", index === beat ? "visible" : "hidden"),
      );
      applyFigure(client, poseAt(clientTracks[beat] ?? [], phase));
      const happy = beat === 3 || (beat === 2 && phase > 0.52);
      setAttr(clientSmile, "d", happy ? "M7 -15q7 9 14 0" : "M8 -13q6 2 12 0");
      setAttr(clientPhone, "visibility", beat === 3 ? "visible" : "hidden");
      setAttr(clientDoc, "visibility", beat === 2 && phase > 0.53 ? "visible" : "hidden");
      setAttr(clientGroup, "opacity", beat === 0 ? String(1 - ramp(phase, 0.84, 0.94)) : "1");

      if (beat === 0) {
        const open = ramp(phase, 0.74, 0.84) * (1 - ramp(phase, 0.94, 1));
        setAttr(doorL, "transform", `translate(150 0) scale(${mix(1, 0.14, open).toFixed(3)} 1)`);
        setAttr(doorR, "transform", `translate(250 0) scale(${mix(1, 0.14, open).toFixed(3)} 1)`);
      }
      if (beat === 1) {
        const number = phase >= 0.44 ? "042" : "041";
        if (ticket && ticket.textContent !== number) ticket.textContent = number;
        setAttr(clock, "transform", `rotate(${(phase * 900).toFixed(1)})`);
      }
      if (beat === 2) {
        applyFigure(clerk, poseAt(clerkTrack, phase));
        setAttr(stamp, "visibility", phase < 0.39 ? "visible" : "hidden");
        setAttr(seal, "opacity", phase >= 0.315 ? "1" : "0");
        setAttr(
          doc,
          "transform",
          `translate(${mix(120, 56, ramp(phase, 0.4, 0.48)).toFixed(1)} 0)`,
        );
        setAttr(doc, "visibility", phase > 0.53 ? "hidden" : "visible");
        const pop = ramp(phase, 0.6, 0.68);
        setAttr(done, "opacity", pop.toFixed(2));
        setAttr(done, "transform", `translate(64 -104) scale(${mix(0.4, 1, pop).toFixed(3)})`);
      }
      if (beat === 3) {
        const flash = ramp(phase, 0.29, 0.32) * (1 - ramp(phase, 0.36, 0.4));
        setAttr(beam, "opacity", (flash * 0.6).toFixed(2));
        const shown = ramp(phase, 0.33, 0.41);
        setAttr(phone, "opacity", shown.toFixed(2));
        setAttr(
          phone,
          "transform",
          `translate(170 ${wide ? 30 : -130}) scale(${mix(0.3, 1, shown).toFixed(3)})`,
        );
        stars.forEach((star, index) => {
          const lit = phase >= 0.42 + index * 0.02;
          setAttr(star, "fill", lit ? paint.star : paint.stoneDark);
        });
        const pressed = phase >= 0.52 && phase < 0.54;
        setAttr(send, "fill", pressed ? paint.navy : paint.blue);
        const thanks = ramp(phase, 0.54, 0.58);
        setAttr(askScreen, "opacity", (1 - thanks).toFixed(2));
        setAttr(thanksScreen, "opacity", thanks.toFixed(2));
      }
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bands = () =>
      [...document.querySelectorAll<HTMLElement>("[data-journey-band]")].map((band) =>
        band.getBoundingClientRect(),
      );

    let frame = 0;
    let shownBeat = -1;
    let shownPhase = 0;
    // The first time the street appears she walks in on her own: the page's one unprompted movement.
    let arrived = false;
    let strolling = false;

    const tick = () => {
      frame = 0;
      const target = journeyTarget(bands(), window.innerHeight);
      if (!target) {
        layer.style.visibility = "hidden";
        shownBeat = -1;
        return;
      }
      layer.style.visibility = "visible";
      const still = reduced.matches;
      const destination = still ? (stillPhase[target.beat] ?? 0.5) : target.phase;
      if (target.beat !== shownBeat) {
        shownBeat = target.beat;
        strolling = !arrived && !still && target.beat === 0 && window.scrollY < 40;
        shownPhase = strolling ? 0.1 : destination;
        if (target.beat === 0) arrived = true;
      }
      // Softens wheel steps; the arrival walk is slower because it has a longer way to go.
      const gap = destination - shownPhase;
      if (strolling && Math.abs(gap) < 0.01) strolling = false;
      shownPhase =
        Math.abs(gap) < 0.0008 ? destination : shownPhase + gap * (strolling ? 0.022 : 0.09);
      draw(shownBeat, clamp(shownPhase));
      if (shownPhase !== destination) frame = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      // Once the visitor takes over, the scene follows the scroll instead of its own slow pace.
      strolling = false;
      request();
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const fit = () => {
      const box = viewBoxFor(layer.clientWidth, layer.clientHeight);
      setAttr(svg, "viewBox", box.viewBox);
      wide = box.wide;
      halfHeight = box.height / 2;
      shownBeat = -1;
      request();
    };

    fit();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", fit);
    reduced.addEventListener("change", request);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", fit);
      reduced.removeEventListener("change", request);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none invisible fixed inset-x-0 top-0 z-0 h-lvh overflow-hidden print:hidden"
    >
      <svg
        ref={svgRef}
        role="presentation"
        viewBox="-512 -320 1024 640"
        preserveAspectRatio="xMidYMid slice"
        className="block size-full"
      >
        <g data-part="camera">
          <ArrivalSet />
          <WaitingSet />
          <ServiceSet clerkPose={poseAt(clerkTrack, 0)} />
          <RatingSet />
          <g data-part="client.group">
            <Figure
              name="client"
              pose={poseAt(clientTracks[0] ?? [], 0)}
              skin={paint.skinClient}
              hair={paint.hairClient}
              top={paint.blouse}
              bottom={paint.navy}
              shoe={paint.woodDark}
              hairStyle="long"
              bag
            >
              <g data-part="client.phone" visibility="hidden">
                <rect x="-8" y="30" width="16" height="30" rx="3" fill={paint.hairClient} />
              </g>
              <g data-part="client.doc" visibility="hidden">
                <rect x="-20" y="34" width="40" height="28" rx="2" fill={paint.stone} />
                <circle cx="10" cy="52" r="6" fill={paint.gold} />
              </g>
            </Figure>
          </g>
        </g>
      </svg>
    </div>
  );
}

/** A transparent gap between sections, through which the scene shows, with one line of story. */
export function JourneyWindow({ beat }: { beat: number }) {
  const copy = journeyBeats[beat];
  if (!copy) return null;
  return (
    <div
      data-journey-band
      className="relative flex h-[70svh] items-end border-b border-border px-4 pb-6 sm:h-[85svh] sm:px-6 sm:pb-8 lg:px-8 print:hidden"
    >
      <div className="mx-auto w-full max-w-7xl 2xl:max-w-[1600px]">
        <div className="max-w-md rounded-lg bg-card/95 p-4 shadow-glass sm:p-5">
          <p className="font-display text-lg font-bold leading-snug sm:text-xl">{copy.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.text}</p>
        </div>
      </div>
    </div>
  );
}
