export const CURSOR_SIZE_PX = 36;

export const ART_VIEWBOX = { x: 0, y: 0, w: 820, h: 760 } as const;

export const FINGERTIP = { x: 226, y: 204 } as const;

export const FINGERTIP_ORIGIN = {
  x: (FINGERTIP.x - ART_VIEWBOX.x) / ART_VIEWBOX.w,
  y: (FINGERTIP.y - ART_VIEWBOX.y) / ART_VIEWBOX.h,
} as const;

export const EFFECT_DURATION_S = 0.34;

export const MAX_CONCURRENT_EFFECTS = 24;

export const COLORS = {
  outline: "#0d0d0d",
  glove: "#ffffff",
  gloveShade: "#e1e8ed",
  fold: "#aab6bf",
  ray: "#9124c8",
} as const;

export const OUTLINE_WIDTH = 12;
export const DETAIL_WIDTH = 6;
export const FOLD_WIDTH = 5;
export const RAY_WIDTH = 14;

export const HAND_OUTLINE_PATH =
  "M 236 190 " +
  "C 262 190 300 205 330 232 " +
  "C 345 245 355 255 366 262 " +
  "C 372 246 396 240 418 236 " +
  "C 430 233 436 230 442 226 " +
  "C 464 213 498 209 530 206 " +
  "C 570 190 620 195 660 225 " +
  "C 720 270 765 360 780 450 " +
  "C 790 510 795 540 790 548 " +
  "C 805 580 805 620 780 655 " +
  "C 745 705 680 735 610 740 " +
  "C 560 742 520 715 510 680 " +
  "C 505 660 512 645 520 632 " +
  "C 480 630 440 625 400 626 " +
  "C 360 628 360 634 330 642 " +
  "C 300 652 270 662 242 664 " +
  "C 212 664 192 648 190 625 " +
  "C 188 595 205 565 235 545 " +
  "C 265 525 305 508 345 507 " +
  "C 370 506 392 510 402 520 " +
  "C 398 502 388 486 372 468 " +
  "C 330 428 245 352 205 294 " +
  "C 188 268 183 248 190 226 " +
  "C 196 205 215 190 236 190 Z";

export const HAND_SHADE_PATHS = [
  "M 190 626 C 215 664 300 660 345 642 C 390 628 460 626 520 636 C 460 616 390 614 340 622 C 290 634 230 640 190 626 Z",
  "M 205 294 C 245 352 330 428 372 468 C 388 486 398 502 402 520 C 380 484 335 436 270 372 C 238 340 218 316 205 294 Z",
  "M 366 262 C 372 300 420 352 492 396 C 440 360 398 322 380 280 Z",
  "M 780 450 C 792 510 796 548 790 556 C 806 600 802 630 780 655 C 790 600 784 520 764 450 Z",
] as const;

export const HAND_DETAIL_PATHS = [
  "M 440 228 C 470 238 520 262 560 305 C 595 345 608 385 612 410",
  "M 530 206 C 560 216 600 240 626 278 C 640 300 648 322 650 340",
  "M 562 628 C 650 630 740 600 792 550",
] as const;

export const HAND_FOLD_PATHS = [
  "M 532 644 C 600 654 680 644 760 604",
  "M 548 666 C 612 676 692 668 772 628",
  "M 600 702 C 660 707 722 692 762 662",
  "M 746 470 C 750 510 742 550 724 582",
  "M 732 440 C 738 480 732 520 714 552",
] as const;

export const RAYS: ReadonlyArray<readonly [number, number, number, number]> = [
  [112, 63, 182, 152],
  [254, 22, 254, 133],
  [352, 72, 306, 153],
  [28, 180, 135, 208],
  [48, 332, 145, 292],
];

export const MOTION = {
  hand: {
    opacity: [0, 1, 1, 0],
    opacityTimes: [0, 0.15, 0.65, 1],
    scale: [1.04, 0.92, 0.97, 0.97],
    scaleTimes: [0, 0.3, 0.6, 1],
    nudge: {
      x: [0, -1.5, -0.5, -0.5],
      y: [0, -1.5, -0.5, -0.5],
    },
  },
  rays: {
    opacity: [0, 1, 1, 0],
    opacityTimes: [0, 0.2, 0.6, 1],
    scale: [0.82, 1.0, 1.22],
    scaleTimes: [0, 0.3, 1],
  },
} as const;