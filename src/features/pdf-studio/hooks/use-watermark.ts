"use client";

import { useCallback } from "react";
import type { WatermarkSettings, WatermarkPosition, PageSettings } from "../types";
import {
  updateWatermarkSettings,
  updateWatermarkText,
  updateWatermarkImage,
  enableWatermark,
  disableWatermark,
  updateWatermarkPosition,
  updateWatermarkRotation,
  updateWatermarkScope,
  setWatermarkImageFile,
} from "../utils/watermark";

export interface UseWatermarkActions {
  // Core watermark actions
  enableTextWatermark: () => void;
  enableImageWatermark: () => void;
  disableWatermark: () => void;
  
  // Text watermark actions
  setTextContent: (content: string) => void;
  setTextFontSize: (fontSize: number) => void;
  setTextColor: (color: string) => void;
  setTextOpacity: (opacity: number) => void;
  
  // Image watermark actions
  setImageFile: (file: File | null) => void;
  setImageScale: (scale: number) => void;
  setImageOpacity: (opacity: number) => void;
  
  // Common watermark actions
  setPosition: (position: WatermarkPosition) => void;
  setRotation: (rotation: number) => void;
  setScope: (scope: 'all' | 'first') => void;
  
  // Batch updates
  updateWatermark: (updates: Partial<WatermarkSettings>) => void;
}

/**
 * Custom hook for managing watermark settings
 * @param settings Current page settings
 * @param onChange Callback to update page settings
 * @returns Watermark actions and current watermark settings
 */
export function useWatermark(
  settings: PageSettings,
  onChange: (newSettings: PageSettings) => void
): UseWatermarkActions & { watermark: WatermarkSettings } {
  
  const enableTextWatermark = useCallback(() => {
    onChange(enableWatermark(settings, 'text'));
  }, [settings, onChange]);

  const enableImageWatermark = useCallback(() => {
    onChange(enableWatermark(settings, 'image'));
  }, [settings, onChange]);

  const handleDisableWatermark = useCallback(() => {
    onChange(disableWatermark(settings));
  }, [settings, onChange]);

  const setTextContent = useCallback((content: string) => {
    onChange(updateWatermarkText(settings, { content }));
  }, [settings, onChange]);

  const setTextFontSize = useCallback((fontSize: number) => {
    onChange(updateWatermarkText(settings, { fontSize }));
  }, [settings, onChange]);

  const setTextColor = useCallback((color: string) => {
    onChange(updateWatermarkText(settings, { color }));
  }, [settings, onChange]);

  const setTextOpacity = useCallback((opacity: number) => {
    onChange(updateWatermarkText(settings, { opacity }));
  }, [settings, onChange]);

  const setImageFile = useCallback((file: File | null) => {
    onChange(setWatermarkImageFile(settings, file));
  }, [settings, onChange]);

  const setImageScale = useCallback((scale: number) => {
    onChange(updateWatermarkImage(settings, { scale }));
  }, [settings, onChange]);

  const setImageOpacity = useCallback((opacity: number) => {
    onChange(updateWatermarkImage(settings, { opacity }));
  }, [settings, onChange]);

  const setPosition = useCallback((position: WatermarkPosition) => {
    onChange(updateWatermarkPosition(settings, position));
  }, [settings, onChange]);

  const setRotation = useCallback((rotation: number) => {
    onChange(updateWatermarkRotation(settings, rotation));
  }, [settings, onChange]);

  const setScope = useCallback((scope: 'all' | 'first') => {
    onChange(updateWatermarkScope(settings, scope));
  }, [settings, onChange]);

  const updateWatermark = useCallback((updates: Partial<WatermarkSettings>) => {
    onChange(updateWatermarkSettings(settings, updates));
  }, [settings, onChange]);

  return {
    watermark: settings.watermark,
    enableTextWatermark,
    enableImageWatermark,
    disableWatermark: handleDisableWatermark,
    setTextContent,
    setTextFontSize,
    setTextColor,
    setTextOpacity,
    setImageFile,
    setImageScale,
    setImageOpacity,
    setPosition,
    setRotation,
    setScope,
    updateWatermark,
  };
}

/**
 * Simplified hook for just text watermark management
 */
export function useTextWatermark(
  settings: PageSettings,
  onChange: (newSettings: PageSettings) => void
) {
  const { 
    watermark, 
    enableTextWatermark, 
    disableWatermark,
    setTextContent,
    setTextFontSize,
    setTextColor,
    setTextOpacity,
    setPosition,
    setRotation,
    setScope 
  } = useWatermark(settings, onChange);

  return {
    watermark,
    textWatermark: watermark.text,
    isTextWatermarkEnabled: watermark.enabled && watermark.type === 'text',
    enableTextWatermark,
    disableWatermark,
    setTextContent,
    setTextFontSize,
    setTextColor,
    setTextOpacity,
    setPosition,
    setRotation,
    setScope,
  };
}

/**
 * Simplified hook for just image watermark management
 */
export function useImageWatermark(
  settings: PageSettings,
  onChange: (newSettings: PageSettings) => void
) {
  const {
    watermark,
    enableImageWatermark,
    disableWatermark,
    setImageFile,
    setImageScale,
    setImageOpacity,
    setPosition,
    setRotation,
    setScope
  } = useWatermark(settings, onChange);

  return {
    watermark,
    imageWatermark: watermark.image,
    isImageWatermarkEnabled: watermark.enabled && watermark.type === 'image',
    enableImageWatermark,
    disableWatermark,
    setImageFile,
    setImageScale,
    setImageOpacity,
    setPosition,
    setRotation,
    setScope,
  };
}