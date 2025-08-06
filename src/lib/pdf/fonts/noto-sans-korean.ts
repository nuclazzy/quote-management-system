// Noto Sans Korean 폰트 Base64 데이터
// Google Fonts에서 제공하는 무료 한글 폰트

export const NOTO_SANS_KOREAN = {
  // Noto Sans Korean Regular 폰트 데이터
  regular: null as string | null,
  
  // 폰트 로딩 여부 체크
  isLoaded: false,
  
  // Google Fonts CDN에서 폰트 로드
  async loadFromCDN(): Promise<string | null> {
    try {
      // Google Fonts API를 통한 Noto Sans Korean 로드
      const fontUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap';
      
      // 실제 구현에서는 CSS에서 폰트 URL을 추출하고
      // 해당 폰트 파일을 fetch하여 base64로 변환해야 합니다
      console.info('Noto Sans Korean font loading from CDN');
      return null;
    } catch (error) {
      console.error('Failed to load Noto Sans Korean from CDN:', error);
      return null;
    }
  }
};

// 한글 지원을 위한 유니코드 범위
export const KOREAN_UNICODE_RANGES = {
  // 한글 자모
  JAMO: [0x1100, 0x11FF],
  // 한글 자모 확장-A
  JAMO_EXT_A: [0xA960, 0xA97F], 
  // 한글 자모 확장-B
  JAMO_EXT_B: [0xD7B0, 0xD7FF],
  // 한글 음절
  SYLLABLES: [0xAC00, 0xD7AF],
  // 한글 호환 자모
  COMPAT_JAMO: [0x3130, 0x318F],
  // 반각 및 전각 형태
  HALFWIDTH_FULLWIDTH: [0xFF00, 0xFFEF]
};

// 한글 텍스트 감지
export function containsKorean(text: string): boolean {
  return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
}

// 폰트 fallback 체인
export const FONT_FALLBACK_CHAIN = [
  'NotoSansKR',
  'Noto Sans KR',
  'NanumGothic',
  'Malgun Gothic', 
  'Apple Gothic',
  'Dotum',
  'Helvetica',
  'Arial',
  'sans-serif'
];