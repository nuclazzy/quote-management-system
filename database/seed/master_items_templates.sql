-- ========================================
-- 마스터 품목 및 템플릿 초기 데이터 삽입
-- master_items_templates.sql
-- ========================================

-- 마스터 품목 초기 데이터
INSERT INTO master_items (name, description, default_unit_price, default_unit, category, is_active) VALUES
-- 편집 관련
('기획/스토리보드 작성', '프로젝트 기획 및 스토리보드 제작', 500000, '건', '편집', true),
('영상 편집', '기본 영상 편집 및 컷 편집', 800000, '건', '편집', true),
('모션그래픽 제작', '2D 모션그래픽 및 애니메이션', 1200000, '건', '편집', true),
('컬러그레이딩', '영상 색보정 및 톤 조정', 300000, '건', '편집', true),
('사운드 디자인', '배경음악 및 효과음 편집', 400000, '건', '편집', true),
('자막 작업', '한글/영문 자막 삽입 및 편집', 150000, '건', '편집', true),

-- 촬영 관련
('스튜디오 촬영', '실내 스튜디오에서의 제품/인물 촬영', 800000, '일', '촬영', true),
('야외 촬영', '로케이션 촬영 및 현장 촬영', 1000000, '일', '촬영', true),
('제품 촬영', '전문 제품 사진 촬영', 600000, '일', '촬영', true),
('드론 촬영', '드론을 이용한 항공 촬영', 1500000, '일', '촬영', true),
('스튜디오 대여', '촬영용 스튜디오 공간 대여', 300000, '일', '촬영', true),
('장비 대여', '카메라, 조명 등 촬영 장비 대여', 200000, '일', '촬영', true),

-- 제작 관련
('웹사이트 기획', '웹사이트 구조 설계 및 기획', 800000, '건', '제작', true),
('웹사이트 디자인', 'UI/UX 디자인 및 시안 제작', 1200000, '건', '제작', true),
('웹사이트 개발', '프론트엔드 및 백엔드 개발', 2000000, '건', '제작', true),
('반응형 웹 구현', '모바일 대응 반응형 웹 구현', 800000, '건', '제작', true),
('CMS 구축', '콘텐츠 관리 시스템 구축', 1500000, '건', '제작', true),

-- 그래픽디자인 관련
('로고 디자인', 'CI/BI 로고 디자인', 800000, '건', '그래픽디자인', true),
('브로슈어 디자인', '회사 소개서 및 브로슈어 디자인', 600000, '건', '그래픽디자인', true),
('포스터 디자인', '홍보용 포스터 및 배너 디자인', 400000, '건', '그래픽디자인', true),
('인포그래픽 제작', '데이터 시각화 인포그래픽', 700000, '건', '그래픽디자인', true),
('패키지 디자인', '제품 패키지 및 라벨 디자인', 900000, '건', '그래픽디자인', true),

-- 마케팅 관련
('SNS 콘텐츠 제작', '소셜미디어용 콘텐츠 제작', 300000, '건', '마케팅', true),
('블로그 콘텐츠 작성', '마케팅용 블로그 포스트 작성', 200000, '건', '마케팅', true),
('광고 캠페인 기획', '온라인 광고 캠페인 기획', 1000000, '건', '마케팅', true),
('SEO 최적화', '검색엔진 최적화 작업', 500000, '건', '마케팅', true);

