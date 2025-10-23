/**
 * 判决书学习页面
 * 使用四幕教学法进行判决书深度学习
 * 集成了现有的MainPageContainer组件
 *
 * 模式说明：
 * - 默认（无mode参数）：编辑模式，可以AI分析、自动保存
 * - mode=review：只读模式，只展示历史数据，不保存
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { MainPageContainer } from '@/src/domains/shared/containers/MainPageContainer'

export default function JudgmentLearningPage() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') === 'review' ? 'review' : 'edit'

  return (
    <div id="JudgmentPageId">
      <MainPageContainer mode={mode} />
    </div>
  )
}
