import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Alert,
  AppState,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import {
  getMedications,
  Medication,
  getTodaysDoses,
  recordDose,
  DoseHistory,
  updateMedication,
  deleteDose,
} from "../utils/storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  registerForPushNotificationsAsync,
  scheduleMedicationReminder,
} from "../utils/notifications";

const { width } = Dimensions.get("window");

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const QUICK_ACTIONS = [
  {
    icon: "add-circle-outline" as const,
    label: "Add\nMedication",
    route: "/medications/add" as const,
    color: "#2E7D32",
    gradient: ["#4CAF50", "#2E7D32"] as [string, string],
  },
  {
    icon: "calendar-outline" as const,
    label: "Calendar\nView",
    route: "/calendar" as const,
    color: "#1976D2",
    gradient: ["#2196F3", "#1976D2"] as [string, string],
  },
  {
    icon: "time-outline" as const,
    label: "History\nLog",
    route: "/history" as const,
    color: "#C2185B",
    gradient: ["#E91E63", "#C2185B"] as [string, string],
  },
  {
    icon: "medical-outline" as const,
    label: "Refill\nTracker",
    route: "/refills" as const,
    color: "#E64A19",
    gradient: ["#FF5722", "#E64A19"] as [string, string],
  },
];

interface CircularProgressProps {
  progress: number;
  totalDoses: number;
  completedDoses: number;
}

function CircularProgress({
  progress,
  totalDoses,
  completedDoses,
}: CircularProgressProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const size = width * 0.55;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressPercentage}>
          {Math.round(progress * 100)}%
        </Text>
        <Text style={styles.progressDetails}>
          {completedDoses} of {totalDoses} doses
        </Text>
      </View>
      <Svg width={size} height={size} style={styles.progressRing}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}
const AnimatedPath = Animated.createAnimatedComponent(Path);

