/**
 * 我的课程页面
 * 展示老师的周课程表，支持导入真实课程表
 */

'use client'

import { useState } from 'react'
import { BookOpen, Upload, Calendar, MapPin, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 课程数据类型
interface Course {
  id: string
  name: string
  code: string
  day: number  // 1-7 (周一到周日)
  startTime: string
  endTime: string
  classroom: string
  weeks: number[]  // 上课周次
  students: number
}

// Mock 数据（示例）
const mockCourses: Course[] = [
  {
    id: '1',
    name: '民法学',
    code: 'LAW101',
    day: 1,  // 周一
    startTime: '08:00',
    endTime: '09:40',
    classroom: '教学楼A301',
    weeks: [1, 2, 3, 4, 5, 6, 7, 8],
    students: 45
  },
  {
    id: '2',
    name: '刑法学',
    code: 'LAW102',
    day: 2,  // 周二
    startTime: '10:00',
    endTime: '11:40',
    classroom: '教学楼B205',
    weeks: [1, 2, 3, 4, 5, 6, 7, 8],
    students: 38
  },
  {
    id: '3',
    name: '行政法',
    code: 'LAW201',
    day: 3,  // 周三
    startTime: '14:00',
    endTime: '15:40',
    classroom: '法学院401',
    weeks: [1, 2, 3, 4, 5, 6, 7, 8],
    students: 42
  },
  {
    id: '4',
    name: '合同法',
    code: 'LAW301',
    day: 4,  // 周四
    startTime: '08:00',
    endTime: '09:40',
    classroom: '教学楼A302',
    weeks: [1, 2, 3, 4, 5, 6, 7, 8],
    students: 50
  },
  {
    id: '5',
    name: '法律诊所',
    code: 'LAW401',
    day: 5,  // 周五
    startTime: '14:00',
    endTime: '16:30',
    classroom: '模拟法庭',
    weeks: [1, 2, 3, 4, 5, 6, 7, 8],
    students: 25
  }
]

// 时间段配置
const timeSlots = [
  { id: 1, start: '08:00', end: '09:40', label: '第1-2节' },
  { id: 2, start: '10:00', end: '11:40', label: '第3-4节' },
  { id: 3, start: '14:00', end: '15:40', label: '第5-6节' },
  { id: 4, start: '16:00', end: '17:40', label: '第7-8节' },
  { id: 5, start: '19:00', end: '20:40', label: '第9-10节' },
]

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function CoursesPage() {
  const [courses] = useState<Course[]>(mockCourses)
  const [currentWeek, setCurrentWeek] = useState(1)

  // 查找指定日期和时间段的课程
  const getCourseForSlot = (day: number, timeSlot: typeof timeSlots[0]) => {
    return courses.find(course =>
      course.day === day &&
      course.startTime === timeSlot.start &&
      course.weeks.includes(currentWeek)
    )
  }

  // 导入课程表（占位）
  const handleImport = () => {
    alert('课程表导入功能即将上线！支持导入Excel、CSV、iCal格式的课程表。')
  }

  return (
    <div className="p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              我的课程
            </h1>
            <p className="text-muted-foreground">
              查看本周课程安排，包含教室位置和学生人数
            </p>
          </div>
          <Button onClick={handleImport} className="gap-2">
            <Upload className="w-4 h-4" />
            导入课程表
          </Button>
        </div>

        {/* 周次选择器 */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">当前周次：</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(week => (
              <button
                key={week}
                onClick={() => setCurrentWeek(week)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  currentWeek === week
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                第{week}周
              </button>
            ))}
          </div>
        </div>

        {/* 课程表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              本周课程表
            </CardTitle>
            <CardDescription>
              显示第 {currentWeek} 周的课程安排
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border p-3 text-left font-medium text-sm w-32">
                      时间
                    </th>
                    {weekDays.map((day) => (
                      <th key={day} className="border border-border p-3 text-center font-medium text-sm">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(slot => (
                    <tr key={slot.id}>
                      <td className="border border-border p-3 bg-muted/30">
                        <div className="text-xs font-medium text-muted-foreground">
                          {slot.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {slot.start} - {slot.end}
                        </div>
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7].map(day => {
                        const course = getCourseForSlot(day, slot)
                        return (
                          <td key={`${day}-${slot.id}`} className="border border-border p-2 align-top">
                            {course ? (
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 h-full min-h-[120px]">
                                <div className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
                                  {course.name}
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    <span>{course.classroom}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                    <span>{course.startTime} - {course.endTime}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                                    <Users className="w-3 h-3 flex-shrink-0" />
                                    <span>{course.students}人</span>
                                  </div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    {course.code}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full min-h-[120px] flex items-center justify-center text-xs text-muted-foreground">
                                -
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 课程统计 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{courses.length}</div>
                  <div className="text-xs text-muted-foreground">本周课程</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {courses.reduce((sum, c) => sum + c.students, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">总学生数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {courses.length * 2}
                  </div>
                  <div className="text-xs text-muted-foreground">周课时数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {new Set(courses.map(c => c.classroom)).size}
                  </div>
                  <div className="text-xs text-muted-foreground">使用教室</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 导入说明 */}
        <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base">📥 课程表导入功能</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              点击"导入课程表"按钮，支持以下格式：
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <div>
                  <strong>Excel格式 (.xlsx)</strong>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    标准课程表模板，包含课程名、时间、教室等信息
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <div>
                  <strong>CSV格式 (.csv)</strong>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    逗号分隔文件，适合从教务系统导出
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <div>
                  <strong>iCal格式 (.ics)</strong>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    日历格式，可从Outlook、Google Calendar导出
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
