// 스페이싱 시스템 (8px 기준)
export const spacing = {
  0: '0px',
  1: '4px', // 0.5 * 8px
  2: '8px', // 1 * 8px
  3: '12px', // 1.5 * 8px
  4: '16px', // 2 * 8px
  5: '20px', // 2.5 * 8px
  6: '24px', // 3 * 8px
  7: '28px', // 3.5 * 8px
  8: '32px', // 4 * 8px
  9: '36px', // 4.5 * 8px
  10: '40px', // 5 * 8px
  12: '48px', // 6 * 8px
  14: '56px', // 7 * 8px
  16: '64px', // 8 * 8px
  20: '80px', // 10 * 8px
  24: '96px', // 12 * 8px
  28: '112px', // 14 * 8px
  32: '128px', // 16 * 8px
  36: '144px', // 18 * 8px
  40: '160px', // 20 * 8px
  44: '176px', // 22 * 8px
  48: '192px', // 24 * 8px
  52: '208px', // 26 * 8px
  56: '224px', // 28 * 8px
  60: '240px', // 30 * 8px
  64: '256px', // 32 * 8px
  72: '288px', // 36 * 8px
  80: '320px', // 40 * 8px
  96: '384px', // 48 * 8px
};

// 컨테이너 최대 너비
export const containers = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// 컴포넌트별 스페이싱
export const componentSpacing = {
  // 카드
  card: {
    padding: spacing[6], // 24px
    gap: spacing[4], // 16px
  },

  // 폼
  form: {
    gap: spacing[6], // 24px
    sectionGap: spacing[8], // 32px
    fieldGap: spacing[4], // 16px
  },

  // 레이아웃
  layout: {
    headerHeight: spacing[16], // 64px
    sidebarWidth: '240px',
    contentPadding: spacing[6], // 24px
  },

  // 테이블
  table: {
    cellPadding: spacing[4], // 16px
    rowHeight: spacing[12], // 48px
  },

  // 버튼
  button: {
    padding: {
      small: `${spacing[2]} ${spacing[4]}`, // 8px 16px
      medium: `${spacing[3]} ${spacing[6]}`, // 12px 24px
      large: `${spacing[4]} ${spacing[8]}`, // 16px 32px
    },
    gap: spacing[2], // 8px
  },

  // 다이얼로그/모달
  dialog: {
    padding: spacing[6], // 24px
    maxWidth: containers.md, // 768px
  },
};

// 기본 export
export const base = spacing;
