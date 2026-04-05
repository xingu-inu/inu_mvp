-- Profile Trait Soft Delete
-- deleted_at 컬럼 추가: NULL이면 활성, 값이 있으면 삭제됨
-- 타임라인 기록 보존을 위해 hard delete 대신 soft delete 사용

ALTER TABLE profile_traits ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 활성 항목만 빠르게 조회하기 위한 부분 인덱스
CREATE INDEX idx_profile_traits_active ON profile_traits(user_id, sort_order)
  WHERE deleted_at IS NULL;
