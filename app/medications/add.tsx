import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import * as Font from "expo-font";
import * as Animatable from "react-native-animatable";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { addMedication } from "../../utils/storage";
import {
  scheduleMedicationReminder,
  scheduleRefillReminder,
} from "../../utils/notifications";

const { width } = Dimensions.get("window");

const FREQUENCIES = [
  {
    id: "1",
    label: "Once daily",
    icon: "sunny-outline" as const,
    times: ["09:00"],
  },
  {
    id: "2",
    label: "Twice daily",
    icon: "sync-outline" as const,
    times: ["09:00", "21:00"],
  },
  {
    id: "3",
    label: "Three times daily",
    icon: "time-outline" as const,
    times: ["09:00", "15:00", "21:00"],
  },
  {
    id: "4",
    label: "Four times daily",
    icon: "repeat-outline" as const,
    times: ["09:00", "13:00", "17:00", "21:00"],
  },
  { id: "5", label: "As needed", icon: "calendar-outline" as const, times: [] },
];

const DURATIONS = [
  { id: "1", label: "7 days", value: 7 },
  { id: "2", label: "14 days", value: 14 },
  { id: "3", label: "30 days", value: 30 },
  { id: "4", label: "90 days", value: 90 },
  { id: "5", label: "Ongoing", value: -1 },
];

