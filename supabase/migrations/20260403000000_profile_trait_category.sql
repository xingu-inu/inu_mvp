-- Add category column for Pokédex-style visual zones
ALTER TABLE profile_traits
ADD COLUMN category TEXT NOT NULL DEFAULT 'general';

-- Backfill: try to categorize existing traits by label keywords
UPDATE profile_traits SET category = 'identity'
WHERE lower(label) IN ('mbti', '에니어그램', '별자리', '성격', '성격유형', '혈액형');

UPDATE profile_traits SET category = 'stats'
WHERE lower(label) ~ '(강점|능력|스킬|실력|레벨|체력)' AND category = 'general';

UPDATE profile_traits SET category = 'interests'
WHERE lower(label) ~ '(관심사|취미|좋아하는|요즘|덕질)' AND category = 'general';

UPDATE profile_traits SET category = 'description'
WHERE lower(label) ~ '(소개|모토|한줄|테마|가치관|인생)' AND category = 'general';

UPDATE profile_traits SET category = 'habits'
WHERE lower(label) ~ '(루틴|습관|일상|패턴|수면|운동)' AND category = 'general';
-- 나머지는 'general' 유지