-- 견적서 템플릿 초기 데이터
INSERT INTO quote_templates (name, description, category, template_data) VALUES
('기본 영상 제작', '일반적인 기업 홍보 영상 제작 템플릿', '영상제작', '{
  "groups": [
    {
      "name": "기획/스토리보드",
      "include_in_fee": true,
      "items": [
        {
          "name": "프로젝트 기획",
          "include_in_fee": true,
          "details": [
            {
              "name": "기획/스토리보드 작성",
              "quantity": 1,
              "days": 3,
              "unit_price": 500000
            },
            {
              "name": "컨셉 디자인",
              "quantity": 1,
              "days": 2,
              "unit_price": 300000
            }
          ]
        }
      ]
    },
    {
      "name": "촬영",
      "include_in_fee": true,
      "items": [
        {
          "name": "메인 촬영",
          "include_in_fee": true,
          "details": [
            {
              "name": "스튜디오 촬영",
              "quantity": 1,
              "days": 2,
              "unit_price": 800000
            },
            {
              "name": "장비 대여",
              "quantity": 1,
              "days": 2,
              "unit_price": 200000
            }
          ]
        }
      ]
    },
    {
      "name": "편집/후반작업",
      "include_in_fee": true,
      "items": [
        {
          "name": "영상 편집",
          "include_in_fee": true,
          "details": [
            {
              "name": "영상 편집",
              "quantity": 1,
              "days": 5,
              "unit_price": 800000
            },
            {
              "name": "모션그래픽 제작",
              "quantity": 1,
              "days": 3,
              "unit_price": 1200000
            },
            {
              "name": "컬러그레이딩",
              "quantity": 1,
              "days": 1,
              "unit_price": 300000
            },
            {
              "name": "사운드 디자인",
              "quantity": 1,
              "days": 1,
              "unit_price": 400000
            }
          ]
        }
      ]
    }
  ]
}'),

('제품 촬영 패키지', '제품 사진 및 영상 촬영 전문 패키지', '촬영', '{
  "groups": [
    {
      "name": "제품 촬영",
      "include_in_fee": true,
      "items": [
        {
          "name": "촬영 진행",
          "include_in_fee": true,
          "details": [
            {
              "name": "제품 촬영",
              "quantity": 1,
              "days": 2,
              "unit_price": 600000
            },
            {
              "name": "스튜디오 촬영",
              "quantity": 1,
              "days": 1,
              "unit_price": 800000
            },
            {
              "name": "장비 대여",
              "quantity": 1,
              "days": 2,
              "unit_price": 200000
            }
          ]
        }
      ]
    },
    {
      "name": "스튜디오 대여",
      "include_in_fee": true,
      "items": [
        {
          "name": "공간 대여",
          "include_in_fee": true,
          "details": [
            {
              "name": "스튜디오 대여",
              "quantity": 1,
              "days": 2,
              "unit_price": 300000
            }
          ]
        }
      ]
    },
    {
      "name": "후반 보정",
      "include_in_fee": true,
      "items": [
        {
          "name": "이미지 보정",
          "include_in_fee": true,
          "details": [
            {
              "name": "컬러그레이딩",
              "quantity": 1,
              "days": 2,
              "unit_price": 300000
            },
            {
              "name": "보정 작업",
              "quantity": 50,
              "days": 1,
              "unit_price": 10000
            }
          ]
        }
      ]
    }
  ]
}'),

('인포그래픽 제작', '데이터 시각화 및 인포그래픽 디자인', '그래픽디자인', '{
  "groups": [
    {
      "name": "컨셉 디자인",
      "include_in_fee": true,
      "items": [
        {
          "name": "디자인 기획",
          "include_in_fee": true,
          "details": [
            {
              "name": "기획/스토리보드 작성",
              "quantity": 1,
              "days": 2,
              "unit_price": 500000
            },
            {
              "name": "컨셉 디자인",
              "quantity": 3,
              "days": 1,
              "unit_price": 200000
            }
          ]
        }
      ]
    },
    {
      "name": "인포그래픽 제작",
      "include_in_fee": true,
      "items": [
        {
          "name": "메인 제작",
          "include_in_fee": true,
          "details": [
            {
              "name": "인포그래픽 제작",
              "quantity": 5,
              "days": 1,
              "unit_price": 700000
            },
            {
              "name": "차트 디자인",
              "quantity": 10,
              "days": 1,
              "unit_price": 100000
            },
            {
              "name": "아이콘 제작",
              "quantity": 20,
              "days": 1,
              "unit_price": 50000
            },
            {
              "name": "일러스트 작업",
              "quantity": 3,
              "days": 1,
              "unit_price": 300000
            },
            {
              "name": "레이아웃 디자인",
              "quantity": 5,
              "days": 1,
              "unit_price": 200000
            }
          ]
        }
      ]
    },
    {
      "name": "애니메이션",
      "include_in_fee": true,
      "items": [
        {
          "name": "모션 작업",
          "include_in_fee": true,
          "details": [
            {
              "name": "모션그래픽 제작",
              "quantity": 3,
              "days": 1,
              "unit_price": 1200000
            },
            {
              "name": "인터랙션 디자인",
              "quantity": 5,
              "days": 1,
              "unit_price": 400000
            },
            {
              "name": "애니메이션 구현",
              "quantity": 1,
              "days": 3,
              "unit_price": 800000
            }
          ]
        }
      ]
    }
  ]
}'),

