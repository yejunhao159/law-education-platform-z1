/**
 * SSE投票Hook
 * @description React Hook，处理SSE连接和投票事件
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SSEEventType,
  SSEConnectionStatus,
  SSEConnectionConfig,
  SSEConnectionState,
  VoteStartedData,
  VoteUpdateData,
  VoteEndedData,
  StudentActivityData
} from '../lib/sse/types';

/**
 * 投票状态接口
 */
export interface VoteState {
  voteId: string | null;
  question: string | null;
  options: Array<{
    id: string;
    text: string;
    count: number;
    percentage: number;
  }>;
  totalVotes: number;
  isActive: boolean;
  startedAt: number | null;
  endsAt: number | null;
}

/**
 * 课堂状态接口
 */
export interface ClassroomState {
  totalStudents: number;
  connectedStudents: number;
  lastActivity: number | null;
}

/**
 * SSE投票Hook返回值
 */
export interface UseSSEVotingReturn {
  // 连接状态
  connectionState: SSEConnectionState;

  // 投票状态
  voteState: VoteState;

  // 课堂状态
  classroomState: ClassroomState;

  // 控制方法
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // 投票方法
  submitVote: (optionId: string) => Promise<boolean>;

  // 事件处理器
  onVoteStarted: (callback: (data: VoteStartedData) => void) => void;
  onVoteUpdate: (callback: (data: VoteUpdateData) => void) => void;
  onVoteEnded: (callback: (data: VoteEndedData) => void) => void;
  onStudentActivity: (callback: (data: StudentActivityData) => void) => void;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000
};

/**
 * SSE投票Hook
 */
