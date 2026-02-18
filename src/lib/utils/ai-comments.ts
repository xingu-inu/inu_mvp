/**
 * Generate an encouraging AI comment based on streak and total completion count.
 * Used across check-in flows (compact row, task detail panel).
 */
export function generateAiComment(newStreak: number, totalCompleted: number): string {
  if (newStreak === 7) return '일주일 연속 달성! 습관이 되어가고 있어요 🌟'
  if (newStreak === 14) return '2주 연속! 대단해요, 이제 진짜 습관이에요 💪'
  if (newStreak === 30) return '한 달 연속! 정말 대단해요 🎉'
  if (newStreak === 100) return '100일 연속! 당신은 진정한 챔피언이에요 🏆'
  if (newStreak % 10 === 0 && newStreak > 0) return `${newStreak}일 연속! 꾸준함이 빛나요 ✨`
  if (newStreak % 5 === 0 && newStreak > 0) return `${newStreak}일 연속 달성! 잘 하고 있어요 🔥`
  if (totalCompleted === 10) return '총 10회 완료! 좋은 시작이에요 👏'
  if (totalCompleted === 50) return '총 50회! 정말 열심히 하셨네요 💫'
  if (totalCompleted === 100) return '총 100회 달성! 대단한 여정이에요 🎊'

  const encouragements = [
    '오늘도 해냈어요! 👍',
    '잘 했어요! 한 걸음 더 나아갔어요 🚶',
    '완료! 자신을 자랑스러워하세요 😊',
    '훌륭해요! 오늘의 노력이 내일의 성과가 될 거예요 💪',
  ]
  return encouragements[Math.floor(Math.random() * encouragements.length)]
}