('웹사이트 개발', '기업 웹사이트 구축 및 개발', '개발', '{
  "groups": [
    {
      "name": "기획/설계",
      "include_in_fee": true,
      "items": [
        {
          "name": "프로젝트 기획",
          "include_in_fee": true,
          "details": [
            {
              "name": "웹사이트 기획",
              "quantity": 1,
              "days": 5,
              "unit_price": 800000
            },
            {
              "name": "사이트맵 작성",
              "quantity": 1,
              "days": 2,
              "unit_price": 300000
            },
            {
              "name": "와이어프레임 제작",
              "quantity": 10,
              "days": 1,
              "unit_price": 100000
            },
            {
              "name": "기능 명세서 작성",
              "quantity": 1,
              "days": 3,
              "unit_price": 500000
            }
          ]
        }
      ]
    },
    {
      "name": "디자인",
      "include_in_fee": true,
      "items": [
        {
          "name": "UI/UX 디자인",
          "include_in_fee": true,
          "details": [
            {
              "name": "웹사이트 디자인",
              "quantity": 1,
              "days": 10,
              "unit_price": 1200000
            },
            {
              "name": "메인 페이지 디자인",
              "quantity": 1,
              "days": 3,
              "unit_price": 600000
            },
            {
              "name": "서브 페이지 디자인",
              "quantity": 8,
              "days": 1,
              "unit_price": 300000
            },
            {
              "name": "반응형 디자인",
              "quantity": 1,
              "days": 5,
              "unit_price": 800000
            },
            {
              "name": "아이콘 제작",
              "quantity": 30,
              "days": 1,
              "unit_price": 50000
            },
            {
              "name": "이미지 보정",
              "quantity": 50,
              "days": 1,
              "unit_price": 20000
            }
          ]
        }
      ]
    },
    {
      "name": "개발/구축",
      "include_in_fee": true,
      "items": [
        {
          "name": "프론트엔드 개발",
          "include_in_fee": true,
          "details": [
            {
              "name": "웹사이트 개발",
              "quantity": 1,
              "days": 15,
              "unit_price": 2000000
            },
            {
              "name": "반응형 웹 구현",
              "quantity": 1,
              "days": 5,
              "unit_price": 800000
            },
            {
              "name": "CMS 구축",
              "quantity": 1,
              "days": 8,
              "unit_price": 1500000
            },
            {
              "name": "SEO 최적화",
              "quantity": 1,
              "days": 3,
              "unit_price": 500000
            },
            {
              "name": "성능 최적화",
              "quantity": 1,
              "days": 3,
              "unit_price": 600000
            },
            {
              "name": "크로스브라우징",
              "quantity": 1,
              "days": 3,
              "unit_price": 400000
            },
            {
              "name": "테스트 및 배포",
              "quantity": 1,
              "days": 5,
              "unit_price": 800000
            },
            {
              "name": "유지보수 매뉴얼",
              "quantity": 1,
              "days": 1,
              "unit_price": 200000
            }
          ]
        }
      ]
    }
  ]
}');