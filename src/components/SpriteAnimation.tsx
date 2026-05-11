import React, {useEffect, useMemo, useRef, useState} from 'react';
import {View, Image, StyleSheet} from 'react-native';
import {AnimationDef} from '../types';

interface Props {
  spritesheetUri: string;
  frameWidth: number;
  columns: number;
  animation: AnimationDef;
  allAnimations?: Record<string, AnimationDef>;
  scale?: number;
  paused?: boolean;
}

function computeYOffset(
  animation: AnimationDef,
  allAnimations?: Record<string, AnimationDef>,
): number {
  if (!allAnimations) return animation.row * (animation.frameHeight || 200);
  const sorted = Object.values(allAnimations).sort((a, b) => a.row - b.row);
  let y = 0;
  for (const a of sorted) {
    if (a.row === animation.row) return y;
    y += a.frameHeight || 200;
  }
  return y;
}

function computeTotalHeight(allAnimations?: Record<string, AnimationDef>, fallbackHeight?: number): number {
  if (!allAnimations) return (fallbackHeight || 200) * 8;
  return Object.values(allAnimations).reduce((sum, a) => sum + (a.frameHeight || 200), 0);
}

export default function SpriteAnimation({
  spritesheetUri,
  frameWidth,
  columns,
  animation,
  allAnimations,
  scale = 1,
  paused = false,
}: Props) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCurrentFrame(0);
  }, [animation]);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const fps = animation.fps || 6;
    timerRef.current = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % animation.frames);
    }, 1000 / fps);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [animation, paused]);

  const animFrameHeight = animation.frameHeight || 200;
  const yOffset = useMemo(
    () => computeYOffset(animation, allAnimations),
    [animation, allAnimations],
  );
  const totalSheetHeight = useMemo(
    () => computeTotalHeight(allAnimations, animFrameHeight),
    [allAnimations, animFrameHeight],
  );

  const col = currentFrame % columns;

  const displayWidth = frameWidth * scale;
  const displayHeight = animFrameHeight * scale;
  const sheetWidth = columns * frameWidth * scale;
  const sheetHeight = totalSheetHeight * scale;

  return (
    <View
      style={[
        styles.container,
        {
          width: displayWidth,
          height: displayHeight,
        },
      ]}>
      <Image
        source={
          typeof spritesheetUri === 'number'
            ? spritesheetUri
            : {uri: spritesheetUri}
        }
        style={{
          width: sheetWidth,
          height: sheetHeight,
          position: 'absolute',
          left: -col * displayWidth,
          top: -yOffset * scale,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
