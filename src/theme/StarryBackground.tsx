import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { useThemeMode } from "./ThemeProvider";

const GOLD = "#FFD700";

type Star = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  twinkle: boolean;
};

type Cloud = {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
};

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const createStars = (width: number, height: number): Star[] => {
  const random = mulberry32(42);
  return Array.from({ length: 150 }, () => {
    const size = 1.2 + random() * 2.6;
    return {
      left: random() * width,
      top: random() * height,
      size,
      opacity: 0.2 + random() * 0.35,
      twinkle: random() > 0.88,
    };
  });
};

const createClouds = (width: number, height: number): Cloud[] => {
  const random = mulberry32(123);
  return Array.from({ length: 5 }, () => {
    const w = width * (0.10 + random() * 0.18);
    const h = height * (0.06 + random() * 0.10);
    return {
      left: random() * width,
      top: height * (0.05 + random() * 0.30),
      width: w,
      height: h,
      opacity: 0.06 + random() * 0.08,
    };
  });
};

type Props = {
  children: React.ReactNode;
};

export function StarryBackground({ children }: Props) {
  const { width, height } = useWindowDimensions();
  const { isDarkMode } = useThemeMode();

  const stars = useMemo(() => createStars(width, height), [width, height]);
  const clouds = useMemo(() => createClouds(width, height), [width, height]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={isDarkMode ? DARK_COLORS : LIGHT_COLORS}
        locations={isDarkMode ? [0, 0.35, 0.7, 0.87, 1] : [0, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {isDarkMode ? (
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"]}
          locations={[0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.04)", "transparent"]}
          locations={[0.15, 0.55, 0.95]}
          style={StyleSheet.absoluteFill}
        />
      )}

      {isDarkMode ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {stars.map((star, index) => (
            <View
              key={`star-${index}`}
              style={[
                styles.starContainer,
                {
                  left: star.left,
                  top: star.top,
                },
              ]}
            >
              <View
                style={[
                  styles.starCore,
                  {
                    width: star.size,
                    height: star.size,
                    opacity: star.opacity,
                  },
                ]}
              />
              {star.twinkle && (
                <>
                  <View
                    style={[
                      styles.starLineVertical,
                      {
                        height: star.size * 3,
                        opacity: star.opacity * 0.6,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.starLineHorizontal,
                      {
                        width: star.size * 3,
                        opacity: star.opacity * 0.6,
                      },
                    ]}
                  />
                </>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {clouds.map((cloud, index) => (
            <View
              key={`cloud-${index}`}
              style={[
                styles.cloud,
                {
                  left: cloud.left,
                  top: cloud.top,
                  width: cloud.width,
                  height: cloud.height,
                  opacity: cloud.opacity,
                },
              ]}
            >
              <View style={[styles.cloudBubble, { width: cloud.width * 0.55, height: cloud.height * 0.8, left: -cloud.width * 0.25 }]} />
              <View style={[styles.cloudBubble, { width: cloud.width * 0.6, height: cloud.height * 0.9, left: cloud.width * 0.15 }]} />
              <View style={[styles.cloudBubble, { width: cloud.width * 0.5, height: cloud.height * 0.7, top: -cloud.height * 0.3 }]} />
            </View>
          ))}
        </View>
      )}

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const DARK_COLORS = ["#02060D", "#050A14", "#0A1324", "#060A12", "#000000"] as const;
const LIGHT_COLORS = ["#78B7D8", "#AED4E2", "#F7F7F7"] as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  starContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  starCore: {
    borderRadius: 999,
    backgroundColor: GOLD,
  },
  starLineVertical: {
    position: "absolute",
    width: 1,
    backgroundColor: GOLD,
  },
  starLineHorizontal: {
    position: "absolute",
    height: 1,
    backgroundColor: GOLD,
  },
  cloud: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 999,
  },
  cloudBubble: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 999,
  },
});
