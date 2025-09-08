import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BarChart } from "react-native-chart-kit";



const SCREEN_WIDTH = Dimensions.get("window").width;
const chartConfig = {
  backgroundGradientFrom: "#f0f9ff",
  backgroundGradientTo: "#dbeafe",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(37,99,235, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(34,34,34, ${opacity})`,
  style: { borderRadius: 12 },
};

export default function App() {
  // form fields
  const [type, setType] = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");

  // activities state
  const [activities, setActivities] = useState([]);

  // daily goal (calories)
  const DAILY_CAL_GOAL = 500;

  // load activities on start
  useEffect(() => {
    loadActivities();
  }, []);

  // When activities change, save them
  useEffect(() => {
    saveActivities(activities);
  }, [activities]);

  // AsyncStorage helpers
  const saveActivities = async (arr) => {
    try {
      await AsyncStorage.setItem("fitness_activities_v1", JSON.stringify(arr));
    } catch (e) {
      console.log("Save error:", e);
    }
  };

  const loadActivities = async () => {
    try {
      const raw = await AsyncStorage.getItem("fitness_activities_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        const fixed = parsed.map((a) => ({ ...a, date: new Date(a.date) }));
        setActivities(fixed);
      }
    } catch (e) {
      console.log("Load error:", e);
    }
  };

  // Add manual activity
  const addActivity = () => {
    if (!type.trim()) {
      Alert.alert("Missing", "Please enter activity type");
      return;
    }
    if (!duration || isNaN(duration)) {
      Alert.alert("Invalid", "Enter valid duration (minutes)");
      return;
    }
    if (!calories || isNaN(calories)) {
      Alert.alert("Invalid", "Enter valid calories");
      return;
    }
    const newAct = {
      id: Date.now().toString(),
      type: type.trim(),
      duration: parseInt(duration),
      calories: parseInt(calories),
      date: new Date(),
    };
    const updated = [...activities, newAct];
    setActivities(updated);
    setType("");
    setDuration("");
    setCalories("");
  };

  // Summaries (daily & weekly)
  const computeSummary = () => {
    const now = new Date();
    const todayStr = now.toDateString();

    const daily = activities.filter((a) => new Date(a.date).toDateString() === todayStr);
    const weekly = activities.filter((a) => {
      const diffDays = (now - new Date(a.date)) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });

    const dailyCalories = daily.reduce((s, a) => s + (a.calories || 0), 0);
    const weeklyCalories = weekly.reduce((s, a) => s + (a.calories || 0), 0);

    const dailyDuration = daily.reduce((s, a) => s + (a.duration || 0), 0);
    const weeklyDuration = weekly.reduce((s, a) => s + (a.duration || 0), 0);

    const dailyWorkouts = daily.length;
    const weeklyWorkouts = weekly.length;

    return {
      dailyCalories,
      weeklyCalories,
      dailyDuration,
      weeklyDuration,
      dailyWorkouts,
      weeklyWorkouts,
    };
  };

  const summary = computeSummary();

  // Chart data
  const chartFor = (dailyValue, weeklyValue) => ({
    labels: ["Daily", "Weekly"],
    datasets: [{ data: [dailyValue, weeklyValue] }],
  });

  const caloriesChart = chartFor(summary.dailyCalories, summary.weeklyCalories);
  const durationChart = chartFor(summary.dailyDuration, summary.weeklyDuration);
  const workoutsChart = chartFor(summary.dailyWorkouts, summary.weeklyWorkouts);

  // Progress bar component
  const ProgressBar = ({ progress }) => {
    const capped = Math.min(Math.max(progress, 0), 1);
    return (
      <View style={styles.progressOuter}>
        <View style={[styles.progressInner, { width: `${capped * 100}%` }]} />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>💪 Fitness Tracker</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Dashboard */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Dashboard</Text>

          <Text style={styles.rowText}>Daily Calories: {summary.dailyCalories} kcal</Text>
          <Text style={styles.rowText}>Weekly Calories: {summary.weeklyCalories} kcal</Text>

          <Text style={[styles.subTitle, { marginTop: 10 }]}>Daily Goal Progress</Text>
          <ProgressBar progress={summary.dailyCalories / DAILY_CAL_GOAL} />
          <Text style={styles.small}>
            {Math.round((summary.dailyCalories / DAILY_CAL_GOAL) * 100)}% of {DAILY_CAL_GOAL} kcal
          </Text>

          <View style={{ height: 12 }} />

          <Text style={styles.subTitle}>Calories (Daily vs Weekly)</Text>
          <BarChart
            data={caloriesChart}
            width={SCREEN_WIDTH - 40}
            height={170}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
          />

          <Text style={styles.subTitle}>Duration (minutes)</Text>
          <BarChart
            data={durationChart}
            width={SCREEN_WIDTH - 40}
            height={170}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
          />

          <Text style={styles.subTitle}>Workouts (count)</Text>
          <BarChart
            data={workoutsChart}
            width={SCREEN_WIDTH - 40}
            height={170}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
          />
        </View>

        {/* Activity log */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Logged Activities</Text>
          {activities.length === 0 ? (
            <Text style={styles.small}>No activities yet. Add one below!</Text>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={[...activities].reverse()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.activityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>{item.type}</Text>
                    <Text style={styles.small}>
                      {item.duration ? `${item.duration} min` : ""} • {item.calories} kcal
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.small}>{new Date(item.date).toLocaleDateString()}</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* Add activity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>➕ Add Activity</Text>

          <TextInput
            value={type}
            onChangeText={setType}
            placeholder="Exercise Type (e.g., Running, Yoga)"
            style={styles.input}
          />
          <TextInput
            value={duration}
            onChangeText={setDuration}
            placeholder="Duration (minutes)"
            style={styles.input}
            keyboardType="numeric"
          />
          <TextInput
            value={calories}
            onChangeText={setCalories}
            placeholder="Calories Burned"
            style={styles.input}
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.button} onPress={addActivity}>
            <Text style={styles.buttonText}>Add Activity</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5fbff",
    paddingTop: Platform.OS === "android" ? 28 : 48,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#0b3d91",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#0b3d91",
    marginBottom: 6,
  },
  big: {
    fontSize: 28,
    fontWeight: "700",
    color: "#16327b",
  },
  small: {
    fontSize: 12,
    color: "#556",
  },
  button: {
    backgroundColor: "#245ce6",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  rowText: {
    fontSize: 14,
    color: "#1e3a8a",
    fontWeight: "600",
  },
  subTitle: {
    fontSize: 13,
    color: "#1e3a8a",
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 4,
  },
  chart: {
    borderRadius: 10,
    marginVertical: 8,
    alignSelf: "center",
  },
  progressOuter: {
    height: 12,
    backgroundColor: "#e6f0ff",
    borderRadius: 12,
    overflow: "hidden",
  },
  progressInner: {
    height: 12,
    backgroundColor: "#34d399",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomColor: "#f0f6ff",
    borderBottomWidth: 1,
  },
  activityTitle: {
    fontWeight: "600",
    color: "#1e344f",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e6eefc",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
});