export function useSSEVoting(config: SSEConnectionConfig): UseSSEVotingReturn {
  // 合并配置
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // EventSource引用
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 连接状态
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    status: SSEConnectionStatus.DISCONNECTED,
    reconnectAttempts: 0
  });

  // 投票状态
  const [voteState, setVoteState] = useState<VoteState>({
    voteId: null,
    question: null,
    options: [],
    totalVotes: 0,
    isActive: false,
    startedAt: null,
    endsAt: null
  });

  // 课堂状态
  const [classroomState, setClassroomState] = useState<ClassroomState>({
    totalStudents: 0,
    connectedStudents: 0,
    lastActivity: null
  });

  // 事件处理器
  const eventHandlers = useRef<{
    onVoteStarted: Array<(data: VoteStartedData) => void>;
    onVoteUpdate: Array<(data: VoteUpdateData) => void>;
    onVoteEnded: Array<(data: VoteEndedData) => void>;
    onStudentActivity: Array<(data: StudentActivityData) => void>;
  }>({
    onVoteStarted: [],
    onVoteUpdate: [],
    onVoteEnded: [],
    onStudentActivity: []
  });

  /**
   * 创建SSE连接
   */
  const createConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams({
      classroomId: fullConfig.classroomId
    });

    if (fullConfig.studentId) {
      params.append('studentId', fullConfig.studentId);
    }

    const url = `/api/classroom/${fullConfig.classroomId}/sse?${params}`;
    const eventSource = new EventSource(url);

    eventSourceRef.current = eventSource;

    // 连接建立
    eventSource.addEventListener('open', () => {
      console.log('SSE连接已建立');
      setConnectionState(prev => ({
        ...prev,
        status: SSEConnectionStatus.CONNECTED,
        lastConnected: Date.now(),
        reconnectAttempts: 0,
        error: undefined
      }));
    });

    // 连接错误
    eventSource.addEventListener('error', (event) => {
      console.error('SSE连接错误:', event);
      setConnectionState(prev => {
        const newState = {
          ...prev,
          status: SSEConnectionStatus.ERROR,
          error: 'Connection error'
        };

        // 自动重连
        if (prev.reconnectAttempts < fullConfig.maxReconnectAttempts!) {
          setTimeout(() => scheduleReconnect(), 1000);
        }

        return newState;
      });
    });

    // 投票开始事件
    eventSource.addEventListener(SSEEventType.VOTE_STARTED, (event) => {
      try {
        const data = JSON.parse(event.data);
        const voteData = data.data as VoteStartedData;

        setVoteState({
          voteId: voteData.voteId,
          question: voteData.question,
          options: voteData.options.map(opt => ({
            ...opt,
            count: 0,
            percentage: 0
          })),
          totalVotes: 0,
          isActive: true,
          startedAt: voteData.startedAt,
          endsAt: voteData.startedAt + (voteData.duration ? voteData.duration * 1000 : 0)
        });

        // 触发事件处理器
        eventHandlers.current.onVoteStarted.forEach(handler => {
          try {
            handler(voteData);
          } catch (error) {
            console.error('投票开始事件处理器错误:', error);
          }
        });

      } catch (error) {
        console.error('解析投票开始事件失败:', error);
      }
    });

    // 投票更新事件
    eventSource.addEventListener(SSEEventType.VOTE_UPDATE, (event) => {
      try {
        const data = JSON.parse(event.data);
        const voteData = data.data as VoteUpdateData;

        setVoteState(prev => ({
          ...prev,
          options: voteData.results,
          totalVotes: voteData.totalVotes
        }));

        // 触发事件处理器
        eventHandlers.current.onVoteUpdate.forEach(handler => {
          try {
            handler(voteData);
          } catch (error) {
            console.error('投票更新事件处理器错误:', error);
          }
        });

      } catch (error) {
        console.error('解析投票更新事件失败:', error);
      }
    });

    // 投票结束事件
    eventSource.addEventListener(SSEEventType.VOTE_ENDED, (event) => {
      try {
        const data = JSON.parse(event.data);
        const voteData = data.data as VoteEndedData;

        setVoteState(prev => ({
          ...prev,
          options: voteData.finalResults,
          totalVotes: voteData.totalVotes,
          isActive: false,
          endsAt: voteData.endedAt
        }));

        // 触发事件处理器
        eventHandlers.current.onVoteEnded.forEach(handler => {
          try {
            handler(voteData);
          } catch (error) {
            console.error('投票结束事件处理器错误:', error);
          }
        });

      } catch (error) {
        console.error('解析投票结束事件失败:', error);
      }
    });

    // 学生活动事件
    eventSource.addEventListener(SSEEventType.STUDENT_JOINED, (event) => {
      handleStudentActivity(event, 'joined');
    });

    eventSource.addEventListener(SSEEventType.STUDENT_LEFT, (event) => {
      handleStudentActivity(event, 'left');
    });

    // 心跳事件
    eventSource.addEventListener(SSEEventType.HEARTBEAT, (event) => {
      try {
        const data = JSON.parse(event.data);
        setClassroomState(prev => ({
          ...prev,
          connectedStudents: data.data.connectionCount,
          lastActivity: data.data.timestamp
        }));
      } catch (error) {
        console.error('解析心跳事件失败:', error);
      }
    });

  }, [fullConfig]);

  /**
   * 处理学生活动事件
   */
  const handleStudentActivity = (event: MessageEvent, type: 'joined' | 'left') => {
    try {
      const data = JSON.parse(event.data);
      const studentData = data.data as StudentActivityData;

      setClassroomState(prev => ({
        ...prev,
        totalStudents: studentData.totalStudents,
        lastActivity: studentData.timestamp
      }));

      // 触发事件处理器
      eventHandlers.current.onStudentActivity.forEach(handler => {
        try {
          handler(studentData);
        } catch (error) {
          console.error(`学生${type}事件处理器错误:`, error);
        }
      });

    } catch (error) {
      console.error(`解析学生${type}事件失败:`, error);
    }
  };

  /**
   * 安排重连
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionState(prev => ({
      ...prev,
      status: SSEConnectionStatus.RECONNECTING,
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`尝试重连 (${connectionState.reconnectAttempts + 1}/${fullConfig.maxReconnectAttempts})`);
      createConnection();
    }, fullConfig.reconnectInterval);
  }, [connectionState.reconnectAttempts, fullConfig, createConnection]);

  /**
   * 连接
   */
  const connect = useCallback(() => {
    setConnectionState(prev => ({
      ...prev,
      status: SSEConnectionStatus.CONNECTING
    }));
    createConnection();
  }, [createConnection]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState({
      status: SSEConnectionStatus.DISCONNECTED,
      reconnectAttempts: 0
    });
  }, []);

  /**
   * 重连
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  /**
   * 提交投票
   */
  const submitVote = useCallback(async (optionId: string): Promise<boolean> => {
    if (!fullConfig.studentId || !voteState.voteId) {
      console.error('无法提交投票：缺少学生ID或投票ID');
      return false;
    }

    try {
      const response = await fetch(`/api/classroom/${fullConfig.classroomId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: voteState.voteId,
          studentId: fullConfig.studentId,
          optionId
        })
      });

      if (response.ok) {
        console.log(`投票已提交: ${optionId}`);
        return true;
      } else {
        const error = await response.text();
        console.error('投票提交失败:', error);
        return false;
      }
    } catch (error) {
      console.error('投票提交错误:', error);
      return false;
    }
  }, [fullConfig.classroomId, fullConfig.studentId, voteState.voteId]);

  // 事件处理器注册方法
  const onVoteStarted = useCallback((callback: (data: VoteStartedData) => void) => {
    eventHandlers.current.onVoteStarted.push(callback);
  }, []);

  const onVoteUpdate = useCallback((callback: (data: VoteUpdateData) => void) => {
    eventHandlers.current.onVoteUpdate.push(callback);
  }, []);

  const onVoteEnded = useCallback((callback: (data: VoteEndedData) => void) => {
    eventHandlers.current.onVoteEnded.push(callback);
  }, []);

  const onStudentActivity = useCallback((callback: (data: StudentActivityData) => void) => {
    eventHandlers.current.onStudentActivity.push(callback);
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    voteState,
    classroomState,
    connect,
    disconnect,
    reconnect,
    submitVote,
    onVoteStarted,
    onVoteUpdate,
    onVoteEnded,
    onStudentActivity
  };
}