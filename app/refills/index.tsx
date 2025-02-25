"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import {
  getMedications,
  Medication,
  updateMedication,
} from "../../utils/storage";
import { scheduleRefillReminder } from "../../utils/notifications";
import { Animated, Easing } from "react-native";

export default function RefillTrackerScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
  const AnimatedLinearGradient =
    Animated.createAnimatedComponent(LinearGradient);
  const loadMedications = useCallback(async () => {
    try {
      const allMedications = await getMedications();
      setMedications(allMedications);
    } catch (error) {
      console.error("Error loading medications:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [loadMedications])
  );

  const handleRefill = async (medication: Medication) => {
    try {
      const updatedMedication = {
        ...medication,
        currentSupply: medication.totalSupply,
        lastRefillDate: new Date().toISOString(),
      };

      await updateMedication(updatedMedication);
      await loadMedications();

      Alert.alert(
        "Refill Recorded",
        `${medication.name} has been refilled to ${medication.totalSupply} units.`
      );
    } catch (error) {
      console.error("Error recording refill:", error);
      Alert.alert("Error", "Failed to record refill. Please try again.");
    }
  };

  const getSupplyStatus = (medication: Medication) => {
    const percentage =
      (medication.currentSupply / medication.totalSupply) * 100;
    if (percentage <= medication.refillAt) {
      return {
        status: "Low",
        gradient: ["#FF5252", "#D32F2F"] as [string, string],
        textColor: "#FFF",
      };
    } else if (percentage <= 50) {
      return {
        status: "Medium",
        gradient: ["#FFB74D", "#FFA726"] as [string, string],
        textColor: "#FFF",
      };
    } else {
      return {
        status: "Good",
        gradient: ["#66BB6A", "#4CAF50"] as [string, string],
        textColor: "#FFF",
      };
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a8e2d", "#146922"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#1a8e2d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refill Tracker</Text>
        </View>

        <ScrollView
          style={styles.medicationsContainer}
          showsVerticalScrollIndicator={false}
        >
          {medications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No medications to track</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push("/medications/add")}
              >
                <Text style={styles.addButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          ) : (
            medications.map((medication, index) => {
              const cardAnim = useRef(new Animated.Value(0)).current;
              const buttonScale = useRef(new Animated.Value(1)).current;

              useEffect(() => {
                Animated.timing(cardAnim, {
                  toValue: 1,
                  duration: 500,
                  delay: index * 50,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }).start();
              }, []);

              const handleButtonPressIn = () => {
                Animated.spring(buttonScale, {
                  toValue: 0.95,
                  useNativeDriver: true,
                }).start();
              };

              const handleButtonPressOut = () => {
                Animated.spring(buttonScale, {
                  toValue: 1,
                  useNativeDriver: true,
                }).start();
              };

              const supplyStatus = getSupplyStatus(medication);
              const supplyPercentage =
                (medication.currentSupply / medication.totalSupply) * 100;

              return (
                <Animated.View
                  key={medication.id}
                  style={[
                    styles.medicationCard,
                    {
                      opacity: cardAnim,
                      transform: [
                        {
                          translateY: cardAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {/* Medication Header */}
                  <View style={styles.medicationHeader}>
                    <LinearGradient
                      colors={[medication.color, `${medication.color}CC`]}
                      style={[
                        styles.medicationColor,
                        {
                          shadowColor: medication.color,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                        },
                      ]}
                    />
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>
                        {medication.name}
                      </Text>
                      <Text style={styles.medicationDosage}>
                        {medication.dosage}
                      </Text>
                    </View>
                    <LinearGradient
                      colors={supplyStatus.gradient}
                      style={styles.statusBadge}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: supplyStatus.textColor },
                        ]}
                      >
                        {supplyStatus.status}
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <AnimatedLinearGradient
                        colors={supplyStatus.gradient}
                        style={[
                          styles.progressBar,
                          {
                            width: cardAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", `${supplyPercentage}%`],
                            }),
                          },
                        ]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                      />
                    </View>
                  </View>

                  {/* Refill Button */}
                  <AnimatedTouchable
                    style={[
                      styles.refillButton,
                      {
                        backgroundColor: medication.color,
                        transform: [{ scale: buttonScale }],
                      },
                    ]}
                    onPressIn={handleButtonPressIn}
                    onPressOut={handleButtonPressOut}
                    onPress={() => handleRefill(medication)}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={[medication.color, `${medication.color}DD`]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                    <Text style={styles.refillButtonText}>
                      {supplyPercentage < 100 ? "Refill Now" : "Fully Stocked"}
                    </Text>
                  </AnimatedTouchable>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FBFE",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 160 : 140,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Inter-Bold",
    color: "white",
    marginLeft: 16,
    letterSpacing: -0.5,
  },
  medicationCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#4060ce",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    transform: [{ scale: 1 }],
  },
  medicationName: {
    fontSize: 20,
    fontFamily: "Inter-SemiBold",
    color: "#1A237E",
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: "#5C6BC0",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: "rgba(92, 107, 192, 0.1)",
    borderRadius: 5,
    overflow: "hidden",
  },
  refillButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#4060ce",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  refillButtonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
  // Add new animations
  cardEnter: {
    opacity: 0,
    transform: [{ translateY: 20 }],
  },

  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  medicationsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  medicationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  medicationColor: {
    width: 12,
    height: 40,
    borderRadius: 6,
    marginRight: 16,
  },
  medicationInfo: {
    flex: 1,
  },

  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  supplyContainer: {
    marginBottom: 16,
  },
  supplyInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  supplyLabel: {
    fontSize: 14,
    color: "#666",
  },
  supplyValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  progressBarContainer: {
    marginBottom: 8,
  },

  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "right",
  },
  refillInfo: {
    marginTop: 8,
  },
  refillLabel: {
    fontSize: 12,
    color: "#666",
  },
  lastRefillDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: "#1a8e2d",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
