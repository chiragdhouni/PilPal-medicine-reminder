import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  LayoutAnimation,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getMedications,
  getDoseHistory,
  recordDose,
  Medication,
  DoseHistory,
} from "../../utils/storage";
import { useFocusEffect } from "@react-navigation/native";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<Medication[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    const [meds, history] = await Promise.all([
      getMedications(),
      getDoseHistory(),
    ]);
    setMedications(meds);
    setDoseHistory(history);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleMonthChange = (direction: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedDate(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() + direction,
          1
        )
      );
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const renderCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const calendar: JSX.Element[] = [];
    let week: JSX.Element[] = [];

    for (let i = 0; i < firstDay; i++) {
      week.push(<View key={`empty-${i}`} style={styles.dayContainer} />);
    }

    for (let day = 1; day <= days; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      const hasDoses = doseHistory.some(
        (d) => new Date(d.timestamp).toDateString() === date.toDateString()
      );

      week.push(
        <TouchableOpacity
          key={day}
          style={[styles.dayContainer, isToday && styles.todayContainer]}
          onPress={() => setSelectedDate(date)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dayText, isToday && styles.todayText]}>
            {day}
          </Text>
          {hasDoses && <View style={styles.eventIndicator} />}
        </TouchableOpacity>
      );

      if (week.length === 7) {
        calendar.push(
          <View key={`week-${day}`} style={styles.weekContainer}>
            {week}
          </View>
        );
        week = [];
      }
    }

    return (
      <Animated.View style={{ opacity: fadeAnim }}>{calendar}</Animated.View>
    );
  };

  const renderMedications = () => {
    const dateStr = selectedDate.toDateString();
    const dayDoses = doseHistory.filter(
      (d) => new Date(d.timestamp).toDateString() === dateStr
    );

    return medications.map((med) => {
      const taken = dayDoses.some((d) => d.medicationId === med.id && d.taken);

      return (
        <TouchableOpacity
          key={med.id}
          style={styles.medicationCard}
          activeOpacity={0.9}
          onPress={async () => {
            if (!taken) {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut
              );
              await recordDose(med.id, true, new Date().toISOString());
              loadData();
            }
          }}
        >
          <View
            style={[styles.medicationColor, { backgroundColor: med.color }]}
          />
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{med.name}</Text>
            <Text style={styles.medicationDetails}>
              {med.dosage} • {med.times.join(", ")}
            </Text>
          </View>
          {taken ? (
            <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
          ) : (
            <View style={styles.takeButton}>
              <Text style={styles.takeButtonText}>TAKE</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6366F1", "#4338CA"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medication Calendar</Text>
        </View>
      </LinearGradient>

      <View style={styles.calendarSection}>
        <View style={styles.monthNavigator}>
          <TouchableOpacity onPress={() => handleMonthChange(-1)}>
            <Ionicons name="chevron-back" size={24} color="#6366F1" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {selectedDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity onPress={() => handleMonthChange(1)}>
            <Ionicons name="chevron-forward" size={24} color="#6366F1" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayContainer}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayText}>
              {day}
            </Text>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.calendarGrid}>
          {renderCalendar()}
        </ScrollView>
      </View>

      <View style={styles.scheduleSection}>
        <Text style={styles.scheduleTitle}>
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
        <ScrollView contentContainerStyle={styles.medicationList}>
          {renderMedications()}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "white",
    fontFamily: "Inter-SemiBold",
  },
  calendarSection: {
    margin: 20,
    marginTop: -20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  monthNavigator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    color: "#1E293B",
    fontFamily: "Inter-SemiBold",
  },
  weekdayContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekdayText: {
    color: "#64748B",
    fontSize: 14,
    fontFamily: "Inter-Medium",
  },
  calendarGrid: {
    paddingBottom: 8,
  },
  weekContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dayContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    margin: 2,
  },
  dayText: {
    color: "#1E293B",
    fontSize: 16,
    fontFamily: "Inter-Medium",
  },
  todayContainer: {
    backgroundColor: "#6366F110",
  },
  todayText: {
    color: "#6366F1",
    fontFamily: "Inter-SemiBold",
  },
  eventIndicator: {
    position: "absolute",
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6366F1",
  },
  scheduleSection: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  scheduleTitle: {
    fontSize: 20,
    color: "#1E293B",
    marginBottom: 16,
    fontFamily: "Inter-SemiBold",
  },
  medicationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicationColor: {
    width: 8,
    height: 32,
    borderRadius: 4,
    marginRight: 16,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "Inter-SemiBold",
    marginBottom: 4,
  },
  medicationDetails: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Inter-Regular",
  },
  takeButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  takeButtonText: {
    color: "white",
    fontFamily: "Inter-SemiBold",
    fontSize: 14,
  },
  medicationList: {
    paddingBottom: 24,
  },
});
