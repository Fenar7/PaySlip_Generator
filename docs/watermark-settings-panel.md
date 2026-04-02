# Watermark Settings Panel

A comprehensive UI component for configuring PDF watermarks in the PDF Studio feature. This component provides a complete interface for setting up text and image watermarks with full customization options.

## Features

### Watermark Types
- **None**: No watermark
- **Text**: Custom text watermark with full typography controls
- **Image**: Upload and configure image watermarks

### Text Watermark Options
- Custom text content input
- Font size slider (12-72px)
- Color picker with hex color display
- Opacity control (5-100%)

### Image Watermark Options
- File upload with drag-and-drop support
- Image preview with thumbnail
- Scale adjustment (10-100%)
- Opacity control (5-100%)
- Supported formats: JPEG, PNG, WEBP, HEIC, HEIF
- File size limit: 5MB

### Position & Layout
- 3×3 position grid (Top/Center/Bottom × Left/Center/Right)
- Rotation slider (0-360°)
- Scope selection (All pages / First page only)

## Usage

### Basic Implementation

```tsx
import { WatermarkSettingsPanel } from "@/components/watermark-settings-panel";
import { PDF_STUDIO_DEFAULT_SETTINGS } from "@/features/pdf-studio/constants";
import type { PageSettings } from "@/features/pdf-studio/types";

function MyComponent() {
  const [settings, setSettings] = useState<PageSettings>(PDF_STUDIO_DEFAULT_SETTINGS);

  return (
    <WatermarkSettingsPanel 
      settings={settings} 
      onChange={setSettings} 
    />
  );
}
```

### Advanced Integration with State Management

```tsx
import { 
  WatermarkSettingsPanel,
  updateWatermarkSettings,
  enableWatermark,
  disableWatermark 
} from "@/components/watermark-settings-panel";

function AdvancedComponent() {
  const [settings, setSettings] = useState<PageSettings>(defaultSettings);

  const handleWatermarkChange = useCallback((newSettings: PageSettings) => {
    setSettings(newSettings);
    // Auto-save to localStorage
    savePdfStudioSession(images, newSettings);
  }, []);

  // Programmatically enable text watermark
  const enableTextWatermark = () => {
    setSettings(enableWatermark(settings, 'text'));
  };

  // Programmatically disable watermark
  const disableWatermark = () => {
    setSettings(disableWatermark(settings));
  };

  return (
    <WatermarkSettingsPanel 
      settings={settings} 
      onChange={handleWatermarkChange} 
    />
  );
}
```

## Props

### WatermarkSettingsPanelProps

| Prop | Type | Description |
|------|------|-------------|
| `settings` | `PageSettings` | Current PDF settings including watermark configuration |
| `onChange` | `(settings: PageSettings) => void` | Callback fired when any watermark setting changes |

## State Structure

The component manages watermark settings through the `WatermarkSettings` type:

```typescript
type WatermarkSettings = {
  enabled: boolean;
  type: 'none' | 'text' | 'image';
  text?: {
    content: string;
    fontSize: number;     // 12-72px
    color: string;        // hex color
    opacity: number;      // 0-100%
  };
  image?: {
    file?: File;
    previewUrl?: string;
    scale: number;        // 10-100%
    opacity: number;      // 0-100%
  };
  position: WatermarkPosition;  // 3x3 grid positions
  rotation: number;             // 0-360°
  scope: 'all' | 'first';      // page scope
};
```

## Utility Functions

The component uses several utility functions from `@/features/pdf-studio/utils/watermark`:

- `enableWatermark(settings, type)` - Enable watermark with specific type
- `disableWatermark(settings)` - Disable watermark
- `updateWatermarkText(settings, updates)` - Update text properties
- `updateWatermarkImage(settings, updates)` - Update image properties
- `updateWatermarkPosition(settings, position)` - Update position
- `updateWatermarkRotation(settings, rotation)` - Update rotation
- `updateWatermarkScope(settings, scope)` - Update page scope
- `setWatermarkImageFile(settings, file)` - Handle image file upload

## Design System

### Component Structure

The component follows the established design patterns from `page-settings-panel.tsx`:

- **OptionGroup**: Radio button grids for type and scope selection
- **TextInput**: Styled text inputs with focus states
- **SliderInput**: Range inputs with value display
- **ColorInput**: Color picker with hex display
- **PositionGrid**: 3×3 button grid for position selection
- **ImageUploadSection**: File upload with preview

### Styling

Follows the PDF Studio design system:

```css
/* Primary colors */
--accent: Orange accent color for selected states
--foreground: Primary text color
--muted-foreground: Secondary text color

/* Borders and backgrounds */
--border-soft: Light border color
--border-strong: Darker border for hover states

/* Spacing */
space-y-6: Major section spacing
space-y-4: Sub-section spacing
space-y-2: Label-to-content spacing
```

### Accessibility

- All inputs have proper labels and ARIA attributes
- Keyboard navigation support for all interactive elements
- Focus states with visible indicators
- Color contrast compliance
- Screen reader friendly descriptions

## File Upload Handling

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WEBP (.webp)
- HEIC (.heic)
- HEIF (.heif)

### Validation
- File type validation against supported formats
- File size limit: 5MB
- Error handling with user-friendly messages

### Preview
- Thumbnail generation using URL.createObjectURL
- File metadata display (name, size)
- Remove functionality to clear uploaded image

## Integration with PDF Generation

The watermark settings integrate seamlessly with the existing PDF generation pipeline:

1. **Settings Persistence**: Auto-saves to localStorage via session storage utilities
2. **PDF Rendering**: Settings are consumed by `pdf-generator.ts` for watermark overlay
3. **Position Calculation**: Position grid maps to precise PDF coordinates
4. **File Handling**: Uploaded images are converted to appropriate formats for PDF embedding

## Testing

Comprehensive test suite included:

```bash
npm test watermark-settings-panel.test.tsx
```

Tests cover:
- Component rendering with different states
- User interactions (clicks, input changes)
- File upload functionality
- State updates and callbacks
- Accessibility requirements

## Performance Considerations

- **Lazy Loading**: Image previews loaded on demand
- **Debounced Updates**: Slider changes are optimized for smooth interaction
- **Memory Management**: Proper cleanup of object URLs for uploaded images
- **Minimal Re-renders**: Uses React.memo and useCallback for optimization

## Browser Compatibility

- Modern browsers with File API support
- Graceful degradation for older browsers
- Mobile-responsive design with touch-friendly controls

## Related Components

- `PageSettingsPanel` - Main PDF settings panel
- `ImageOrganizer` - Image management interface  
- `OcrProgressPanel` - OCR status display
- `PdfPreview` - Live PDF preview with watermark overlay