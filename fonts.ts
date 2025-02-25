import { Platform } from "react-native";

export const customFonts = {
  bold: Platform.select({
    ios: "Poppins-Bold", // Make sure these fonts are added to your project
    android: "Poppins-Bold",
  }),
  semiBold: Platform.select({
    ios: "Poppins-SemiBold",
    android: "Poppins-SemiBold",
  }),
  medium: Platform.select({
    ios: "Poppins-Medium",
    android: "Poppins-Medium",
  }),
  light: Platform.select({
    ios: "Poppins-Light",
    android: "Poppins-Light",
  }),
};
