import { useState, useEffect } from 'react';
import { Pedometer } from 'expo-sensors';

interface PedometerState {
  isAvailable: boolean;
  steps: number;
  error: string | null;
}

/**
 * 만보기 커스텀 훅
 * - expo-sensors Pedometer 래핑
 * - 실시간 걸음 수 구독
 * - 기기 미지원 시 isAvailable: false 반환
 */
export function usePedometer(): PedometerState {
  const [state, setState] = useState<PedometerState>({
    isAvailable: false,
    steps: 0,
    error: null,
  });

  useEffect(() => {
    let subscription: ReturnType<typeof Pedometer.watchStepCount> | null = null;

    (async () => {
      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!granted) {
        setState((prev) => ({ ...prev, error: '만보기 권한이 필요합니다.' }));
        return;
      }

      const isAvailable = await Pedometer.isAvailableAsync();
      setState((prev) => ({ ...prev, isAvailable }));

      if (!isAvailable) return;

      subscription = Pedometer.watchStepCount((result) => {
        setState((prev) => ({ ...prev, steps: result.steps }));
      });
    })();

    return () => subscription?.remove();
  }, []);

  return state;
}