export default function AddMedicationScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    startDate: new Date(),
    times: ["09:00"],
    notes: "",
    reminderEnabled: true,
    refillReminder: false,
    currentSupply: "",
    refillAt: "",
  });
  const [fontLoaded, setFontLoaded] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    // Load custom font
    Font.loadAsync({
      "Poppins-Bold": require("../../assets/fonts/Poppins-Bold.ttf"),
      "Poppins-SemiBold": require("../../assets/fonts/Poppins-SemiBold.ttf"),
      "Poppins-Medium": require("../../assets/fonts/Poppins-Medium.ttf"),
    }).then(() => setFontLoaded(true));
  }, []);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.name.trim()) {
      newErrors.name = "Medication name is required";
    }

    if (!form.dosage.trim()) {
      newErrors.dosage = "Dosage is required";
    }

    if (!form.frequency) {
      newErrors.frequency = "Frequency is required";
    }

    if (!form.duration) {
      newErrors.duration = "Duration is required";
    }

    if (form.refillReminder) {
      if (!form.currentSupply) {
        newErrors.currentSupply =
          "Current supply is required for refill tracking";
      }
      if (!form.refillAt) {
        newErrors.refillAt = "Refill alert threshold is required";
      }
      if (Number(form.refillAt) >= Number(form.currentSupply)) {
        newErrors.refillAt = "Refill alert must be less than current supply";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    animateButton();
    try {
      if (!validateForm()) {
        Alert.alert("Error", "Please fill in all required fields correctly");
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      // Generate a random color
      const colors = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const medicationData = {
        id: Math.random().toString(36).substr(2, 9),
        ...form,
        currentSupply: form.currentSupply ? Number(form.currentSupply) : 0,
        totalSupply: form.currentSupply ? Number(form.currentSupply) : 0,
        refillAt: form.refillAt ? Number(form.refillAt) : 0,
        startDate: form.startDate.toISOString(),
        color: randomColor,
      };

      await addMedication(medicationData);

      // Schedule reminders if enabled
      if (medicationData.reminderEnabled) {
        await scheduleMedicationReminder(medicationData);
      }
      if (medicationData.refillReminder) {
        await scheduleRefillReminder(medicationData);
      }

      Alert.alert(
        "Success",
        "Medication added successfully",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert(
        "Error",
        "Failed to save medication. Please try again.",
        [{ text: "OK" }],
        { cancelable: false }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFrequencySelect = (freq: string) => {
    setSelectedFrequency(freq);
    const selectedFreq = FREQUENCIES.find((f) => f.label === freq);
    setForm((prev) => ({
      ...prev,
      frequency: freq,
      times: selectedFreq?.times || [],
    }));
    if (errors.frequency) {
      setErrors((prev) => ({ ...prev, frequency: "" }));
    }
  };

  const handleDurationSelect = (dur: string) => {
    setSelectedDuration(dur);
    setForm((prev) => ({ ...prev, duration: dur }));
    if (errors.duration) {
      setErrors((prev) => ({ ...prev, duration: "" }));
    }
  };
  const renderFrequencyOptions = () => {
    return (
      <View style={styles.optionsGrid}>
        {FREQUENCIES.map((freq) => (
          <Animatable.View
            key={freq.id}
            animation="fadeInUp"
            duration={500}
            delay={100 * parseInt(freq.id)}
            style={styles.optionContainer} // Add this style
          >
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedFrequency === freq.label && styles.selectedOptionCard,
              ]}
              onPress={() => handleFrequencySelect(freq.label)}
            >
              <LinearGradient
                colors={
                  selectedFrequency === freq.label
                    ? ["#7F5AFF", "#5A2BFF"]
                    : ["#2A2A3A", "#1F1F2B"]
                }
                style={styles.optionGradient}
              >
                <Ionicons
                  name={freq.icon}
                  size={24}
                  color={selectedFrequency === freq.label ? "#FFF" : "#7F5AFF"}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    selectedFrequency === freq.label &&
                      styles.selectedOptionLabel,
                  ]}
                >
                  {freq.label}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        ))}
      </View>
    );
  };

  const renderDurationOptions = () => {
    return (
      <View style={styles.optionsGrid}>
        {DURATIONS.map((dur) => (
          <TouchableOpacity
            key={dur.id}
            style={[
              styles.optionCard,
              selectedDuration === dur.label && styles.selectedOptionCard,
            ]}
            onPress={() => {
              setSelectedDuration(dur.label);
              setForm({ ...form, duration: dur.label });
            }}
          >
            <Text
              style={[
                styles.durationNumber,
                selectedDuration === dur.label && styles.selectedDurationNumber,
              ]}
            >
              {dur.value > 0 ? dur.value : "∞"}
            </Text>
            <Text
              style={[
                styles.optionLabel,
                selectedDuration === dur.label && styles.selectedOptionLabel,
              ]}
            >
              {dur.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient colors={["#0F0F1F", "#1A1A2F"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#7F5AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Medication</Text>
        </View>

        {/* Medication Details Section */}
        <Animatable.View animation="fadeInUp" style={styles.formSection}>
          <Text style={styles.sectionLabel}>Medication Details</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Medication Name"
              placeholderTextColor="#666"
              value={form.name}
              onChangeText={(text) => {
                setForm({ ...form, name: text });
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, errors.dosage && styles.inputError]}
              placeholder="Dosage (e.g., 500mg)"
              placeholderTextColor="#666"
              value={form.dosage}
              onChangeText={(text) => {
                setForm({ ...form, dosage: text });
                if (errors.dosage) setErrors({ ...errors, dosage: "" });
              }}
            />
            {errors.dosage && (
              <Text style={styles.errorText}>{errors.dosage}</Text>
            )}
          </View>
        </Animatable.View>
        {/* Frequency Selection */}
        {/* Frequency Selection */}
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          style={styles.formSection}
        >
          <Text style={styles.sectionLabel}>Dosage Frequency</Text>
          {errors.frequency && (
            <Text style={styles.errorText}>{errors.frequency}</Text>
          )}
          {renderFrequencyOptions()}
        </Animatable.View>

        {/* Duration Selection */}
        <Animatable.View
          animation="fadeInUp"
          delay={300}
          style={styles.formSection}
        >
          <Text style={styles.sectionLabel}>Treatment Duration</Text>
          {errors.duration && (
            <Text style={styles.errorText}>{errors.duration}</Text>
          )}
          <View style={styles.optionsGrid}>
            {DURATIONS.map((dur) => (
              <TouchableOpacity
                key={dur.id}
                style={[
                  styles.durationCard,
                  selectedDuration === dur.label && styles.selectedDurationCard,
                ]}
                onPress={() => handleDurationSelect(dur.label)}
              >
                <Text
                  style={[
                    styles.durationNumber,
                    selectedDuration === dur.label &&
                      styles.selectedDurationNumber,
                  ]}
                >
                  {dur.value > 0 ? dur.value : "∞"}
                </Text>
                <Text style={styles.durationLabel}>{dur.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Schedule Section */}
        <Animatable.View
          animation="fadeInUp"
          delay={400}
          style={styles.formSection}
        >
          <Text style={styles.sectionLabel}>Schedule Settings</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#7F5AFF" />
            <Text style={styles.dateButtonText}>
              Starts {form.startDate.toLocaleDateString()}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={form.startDate}
              mode="date"
              display="spinner"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setForm({ ...form, startDate: date });
              }}
              themeVariant="dark"
            />
          )}

          {form.frequency && form.frequency !== "As needed" && (
            <View style={styles.timesContainer}>
              <Text style={styles.sectionLabel}>Dosage Times</Text>
              {form.times.map((time, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color="#7F5AFF" />
                  <Text style={styles.timeButtonText}>{time}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showTimePicker && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              display="spinner"
              onChange={(event, date) => {
                setShowTimePicker(false);
                if (date) {
                  const newTime = date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  setForm((prev) => ({
                    ...prev,
                    times: prev.times.map((t, i) => (i === 0 ? newTime : t)),
                  }));
                }
              }}
              themeVariant="dark"
            />
          )}
        </Animatable.View>

        {/* Reminders Section */}
        <Animatable.View
          animation="fadeInUp"
          delay={500}
          style={styles.formSection}
        >
          <View style={styles.switchRow}>
            <Ionicons name="notifications" size={22} color="#7F5AFF" />
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Dosage Reminders</Text>
              <Text style={styles.switchSubLabel}>
                Enable medication intake notifications
              </Text>
            </View>
            <Switch
              value={form.reminderEnabled}
              onValueChange={(value) =>
                setForm({ ...form, reminderEnabled: value })
              }
              trackColor={{ false: "#2A2A3A", true: "#7F5AFF" }}
              thumbColor="#FFF"
            />
          </View>
        </Animatable.View>

        {/* Refill Tracking Section */}
        <Animatable.View
          animation="fadeInUp"
          delay={600}
          style={styles.formSection}
        >
          <View style={styles.switchRow}>
            <Ionicons name="repeat" size={22} color="#7F5AFF" />
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Refill Tracking</Text>
              <Text style={styles.switchSubLabel}>
                Get low supply notifications
              </Text>
            </View>
            <Switch
              value={form.refillReminder}
              onValueChange={(value) => {
                setForm({ ...form, refillReminder: value });
                if (!value)
                  setErrors({ ...errors, currentSupply: "", refillAt: "" });
              }}
              trackColor={{ false: "#2A2A3A", true: "#7F5AFF" }}
              thumbColor="#FFF"
            />
          </View>

          {form.refillReminder && (
            <View style={styles.refillInputs}>
              <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      errors.currentSupply && styles.inputError,
                    ]}
                    placeholder="Current Supply"
                    placeholderTextColor="#666"
                    value={form.currentSupply}
                    onChangeText={(text) => {
                      setForm({ ...form, currentSupply: text });
                      if (errors.currentSupply)
                        setErrors({ ...errors, currentSupply: "" });
                    }}
                    keyboardType="numeric"
                  />
                  {errors.currentSupply && (
                    <Text style={styles.errorText}>{errors.currentSupply}</Text>
                  )}
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, errors.refillAt && styles.inputError]}
                    placeholder="Alert When Below"
                    placeholderTextColor="#666"
                    value={form.refillAt}
                    onChangeText={(text) => {
                      setForm({ ...form, refillAt: text });
                      if (errors.refillAt)
                        setErrors({ ...errors, refillAt: "" });
                    }}
                    keyboardType="numeric"
                  />
                  {errors.refillAt && (
                    <Text style={styles.errorText}>{errors.refillAt}</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </Animatable.View>

        {/* Notes Section */}
        <Animatable.View
          animation="fadeInUp"
          delay={700}
          style={styles.formSection}
        >
          <Text style={styles.sectionLabel}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Special instructions or notes..."
            placeholderTextColor="#666"
            value={form.notes}
            onChangeText={(text) => setForm({ ...form, notes: text })}
            multiline
            numberOfLines={4}
          />
        </Animatable.View>

        {/* Save Button */}
        <Animated.View
          style={[styles.footer, { transform: [{ scale: scaleValue }] }]}
        >
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={["#7F5AFF", "#5A2BFF"]}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? "Adding..." : "Add Medication"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 140 : 120,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginLeft: 15,
  },
  formContainer: {
    flex: 1,
  },
  formContentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 15,
    marginTop: 10,
  },
  mainInput: {
    fontSize: 20,
    color: "#333",
    padding: 15,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between", // Ensure equal spacing
    marginHorizontal: -5,
  },
  optionContainer: {
    width: "50%", // Each card takes 50% of the container width (2 columns)
    padding: 5, // Add padding for spacing
  },
  optionCard: {
    width: "100%",
    // Take full width of the container
    aspectRatio: 1, // Make the card square (optional)
    backgroundColor: "white",
    borderRadius: 16,
    padding: 10,

    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedOptionCard: {
    backgroundColor: "#1a8e2d",
    borderColor: "#1a8e2d",
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",

    color: "#F5F5DC",
    textAlign: "center",
  },
  selectedOptionLabel: {
    color: "white",
  },

  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  selectedOptionIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },

  durationNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a8e2d",
    marginBottom: 5,
  },
  selectedDurationNumber: {
    color: "white",
  },
  inputContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 12,

    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  switchSubLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  input: {
    padding: 15,
    fontSize: 16,
    color: "#333",
  },
  textAreaContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textArea: {
    height: 100,
    padding: 15,
    fontSize: 16,
    color: "#333",
  },
  footer: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  saveButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  saveButtonGradient: {
    paddingVertical: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  inputError: {
    borderColor: "#FF5252",
  },
  errorText: {
    color: "#FF5252",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  refillInputs: {
    marginTop: 15,
  },
  timesContainer: {
    marginTop: 20,
  },
  timesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  formSection: {
    backgroundColor: "#1F1F2B",
    margin: 15,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  sectionLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: "#7F5AFF",
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    backgroundColor: "#2A2A3A",
    borderRadius: 12,
    marginBottom: 15,
  },
  optionGradient: {
    padding: 20,
    alignItems: "center",
    borderRadius: 16,
  },
  durationCard: {
    width: (width - 100) / 3,
    backgroundColor: "#2A2A3A",
    borderRadius: 16,
    padding: 15,
    alignItems: "center",
    margin: 5,
  },
  selectedDurationCard: {
    backgroundColor: "#7F5AFF",
  },
  durationLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  notesInput: {
    height: 100,
    textAlignVertical: "top",
  },
  switchTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
});