const Hexagon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" fill={color} />
  </Svg>
);
const CyberButton = forwardRef(({ children, onPress, colors }: any, ref) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }} ref={ref}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const handleUndoDose = async (medication: Medication) => {
    try {
      // Get all doses for this medication
      const dosesForMed = doseHistory.filter(
        (dose) => dose.medicationId === medication.id && dose.taken
      );

      if (dosesForMed.length === 0) return;

      // Find the most recent dose
      const latestDose = dosesForMed.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      Alert.alert(
        "Undo Dose",
        `Undo taking ${medication.name}? This will restore 1 dose to your supply.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Undo",
            onPress: async () => {
              // Delete the dose record
              await deleteDose(latestDose.id);

              // Restore medication supply
              const medications = await getMedications();
              const updatedMed = medications.find(
                (m) => m.id === medication.id
              );

              if (updatedMed) {
                updatedMed.currentSupply = Math.min(
                  updatedMed.currentSupply + 1,
                  updatedMed.totalSupply
                );
                await updateMedication(updatedMed);
              }

              await loadMedications();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error undoing dose:", error);
      Alert.alert("Error", "Failed to undo dose. Please try again.");
    }
  };
  const loadMedications = useCallback(async () => {
    try {
      const [allMedications, todaysDoses] = await Promise.all([
        getMedications(),
        getTodaysDoses(),
      ]);

      setDoseHistory(todaysDoses);
      setMedications(allMedications);

      // Filter medications for today
      const today = new Date();
      const todayMeds = allMedications.filter((med) => {
        const startDate = new Date(med.startDate);
        const durationDays = parseInt(med.duration.split(" ")[0]);

        // For ongoing medications or if within duration
        if (
          durationDays === -1 ||
          (today >= startDate &&
            today <=
              new Date(
                startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
              ))
        ) {
          return true;
        }
        return false;
      });

      setTodaysMedications(todayMeds);

      // Calculate completed doses
      const completed = todaysDoses.filter((dose) => dose.taken).length;
      setCompletedDoses(completed);
    } catch (error) {
      console.error("Error loading medications:", error);
    }
  }, []);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.log("Failed to get push notification token");
        return;
      }

      // Schedule reminders for all medications
      const medications = await getMedications();
      for (const medication of medications) {
        if (medication.reminderEnabled) {
          await scheduleMedicationReminder(medication);
        }
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  // Use useEffect for initial load
  useEffect(() => {
    loadMedications();
    setupNotifications();

    // Handle app state changes for notifications
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadMedications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Use useFocusEffect for subsequent updates
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = () => {
        // Cleanup if needed
      };

      loadMedications();
      return () => unsubscribe();
    }, [loadMedications])
  );

  const handleTakeDose = async (medication: Medication) => {
    try {
      await recordDose(medication.id, true, new Date().toISOString());
      await loadMedications(); // Reload data after recording dose
    } catch (error) {
      console.error("Error recording dose:", error);
      Alert.alert("Error", "Failed to record dose. Please try again.");
    }
  };

  const isDoseTaken = (medicationId: string) => {
    return doseHistory.some(
      (dose) => dose.medicationId === medicationId && dose.taken
    );
  };

  const progress =
    todaysMedications.length > 0
      ? completedDoses / (todaysMedications.length * 2)
      : 0;

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#1A1A4A", "#2D2D6A"]} style={styles.header}>
        <View style={styles.headerGlow} />

        <View style={{ ...styles.headerContent, paddingTop: 30 }}>
          {/* Top Bar */}
          <View style={styles.headerTop}>
            <Text
              style={{ ...styles.greeting, fontSize: 24, letterSpacing: 3 }}
            >
              Pill Pal
            </Text>
            <CyberButton
              colors={["#FF6B81", "#A855F7"]}
              onPress={() => setShowNotifications(true)}
            >
              <Ionicons name="notifications-outline" size={24} color="white" />
            </CyberButton>
          </View>

          {/* Progress Section */}
          <View style={styles.progressContainer}>
            <Hexagon size={width * 0.6} color="#3A3A7A" />
            <Animated.Text
              style={[
                styles.progressPercentage,
                {
                  opacity: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  textShadowColor: "rgba(255, 255, 255, 0.3)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 4,
                },
              ]}
            >
              {Math.round(progress * 100)}%
            </Animated.Text>

            {/* Particle Effects */}
            <View style={styles.progressParticles}>
              {[...Array(12)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.particle,
                    {
                      transform: [
                        { rotate: `${Math.random() * 360}deg` },
                        { translateX: Math.random() * 30 - 15 },
                        { translateY: Math.random() * 30 - 15 },
                      ],
                      backgroundColor: `rgba(255, 255, 255, ${
                        Math.random() * 0.5 + 0.3
                      })`,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsContainer}
        >
          {QUICK_ACTIONS.map((action) => (
            <Link href={action.route} key={action.label} asChild>
              <CyberButton colors={action.gradient}>
                <View style={styles.action}>
                  <Ionicons name={action.icon} size={32} color="white" />
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </View>
              </CyberButton>
            </Link>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ACTIVE DOSES</Text>
            <Text style={styles.seeAllButton}>VIEW ALL →</Text>
          </View>

          {todaysMedications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="planet-outline" size={48} color="#3A3A7A" />
              <Text style={styles.emptyStateText}>NO ACTIVE TREATMENTS</Text>
            </View>
          ) : (
            todaysMedications.map((medication) => {
              const taken = isDoseTaken(medication.id);

              return (
                <CyberButton
                  key={medication.id}
                  colors={
                    taken ? ["#2A2A5A", "#3A3A7A"] : ["#FF2D55", "#BE22FF"]
                  }
                  onPress={() => {
                    if (!taken) {
                      handleTakeDose(medication);
                    } else {
                      handleUndoDose(medication);
                    }
                  }}
                >
                  <View style={styles.doseCard}>
                    <View style={styles.doseIcon}>
                      <Ionicons
                        name="medical"
                        size={24}
                        color={taken ? "#0BD2D3" : "white"}
                      />
                    </View>

                    <View style={styles.doseInfo}>
                      <Text style={styles.medicineName}>{medication.name}</Text>
                      <View style={styles.doseMeta}>
                        <Text style={styles.dosageInfo}>
                          {medication.dosage} • {medication.currentSupply}/
                          {medication.totalSupply} left
                        </Text>
                        <Text style={styles.timeText}>
                          {medication.times.join(", ")}
                        </Text>
                      </View>
                    </View>

                    {taken && (
                      <View style={styles.takenBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#0BD2D3"
                        />
                      </View>
                    )}
                  </View>
                </CyberButton>
              );
            })
          )}
        </View>
      </View>

      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {todaysMedications.map((medication) => (
              <View key={medication.id} style={styles.notificationItem}>
                <View style={styles.notificationItem}>
                  <Ionicons name="medical" size={24} color={medication.color} />
                </View>
                <View style={styles.notificationItem}>
                  <Text style={styles.notificationTitle}>
                    {medication.name}
                  </Text>
                  <Text style={styles.notificationMessage}>
                    {medication.dosage}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {medication.times[0]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  // MAIN CONTAINER
  container: {
    flex: 1,
    backgroundColor: "#0A0A1A", // Deep space background
  },

  // HEADER SECTION
  header: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: -50,
    left: -50,
    right: -50,
    height: 200,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 100,
  },
  headerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },
  greeting: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E0E0FF",
    textShadowColor: "rgba(255, 255, 255, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  progressContainer: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  progressPercentage: {
    position: "absolute",
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
  },
  progressParticles: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  particle: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  // TYPOGRAPHY

  sectionTitle: {
    color: "#3A3A7A", // Deep blue-gray
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 20,
    textTransform: "uppercase",
  },

  // MAIN CONTENT AREA
  content: {
    padding: 24,
  },
  actionsContainer: {
    gap: 16,
    paddingBottom: 10,
  },

  // CYBER BUTTONS
  cyberButton: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0BD2D3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  action: {
    alignItems: "center",
    gap: 12,
    width: 120,
  },
  actionLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  // DOSE
  doseCard: {
    flexDirection: "row",

    alignItems: "center",
    padding: 16,
    gap: 16,
    width: "100%",
  },
  doseIcon: {
    backgroundColor: "#1A1A4A", // Dark blue
    borderRadius: 12,
    padding: 10,
  },
  doseInfo: {
    flex: 1,
    gap: 4,
  },
  medicineName: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  doseMeta: {
    flexDirection: "row",
    gap: 12,
  },
  dosageInfo: {
    color: "#3A3A7A",
    fontSize: 12,
    fontWeight: "600",
  },
  timeText: {
    color: "#0BD2D3",
    fontSize: 12,
    fontWeight: "600",
  },

  // MISC COMPONENTS
  takenBadge: {
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    gap: 20,
  },
  emptyStateText: {
    color: "#3A3A7A",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  seeAllButton: {
    color: "#BE22FF", // Purple accent
    fontWeight: "800",
    letterSpacing: 1,
  },
  sectionHeader: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  // MODAL (Keep from previous but update colors)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1A1A4A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    color: "#0BD2D3",
    fontSize: 20,
    fontWeight: "bold",
  },
  notificationItem: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#25255A",
    marginBottom: 10,
  },
  progressTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  progressDetails: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  progressRing: {
    transform: [{ rotate: "-90deg" }],
  },
  section: {
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  }, // Add these styles
  doseMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  supplyText: {
    color: "#A0A0C0",
    fontSize: 12,
  },
  takenBadge: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
  undoButton: {
    backgroundColor: "#FF3B30",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  undoText: {
    color: "white",
    textAlign: "center",
    fontWeight: "500",
  },
});
