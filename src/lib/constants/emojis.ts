export interface EmojiCategory {
  category: string
  emojis: string[]
}

export const AREA_EMOJI_PRESETS: EmojiCategory[] = [
  {
    category: '건강/운동',
    emojis: ['💪', '🏃', '🧘', '🏋️', '🚴', '🏊', '🥗', '🛌'],
  },
  {
    category: '커리어/학습',
    emojis: ['📈', '💼', '🎓', '📚', '💻', '🖊️', '📝', '🔬'],
  },
  {
    category: '재정',
    emojis: ['💰', '💳', '🏦', '📊', '💎', '🪙'],
  },
  {
    category: '관계/사람',
    emojis: ['❤️', '👨‍👩‍👧‍👦', '🤝', '👋', '🫂', '💌'],
  },
  {
    category: '취미/창작',
    emojis: ['🎨', '🎵', '🎮', '📷', '✈️', '🎯', '🎪', '🧩'],
  },
  {
    category: '마음/멘탈',
    emojis: ['🧠', '🌿', '☕', '🕊️', '🌙', '✨', '🙏'],
  },
  {
    category: '일상/생활',
    emojis: ['☀️', '🏠', '🍳', '🧹', '📱', '⏰', '🚗', '🐶'],
  },
  {
    category: '기타',
    emojis: ['🌱', '🔥', '⭐', '🚀', '🌈', '🏆', '🎉', '🎯'],
  },
]
