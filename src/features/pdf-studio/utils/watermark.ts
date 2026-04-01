"use client";

import type { WatermarkSettings, WatermarkPosition, PageSettings } from "../types";

/**
 * Creates a deep clone of watermark settings to avoid mutation
 */
export function cloneWatermarkSettings(watermark: WatermarkSettings): WatermarkSettings {
  return {
    ...watermark,
    text: watermark.text ? { ...watermark.text } : undefined,
    image: watermark.image ? { ...watermark.image } : undefined,
  };
}

/**
 * Updates watermark settings with proper immutability
 */
export function updateWatermarkSettings(
  currentSettings: PageSettings,
  updates: Partial<WatermarkSettings>
): PageSettings {
  const updatedWatermark: WatermarkSettings = {
    ...currentSettings.watermark,
    ...updates,
  };

  // If updating text properties, merge with existing text
  if (updates.text && currentSettings.watermark.text) {
    updatedWatermark.text = {
      ...currentSettings.watermark.text,
      ...updates.text,
    };
  }

  // If updating image properties, merge with existing image
  if (updates.image && currentSettings.watermark.image) {
    updatedWatermark.image = {
      ...currentSettings.watermark.image,
      ...updates.image,
    };
  }

  return {
    ...currentSettings,
    watermark: updatedWatermark,
  };
}

/**
 * Updates watermark text settings
 */
export function updateWatermarkText(
  currentSettings: PageSettings,
  textUpdates: Partial<NonNullable<WatermarkSettings['text']>>
): PageSettings {
  return updateWatermarkSettings(currentSettings, {
    text: {
      ...currentSettings.watermark.text!,
      ...textUpdates,
    },
  });
}

/**
 * Updates watermark image settings
 */
export function updateWatermarkImage(
  currentSettings: PageSettings,
  imageUpdates: Partial<NonNullable<WatermarkSettings['image']>>
): PageSettings {
  return updateWatermarkSettings(currentSettings, {
    image: {
      ...currentSettings.watermark.image!,
      ...imageUpdates,
    },
  });
}

/**
 * Enables watermark with a specific type
 */
export function enableWatermark(
  currentSettings: PageSettings,
  type: 'text' | 'image'
): PageSettings {
  return updateWatermarkSettings(currentSettings, {
    enabled: true,
    type,
  });
}

/**
 * Disables watermark
 */
export function disableWatermark(currentSettings: PageSettings): PageSettings {
  return updateWatermarkSettings(currentSettings, {
    enabled: false,
    type: 'none',
  });
}

/**
 * Updates watermark position
 */
export function updateWatermarkPosition(
  currentSettings: PageSettings,
  position: WatermarkPosition
): PageSettings {
  return updateWatermarkSettings(currentSettings, { position });
}

/**
 * Updates watermark rotation
 */
export function updateWatermarkRotation(
  currentSettings: PageSettings,
  rotation: number
): PageSettings {
  // Normalize rotation to 0-359 degrees
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  return updateWatermarkSettings(currentSettings, { rotation: normalizedRotation });
}

/**
 * Updates watermark scope
 */
export function updateWatermarkScope(
  currentSettings: PageSettings,
  scope: 'all' | 'first'
): PageSettings {
  return updateWatermarkSettings(currentSettings, { scope });
}

/**
 * Sets watermark image file and generates preview URL
 */
export function setWatermarkImageFile(
  currentSettings: PageSettings,
  file: File | null
): PageSettings {
  if (!file) {
    return updateWatermarkImage(currentSettings, {
      file: undefined,
      previewUrl: undefined,
    });
  }

  const previewUrl = URL.createObjectURL(file);
  return updateWatermarkImage(currentSettings, {
    file,
    previewUrl,
  });
}

/**
 * Validates if watermark settings are complete for the current type
 */
export function isWatermarkValid(watermark: WatermarkSettings): boolean {
  if (!watermark.enabled || watermark.type === 'none') {
    return true; // Disabled watermarks are always valid
  }

  if (watermark.type === 'text') {
    return Boolean(
      watermark.text?.content?.trim() &&
      watermark.text.fontSize > 0 &&
      watermark.text.color &&
      watermark.text.opacity > 0
    );
  }

  if (watermark.type === 'image') {
    return Boolean(
      (watermark.image?.file || watermark.image?.previewUrl) &&
      watermark.image.scale > 0 &&
      watermark.image.opacity > 0
    );
  }

  return false;
}

/**
 * Gets a user-friendly description of current watermark settings
 */
export function getWatermarkDescription(watermark: WatermarkSettings): string {
  if (!watermark.enabled || watermark.type === 'none') {
    return 'No watermark';
  }

  if (watermark.type === 'text') {
    const content = watermark.text?.content?.trim() || 'Text';
    const opacity = watermark.text?.opacity || 50;
    return `Text: "${content}" (${opacity}% opacity)`;
  }

  if (watermark.type === 'image') {
    const scale = watermark.image?.scale || 30;
    const opacity = watermark.image?.opacity || 50;
    return `Image (${scale}% scale, ${opacity}% opacity)`;
  }

  return 'Unknown watermark type';
}