
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  ViewStyle,
} from "react-native";
import { appleBlue, zincColors } from "@/constants/Colors";

type ButtonVariant = "primary" | "secondary" | "destructive";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps {
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  children,
  style,
  textStyle,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];
    
    switch (variant) {
      case "primary":
        return [
          ...baseStyle,
          { backgroundColor: appleBlue },
          disabled && styles.disabled,
          style,
        ];
      case "secondary":
        return [
          ...baseStyle,
          {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: isDark ? zincColors.zinc400 : zincColors.zinc600,
          },
          disabled && styles.disabled,
          style,
        ];
      case "destructive":
        return [
          ...baseStyle,
          { backgroundColor: "#FF3B30" },
          disabled && styles.disabled,
          style,
        ];
      default:
        return [...baseStyle, style];
    }
  };

  const getTextStyle = () => {
    const baseTextStyle = [styles.text, styles[`${size}Text`]];
    
    switch (variant) {
      case "primary":
        return [
          ...baseTextStyle,
          { color: "white" },
          disabled && styles.disabledText,
          textStyle,
        ];
      case "secondary":
        return [
          ...baseTextStyle,
          { color: isDark ? zincColors.zinc200 : zincColors.zinc800 },
          disabled && styles.disabledText,
          textStyle,
        ];
      case "destructive":
        return [
          ...baseTextStyle,
          { color: "white" },
          disabled && styles.disabledText,
          textStyle,
        ];
      default:
        return [...baseTextStyle, textStyle];
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        getButtonStyle(),
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "secondary" ? appleBlue : "white"}
        />
      ) : (
        <Text style={getTextStyle()}>{children}</Text>
      )}
    </Pressable>
  );
}

export default Button;

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});
