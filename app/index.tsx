import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function SplashScreen() {
  const fadeAni = useRef(new Animated.Value(0)).current;
  const scaleAni = useRef(new Animated.Value(0.8)).current;
  const rotateAni = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade and scale animation
    Animated.parallel([
      Animated.timing(fadeAni, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAni, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAni, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();

    // Navigate to auth screen after 2 seconds
    const timer = setTimeout(() => {
      router.replace("/auth");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const rotateInterpolation = rotateAni.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <LinearGradient
      colors={["#1A1A2E", "#16213E", "#0F3460"]}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: fadeAni,
            transform: [
              { scale: scaleAni },
              { rotate: rotateInterpolation }, // Rotate animation
            ],
          },
        ]}
      >
        <Ionicons name="medical-outline" size={120} color="#E94560" />
      </Animated.View>

      <Animated.View style={{ opacity: fadeAni }}>
        <Text style={styles.appName}>PillPal</Text>
        <Text style={styles.tagline}>Your Daily Health Companion</Text>
      </Animated.View>

      <Animated.View style={[styles.loadingBar, { opacity: fadeAni }]}>
        <View style={styles.loadingBarInner} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  appName: {
    fontSize: 40,
    color: "#E94560",
    fontWeight: "bold",
    fontFamily: "Poppins-Bold", // Use a custom font (make sure to load it in your project)
    textShadowColor: "rgba(233, 69, 96, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 16,
    color: "#FFF",
    fontFamily: "Poppins-Regular", // Use a custom font
    textAlign: "center",
    marginTop: 10,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    marginTop: 30,
    overflow: "hidden",
  },
  loadingBarInner: {
    height: "100%",
    width: "50%",
    backgroundColor: "#E94560",
    borderRadius: 2,
  },
});
