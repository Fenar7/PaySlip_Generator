# PDF Studio Test Checklist

## Manual Testing Checklist

### Pre-Test Setup ✅

- [ ] **Environment Ready**
  - [ ] Application running on localhost
  - [ ] Test files prepared (PDFs and images)
  - [ ] Browser dev tools open for console monitoring
  - [ ] Screen recording started (for bug reports)

- [ ] **Test Data Prepared**
  - [ ] Sample PDF files (1-page, multi-page, large)
  - [ ] Watermark images (PNG, JPG, GIF in various sizes)
  - [ ] Test passwords (weak, fair, good, strong)
  - [ ] Metadata test strings (Unicode, special chars, long text)

---

## Slice 6: Watermarking Tests

### 🔤 Text Watermarking (10 tests)

#### WM-T-001: Basic Text Watermark
**Priority:** P0  
**Steps:**
1. Navigate to PDF Studio
2. Upload a single-page PDF
3. Click "Watermark" tab
4. Toggle watermark "ON"
5. Select "Text" radio button
6. Enter text: "CONFIDENTIAL"
7. Click "Generate PDF"

**Expected Result:** PDF downloads with "CONFIDENTIAL" watermark in center
**Pass/Fail:** ___

#### WM-T-002: Text Content Validation
**Priority:** P1  
**Test Cases:**
- [ ] Empty text → Error message displayed
- [ ] Single character "X" → Renders correctly
- [ ] Long text (100+ chars) → Wraps or truncates appropriately
- [ ] Special characters "©®™" → Renders correctly
- [ ] Unicode "测试文本" → Renders correctly
- [ ] Numbers "12345" → Renders correctly
- [ ] Mixed content "Test-123_ABC" → Renders correctly

#### WM-T-003: Font Size Control
**Priority:** P1  
**Test Values:** 12, 24, 36, 48, 60, 72pt
- [ ] 12pt → Small, readable text
- [ ] 24pt (default) → Medium, clear text
- [ ] 72pt → Large, prominent text
- [ ] Size slider updates preview in real-time
- [ ] Generated PDF matches preview size

#### WM-T-004: Color Control
**Priority:** P1  
**Steps:**
1. Click color picker
2. Test colors: Red (#FF0000), Blue (#0000FF), Black (#000000), Custom hex
3. Verify color matches in preview and generated PDF
- [ ] Red watermark renders correctly
- [ ] Blue watermark renders correctly
- [ ] Black watermark renders correctly
- [ ] Custom color picker works
- [ ] Hex input accepts valid values
- [ ] Invalid hex values show error

#### WM-T-005: Opacity Control
**Priority:** P1  
**Test Values:** 5%, 25%, 50% (default), 75%, 100%
- [ ] 5% → Nearly transparent, barely visible
- [ ] 25% → Light, subtle overlay
- [ ] 50% → Balanced visibility
- [ ] 75% → Strong but not opaque
- [ ] 100% → Completely opaque
- [ ] Slider updates preview in real-time

### 🖼️ Image Watermarking (8 tests)

#### WM-I-001: Image Upload
**Priority:** P0  
**Steps:**
1. Select "Image" radio button
2. Click "Choose File" button
3. Upload PNG image
4. Verify preview appears
5. Generate PDF

**Expected Result:** Image watermark appears in PDF
**Pass/Fail:** ___

#### WM-I-002: Image Format Support
**Priority:** P1  
**Test each format:**
- [ ] PNG (transparent background) → Preserves transparency
- [ ] JPG (opaque background) → Renders with background
- [ ] GIF (animated) → Uses first frame only
- [ ] Unsupported format → Shows error message

#### WM-I-003: Image Size Handling
**Priority:** P1  
**Test different sizes:**
- [ ] Small image (100x100px) → Scales appropriately
- [ ] Medium image (500x500px) → Fits well
- [ ] Large image (2000x2000px) → Scales down properly
- [ ] Very large image (5000x5000px) → Handles without crash

#### WM-I-004: Image Scale Control
**Priority:** P1  
**Test Values:** 10%, 30% (default), 50%, 75%, 100%
- [ ] 10% → Very small watermark
- [ ] 30% → Default comfortable size
- [ ] 100% → Maximum size without distortion
- [ ] Scale slider updates preview
- [ ] Generated PDF matches preview scale

#### WM-I-005: Image Opacity Control
**Priority:** P1  
**Same as text opacity tests but with image watermark**
- [ ] 5% → Nearly transparent image
- [ ] 50% → Balanced overlay
- [ ] 100% → Fully opaque image

#### WM-I-006: Image Preview
**Priority:** P2  
- [ ] Preview shows immediately after upload
- [ ] Preview updates with scale changes
- [ ] Preview updates with opacity changes
- [ ] Preview clears when file removed
- [ ] Multiple file uploads replace previous

### 📍 Position Control (9 tests)

#### WM-P-001: Grid Position Testing
**Priority:** P0  
**Test each position with text watermark "TEST":**

| Position | Code | Expected Location | Pass/Fail |
|----------|------|------------------|-----------|
| Top Left | TL | Upper left corner | ___ |
| Top Center | TC | Upper center | ___ |
| Top Right | TR | Upper right corner | ___ |
| Center Left | CL | Left middle | ___ |
| Center | C | Dead center | ___ |
| Center Right | CR | Right middle | ___ |
| Bottom Left | BL | Lower left corner | ___ |
| Bottom Center | BC | Lower center | ___ |
| Bottom Right | BR | Lower right corner | ___ |

#### WM-P-002: Position Accuracy
**Priority:** P1  
- [ ] Watermarks don't overlap page edges
- [ ] Consistent margins across positions
- [ ] Text readable in all positions
- [ ] Images fit properly in all positions

### 🔄 Rotation Control (5 tests)

#### WM-R-001: Rotation Range Testing
**Priority:** P1  
**Test Values:** -180°, -90°, 0° (default), 90°, 180°
- [ ] -180° → Upside down
- [ ] -90° → Rotated 90° counter-clockwise
- [ ] 0° → Normal orientation
- [ ] 90° → Rotated 90° clockwise  
- [ ] 180° → Upside down (same as -180°)

#### WM-R-002: Rotation Precision
**Priority:** P2  
**Test Values:** -45°, 15°, 33°, 67°, -123°
- [ ] Precise angles render correctly
- [ ] Text remains readable at reasonable angles
- [ ] Images maintain aspect ratio during rotation

### 📄 Scope Control (4 tests)

#### WM-S-001: All Pages Scope
**Priority:** P0  
**Steps:**
1. Upload multi-page PDF (3+ pages)
2. Set scope to "All Pages"
3. Generate PDF
4. Check each page for watermark

**Expected Result:** Watermark appears on every page
**Pass/Fail:** ___

#### WM-S-002: First Page Only Scope
**Priority:** P1  
**Steps:**
1. Upload multi-page PDF (3+ pages)
2. Set scope to "First Page Only"
3. Generate PDF
4. Check pages for watermark presence

**Expected Result:** 
- [ ] Watermark on page 1
- [ ] No watermark on page 2+

### 🔄 State Management (5 tests)

#### WM-ST-001: Enable/Disable Toggle
**Priority:** P0  
- [ ] Toggle OFF → No watermark in generated PDF
- [ ] Toggle ON → Watermark appears in generated PDF
- [ ] Settings persist when toggled off/on
- [ ] Preview updates immediately with toggle

#### WM-ST-002: Type Switching
**Priority:** P1  
- [ ] Switch Text → Image: Previous text settings saved
- [ ] Switch Image → Text: Previous image settings saved
- [ ] Default values load correctly for each type
- [ ] Preview updates immediately when switching

#### WM-ST-003: Settings Persistence
**Priority:** P2  
**Steps:**
1. Configure watermark with custom settings
2. Navigate to different tab
3. Return to Watermark tab
4. Verify all settings maintained

**Expected Result:** All watermark settings preserved
**Pass/Fail:** ___

---

## Slice 7: Page Numbers Tests

### 🔢 Basic Functionality (5 tests)

#### PN-B-001: Enable Page Numbers
**Priority:** P0  
**Steps:**
1. Upload multi-page PDF
2. Click "Page Numbers" section  
3. Toggle page numbers "ON"
4. Generate PDF
5. Check each page for page numbers

**Expected Result:** Page numbers appear on all pages (except first if skipped)
**Pass/Fail:** ___

#### PN-B-002: Disable Page Numbers
**Priority:** P1  
**Steps:**
1. Enable page numbers
2. Toggle "OFF"
3. Generate PDF
4. Verify no page numbers appear

**Expected Result:** No page numbers in generated PDF
**Pass/Fail:** ___

### 📍 Position Testing (5 tests)

#### PN-P-001: Position Validation
**Priority:** P0  
**Test each position with multi-page PDF:**

| Position | Code | Expected Location | Pass/Fail |
|----------|------|------------------|-----------|
| Top Left | TL | Upper left corner | ___ |
| Top Right | TR | Upper right corner | ___ |
| Bottom Left | BL | Lower left corner | ___ |
| Bottom Right | BR | Lower right corner | ___ |
| Bottom Center | BC | Bottom center | ___ |

#### PN-P-002: Position Consistency
**Priority:** P1  
- [ ] Same position on all numbered pages
- [ ] Consistent margins from page edges
- [ ] Numbers don't overlap content
- [ ] Readable font size and color

### 📝 Format Testing (4 tests)

#### PN-F-001: Format Variations
**Priority:** P0  
**Test with 5-page PDF:**

| Format | Example | Expected Results | Pass/Fail |
|--------|---------|------------------|-----------|
| Number | "1, 2, 3, 4, 5" | Just numbers | ___ |
| Page Number | "Page 1, Page 2..." | "Page" prefix | ___ |
| Number of Total | "1 of 5, 2 of 5..." | Shows total count | ___ |
| Page Number of Total | "Page 1 of 5..." | Full format | ___ |

#### PN-F-002: Total Count Accuracy
**Priority:** P1  
**Test with different page counts:**
- [ ] 1-page PDF → "1 of 1"
- [ ] 3-page PDF → "1 of 3", "2 of 3", "3 of 3"
- [ ] 10-page PDF → "1 of 10", ..., "10 of 10"

### 🔢 Start From Control (3 tests)

#### PN-SF-001: Custom Starting Numbers
**Priority:** P1  
**Test Values:** 0, 1 (default), 5, 10, 100

| Start From | Page 1 Shows | Page 2 Shows | Page 3 Shows | Pass/Fail |
|------------|--------------|--------------|--------------|-----------|
| 0 | "0" | "1" | "2" | ___ |
| 1 | "1" | "2" | "3" | ___ |
| 5 | "5" | "6" | "7" | ___ |
| 10 | "10" | "11" | "12" | ___ |
| 100 | "100" | "101" | "102" | ___ |

#### PN-SF-002: Start From with Formats
**Priority:** P2  
**Test start from "5" with each format:**
- [ ] Number: "5, 6, 7"
- [ ] Page Number: "Page 5, Page 6, Page 7"  
- [ ] Number of Total: "5 of 8, 6 of 8, 7 of 8" (for 3-page PDF starting at 5)
- [ ] Page Number of Total: "Page 5 of 8, Page 6 of 8, Page 7 of 8"

### ⏭️ Skip First Page (4 tests)

#### PN-SKP-001: Skip First Page ON
**Priority:** P1  
**Steps:**
1. Upload 3-page PDF
2. Enable page numbers
3. Check "Skip First Page"
4. Generate PDF
5. Check each page

**Expected Result:**
- [ ] Page 1: No page number
- [ ] Page 2: Shows "2" (or "1" depending on logic)
- [ ] Page 3: Shows "3" (or "2" depending on logic)

#### PN-SKP-002: Skip First Page OFF  
**Priority:** P1  
**Expected Result:**
- [ ] Page 1: Shows page number
- [ ] Page 2: Shows sequential number
- [ ] Page 3: Shows sequential number

#### PN-SKP-003: Skip First Page with Start From
**Priority:** P2  
**Configuration:** Skip First Page ON, Start From "5"
- [ ] Page 1: No number
- [ ] Page 2: Shows "5" (or "6")
- [ ] Page 3: Shows "6" (or "7")

### 🔄 State Management (3 tests)

#### PN-ST-001: Settings Persistence
**Priority:** P2  
**Steps:**
1. Configure: Position "Top Right", Format "Page Number of Total", Start From "3"
2. Navigate away and return
3. Verify all settings maintained

**Expected Result:** All settings preserved
**Pass/Fail:** ___

---

## Slice 8: Password Protection Tests

### 🔐 Basic Password Functionality (5 tests)

#### PS-B-001: Enable Password Protection
**Priority:** P0  
**Steps:**
1. Click "Password" tab
2. Toggle password protection "ON"
3. Enter user password: "TestPass123!"
4. Confirm password: "TestPass123!"
5. Generate PDF
6. Try to open PDF

**Expected Result:** PDF requires password to open (UI only - backend not implemented)
**Pass/Fail:** ___

#### PS-B-002: Password Validation
**Priority:** P0  
- [ ] Empty password → Error message
- [ ] Mismatched passwords → Error message  
- [ ] Matching passwords → No error
- [ ] Password change clears confirmation
- [ ] Strong password shows positive validation

### 💪 Password Strength Testing (10 tests)

#### PS-STR-001: Strength Indicator Accuracy
**Priority:** P1  

| Password | Expected Strength | Expected Color | Pass/Fail |
|----------|------------------|----------------|-----------|
| "123" | Weak | Red | ___ |
| "password" | Weak | Red | ___ |
| "Password1" | Fair | Orange | ___ |
| "Password123" | Fair | Orange | ___ |
| "MySecurePass123!" | Good | Blue | ___ |
| "Tr0ub4dor&3#Complex" | Strong | Green | ___ |
| "" (empty) | No indicator | Gray | ___ |

#### PS-STR-002: Real-time Strength Updates
**Priority:** P1  
**Steps:**
1. Start typing password character by character
2. Observe strength indicator changes
3. Verify color and text updates in real-time

**Expected Behavior:**
- [ ] Strength updates with each keypress
- [ ] Color changes appropriately
- [ ] Description text updates
- [ ] No lag in updates

#### PS-STR-003: Strength Calculation Logic
**Priority:** P2  
**Test specific criteria (18-point scale):**

| Criteria | Points | Test Password | Pass/Fail |
|----------|--------|---------------|-----------|
| Length 8+ | 2 | "12345678" | ___ |
| Length 12+ | 1 additional | "123456789012" | ___ |
| Uppercase | 2 | "Password" | ___ |
| Lowercase | 1 | "password" | ___ |
| Numbers | 2 | "password123" | ___ |
| Special chars | 3 | "password123!" | ___ |
| Mixed case | 2 | "PaSSword" | ___ |
| No common words | 3 | "Zx9#mK2$pL" | ___ |
| No repeats | 2 | "abcdefgh" | ___ |

### 🔒 User Password Tests (5 tests)

#### PS-UP-001: Password Input Validation
**Priority:** P1  
- [ ] Accepts alphanumeric characters
- [ ] Accepts special characters !@#$%^&*()
- [ ] Accepts Unicode characters
- [ ] Minimum length validation (if any)
- [ ] Maximum length handling (100+ chars)

#### PS-UP-002: Password Visibility Toggle
**Priority:** P1  
- [ ] Eye icon shows/hides password
- [ ] Toggle works for both password fields
- [ ] Password masked by default
- [ ] Icons change state appropriately

#### PS-UP-003: Confirmation Field Validation
**Priority:** P0  
**Test Cases:**
- [ ] Matching passwords → No error
- [ ] Non-matching → Error displayed
- [ ] Clear confirmation when main password changes
- [ ] Error clears when passwords match

### 🔑 Owner Password Tests (3 tests)

#### PS-OP-001: Owner Password Section
**Priority:** P2  
- [ ] Section collapsed by default
- [ ] Click to expand shows owner password field
- [ ] Owner password has same validation as user password
- [ ] Can set different password than user password

#### PS-OP-002: Owner vs User Password
**Priority:** P2  
- [ ] Both passwords can be the same
- [ ] Both passwords can be different  
- [ ] Owner password is optional
- [ ] User password is required when protection enabled

### ✅ Permissions Testing (6 tests)

#### PS-PER-001: Permission Checkboxes
**Priority:** P1  
**Default State:**
- [ ] "Allow Printing" checked by default
- [ ] "Allow Copying" checked by default
- [ ] "Allow Modifying" checked by default

#### PS-PER-002: Permission Toggle Functionality
**Priority:** P1  
- [ ] Clicking checkbox toggles state
- [ ] Visual state changes (checked/unchecked)
- [ ] Multiple permissions can be unchecked
- [ ] All permissions can be unchecked
- [ ] All permissions can be checked

#### PS-PER-003: Permission Combinations
**Priority:** P2  
**Test various combinations:**
- [ ] All permissions enabled
- [ ] All permissions disabled  
- [ ] Only printing enabled
- [ ] Only copying enabled
- [ ] Only modifying enabled
- [ ] Printing + copying enabled
- [ ] Printing + modifying enabled
- [ ] Copying + modifying enabled

### 🚨 Error Handling (8 tests)

#### PS-ERR-001: Password Mismatch Errors
**Priority:** P0  
**Steps:**
1. Enter password: "Test123!"
2. Enter confirmation: "Test124!"  
3. Observe error message

**Expected Result:** Clear error message about password mismatch
**Pass/Fail:** ___

#### PS-ERR-002: Weak Password Warnings
**Priority:** P1  
- [ ] Weak password shows warning (not blocking)
- [ ] Warning message is helpful
- [ ] User can proceed with weak password
- [ ] Warning clears with stronger password

#### PS-ERR-003: Empty Field Validation
**Priority:** P1  
- [ ] Empty user password → Error when trying to generate
- [ ] Empty confirmation → Error about confirmation required
- [ ] Error messages are clear and actionable

### 🔄 State Management (4 tests)

#### PS-ST-001: Enable/Disable Toggle
**Priority:** P0  
- [ ] Toggle OFF → Password fields disabled/hidden
- [ ] Toggle ON → Password fields enabled/shown
- [ ] Previous passwords remembered when re-enabled
- [ ] PDF generation works when disabled

#### PS-ST-002: Settings Persistence
**Priority:** P2  
**Steps:**
1. Configure passwords and permissions
2. Navigate to different tab
3. Return to Password tab
4. Verify all settings maintained

**Expected Result:** All password settings preserved
**Pass/Fail:** ___

---

## Slice 9: Compression & Metadata Tests

### 🗜️ Compression Quality Tests (6 tests)

#### CM-C-001: Quality Slider Functionality
**Priority:** P1  
**Test Values:** 10%, 25%, 50%, 75%, 92% (default), 100%

| Quality | Expected Behavior | Pass/Fail |
|---------|------------------|-----------|
| 10% | Highest compression, lowest quality | ___ |
| 50% | Balanced compression and quality | ___ |
| 92% | Default - optimal balance | ___ |
| 100% | No compression, highest quality | ___ |

#### CM-C-002: Quality Impact on File Size
**Priority:** P1  
**Steps:**
1. Generate same PDF with different quality settings
2. Compare file sizes
3. Verify compression works

**Expected Results:**
- [ ] 10% quality → Smallest file size
- [ ] 100% quality → Largest file size  
- [ ] 92% default → Reasonable balance
- [ ] File sizes decrease as quality decreases

#### CM-C-003: Quality Slider UI
**Priority:** P2  
- [ ] Slider moves smoothly across range
- [ ] Value displays current percentage
- [ ] Default value is 92%
- [ ] Range limited to 10-100%

### 📝 Metadata Fields Testing (20 tests)

#### CM-M-001: Title Field
**Priority:** P1  
**Test Cases:**
- [ ] Empty title → No metadata set
- [ ] Short title "Report" → Embedded correctly
- [ ] Long title (200+ chars) → Handles appropriately
- [ ] Unicode title "测试报告" → Supports international chars
- [ ] Special chars "Q1 Report (2024) - Final!" → Handles punctuation
- [ ] Leading/trailing spaces " Title " → Trims whitespace

#### CM-M-002: Author Field  
**Priority:** P1  
**Test Cases:**
- [ ] Empty author → No metadata set
- [ ] Simple name "John Smith" → Embedded correctly
- [ ] Company name "Slipwise Technologies Inc." → Handles properly
- [ ] Unicode name "José García" → Supports accented chars
- [ ] Multiple authors "John Smith, Jane Doe" → Handles comma separation
- [ ] Long name (100+ chars) → Handles appropriately

#### CM-M-003: Subject Field
**Priority:** P1  
**Test Cases:**
- [ ] Empty subject → No metadata set  
- [ ] Short subject "Invoice" → Embedded correctly
- [ ] Descriptive subject "Monthly financial report for Q1 2024" → Handles longer text
- [ ] Unicode subject → Supports international characters
- [ ] Special characters in subject → Handles punctuation

#### CM-M-004: Keywords Field
**Priority:** P1  
**Test Cases:**
- [ ] Empty keywords → No metadata set
- [ ] Single keyword "invoice" → Embedded correctly  
- [ ] Multiple keywords "invoice, receipt, tax" → Comma-separated parsing
- [ ] Keywords with spaces "tax document, financial report" → Handles spaces
- [ ] Unicode keywords → Supports international terms
- [ ] Many keywords (20+) → Handles long lists

#### CM-M-005: Metadata Integration
**Priority:** P0  
**Steps:**
1. Fill all metadata fields with test data:
   - Title: "Test Document"
   - Author: "QA Tester"  
   - Subject: "Testing PDF metadata"
   - Keywords: "test, pdf, metadata, validation"
2. Generate PDF
3. Check PDF properties (if visible in browser/viewer)

**Expected Result:** All metadata embedded correctly
**Pass/Fail:** ___

### 🌐 Unicode and Special Character Support (8 tests)

#### CM-U-001: International Characters
**Priority:** P1  
**Test in each field:**

| Language | Test Text | Field | Pass/Fail |
|----------|-----------|-------|-----------|
| Chinese | "测试文档" | Title | ___ |
| Japanese | "テスト文書" | Title | ___ |
| Arabic | "وثيقة اختبار" | Author | ___ |
| Russian | "Тестовый документ" | Subject | ___ |
| Spanish | "Documentación técnica" | Keywords | ___ |
| French | "Rapport financier été" | All fields | ___ |

#### CM-U-002: Special Characters and Symbols
**Priority:** P1  
**Test Cases:**
- [ ] Currency symbols: "€$£¥" in title
- [ ] Math symbols: "±×÷∞" in subject  
- [ ] Punctuation: "!@#$%^&*()[]{}|;:',.<>?/" in keywords
- [ ] Emojis: "📊📈💼" in title (if supported)
- [ ] Quotation marks: "Report "Final Version"" in title

#### CM-U-003: Long Value Handling
**Priority:** P1  
**Test Cases:**
- [ ] Title: 200+ character string → Handles gracefully
- [ ] Author: 150+ character string → No truncation issues
- [ ] Subject: 300+ character string → Processes correctly
- [ ] Keywords: 500+ character string → Parses appropriately

### 🧹 Data Validation and Sanitization (6 tests)

#### CM-V-001: Whitespace Handling  
**Priority:** P1  
**Test Cases:**
- [ ] Leading spaces " Title" → Trimmed to "Title"
- [ ] Trailing spaces "Title " → Trimmed to "Title"
- [ ] Multiple spaces "Title    Document" → Handled appropriately
- [ ] Only spaces "   " → Treated as empty
- [ ] Tabs and newlines → Cleaned properly

#### CM-V-002: Empty Field Handling
**Priority:** P1  
- [ ] All fields empty → No metadata errors
- [ ] Some fields empty → Partial metadata set correctly
- [ ] Fields with only whitespace → Treated as empty
- [ ] Generate PDF with no metadata → Works normally

#### CM-V-003: Keywords Parsing
**Priority:** P1  
**Test Cases:**
- [ ] "word1,word2,word3" → Parsed as 3 keywords
- [ ] "word1, word2, word3" → Handles spaces after commas
- [ ] "word1 , word2 , word3" → Handles spaces around commas
- [ ] "single" → Single keyword without comma
- [ ] "word1,,word3" → Handles empty entries
- [ ] "" → Empty keywords handled

### 🔄 State Management (4 tests)

#### CM-ST-001: Settings Persistence
**Priority:** P2  
**Steps:**
1. Set compression quality to 75%
2. Fill all metadata fields
3. Navigate to different tab  
4. Return to settings
5. Verify all values maintained

**Expected Result:** All compression and metadata settings preserved
**Pass/Fail:** ___

#### CM-ST-002: Default Values
**Priority:** P2  
**On first load:**
- [ ] Compression quality: 92%
- [ ] All metadata fields: Empty
- [ ] Placeholders show appropriate examples
- [ ] No validation errors displayed

---

## Feature Integration Tests

### 🔄 Multi-Feature Combinations (15 tests)

#### INT-001: Watermark + Page Numbers
**Priority:** P0  
**Steps:**
1. Enable text watermark: "DRAFT"
2. Enable page numbers: Bottom center, "Page X of Y"
3. Generate PDF
4. Verify both features work without interference

**Expected Result:** Both watermark and page numbers visible, no overlap
**Pass/Fail:** ___

#### INT-002: All Features Enabled
**Priority:** P0  
**Configuration:**
- Watermark: Image watermark at top-right, 30% opacity
- Page Numbers: Bottom-left, "X of Y" format, start from 2
- Password: User password enabled
- Compression: 75% quality  
- Metadata: All fields populated

**Expected Result:** All features work together harmoniously
**Pass/Fail:** ___

#### INT-003: Feature Precedence Testing
**Priority:** P1  
**Test overlapping positions:**
- [ ] Watermark top-left + Page numbers top-left → No overlap/collision
- [ ] Multiple features in same position → Readable layout
- [ ] Content positioning adjusts appropriately

### 🎯 Edge Cases and Error Scenarios (10 tests)

#### EDG-001: Large File Handling
**Priority:** P1  
**Steps:**
1. Upload large PDF (20+ pages, 10MB+)
2. Enable multiple features
3. Generate PDF
4. Monitor performance and memory usage

**Expected Result:** Completes without crash, reasonable performance
**Pass/Fail:** ___

#### EDG-002: Malformed PDF Input
**Priority:** P2  
**Test Cases:**
- [ ] Corrupted PDF file → Error message displayed
- [ ] Non-PDF file with .pdf extension → Proper error handling
- [ ] Password-protected input PDF → Appropriate error message
- [ ] PDF with forms/interactive elements → Handles gracefully

#### EDG-003: Browser Resource Limits
**Priority:** P2  
**Test Cases:**
- [ ] Generate multiple PDFs in sequence → No memory leaks
- [ ] Large image watermarks → Handles appropriately
- [ ] Multiple large file uploads → Proper cleanup
- [ ] Long-running generation → Progress feedback

### 📱 Responsive and Accessibility Tests (8 tests)

#### ACC-001: Keyboard Navigation
**Priority:** P1  
- [ ] All controls accessible via Tab key
- [ ] Logical tab order through forms
- [ ] Enter/Space activate buttons appropriately
- [ ] Escape cancels modal/overlay actions

#### ACC-002: Screen Reader Support
**Priority:** P1  
**With screen reader enabled:**
- [ ] All form labels announced correctly
- [ ] Button purposes clear
- [ ] Error messages announced
- [ ] Progress updates communicated

#### ACC-003: Visual Accessibility
**Priority:** P1  
- [ ] Sufficient color contrast (4.5:1 minimum)
- [ ] Focus indicators visible and clear
- [ ] Error states don't rely on color alone
- [ ] Text scalable to 200% without horizontal scroll

---

## Automated Testing Reference

### 🤖 Unit Test Execution

#### Running Tests
```bash
# All unit tests
npm test

# Specific feature tests  
npm test pdf-studio

# With coverage report
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

#### Current Test Coverage
- **Total Tests:** 140+ unit tests
- **Password Tests:** 50+ tests (`password.test.ts`)
- **PDF Generator Tests:** 42+ tests (`pdf-generator.test.ts`)
- **Metadata Tests:** 42+ tests (`pdf-generator.metadata.test.ts`)
- **Image Processing:** 20+ tests (`image-processor.test.ts`)
- **Constants:** 18+ tests (`constants.test.ts`)

#### Coverage Expectations
- **Statements:** > 90%
- **Branches:** > 85%
- **Functions:** > 90%
- **Lines:** > 90%

### 🔗 Integration Test Execution

#### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test pdf-studio-integration.spec.ts

# Run with UI mode
npx playwright test --ui
```

#### Current E2E Coverage
- **Main Integration:** 25+ scenarios (`pdf-studio-integration.spec.ts`)
- **Metadata Focus:** 7 tests (`pdf-studio-metadata.spec.ts`)

### 🎯 Performance Testing

#### Benchmarks to Monitor
```bash
# Build performance
npm run build -- --analyze

# Runtime performance  
npm run test:performance
```

#### Target Metrics
- **PDF Generation:** < 5 seconds for 5-page document
- **Memory Usage:** < 200MB peak during generation
- **File Size:** Compression working as expected

### 🔧 Test Utilities

#### Shared Test Data
```typescript
// Located in test files
const TEST_PASSWORDS = {
  weak: "123",
  fair: "Password123", 
  good: "MySecurePass123!",
  strong: "Tr0ub4dor&3#Complex"
};

const TEST_METADATA = {
  title: "Test Document",
  author: "QA Tester",
  subject: "Automated testing",
  keywords: "test, automation, pdf"
};
```

#### Custom Test Helpers
- `generateTestPDF()` - Creates sample PDF for testing
- `validateWatermark()` - Checks watermark presence/properties
- `extractMetadata()` - Reads PDF metadata for validation
- `measureFileSize()` - Compares file sizes for compression tests

---

## Test Execution Schedule

### 🗓️ Testing Phases

#### Phase 1: Core Functionality (P0 Tests)
**Duration:** 2-3 hours  
**Focus:** Basic feature functionality, critical paths
- All P0 tests from each slice
- Basic integration scenarios
- Smoke tests for each major feature

#### Phase 2: Detailed Validation (P1 Tests)  
**Duration:** 4-6 hours
**Focus:** Comprehensive feature testing, edge cases
- All P1 tests from each slice
- Cross-feature integration
- Error handling validation

#### Phase 3: Polish and Edge Cases (P2 Tests)
**Duration:** 2-3 hours  
**Focus:** User experience, accessibility, performance
- All P2 tests
- Accessibility validation
- Performance benchmarking
- Browser compatibility

### 📊 Reporting

#### Test Results Format
```
Slice 6 - Watermarking: 45/47 tests passed (95.7%)
  ❌ WM-I-004: Large image scaling issue
  ❌ WM-R-002: Rotation precision at -123°
  
Slice 7 - Page Numbers: 22/22 tests passed (100%)

Slice 8 - Password Protection: 28/30 tests passed (93.3%)
  ❌ PS-STR-003: Strength calculation edge case
  ❌ PS-ERR-002: Weak password warning UX

Slice 9 - Compression & Metadata: 38/40 tests passed (95%)
  ❌ CM-U-001: Emoji support in title field
  ❌ CM-V-003: Keywords parsing with special chars

Integration Tests: 12/15 tests passed (80%)
  ❌ INT-002: All features combination memory issue
  ❌ INT-003: Watermark/page number overlap
  ❌ EDG-001: Large file performance

OVERALL: 145/154 tests passed (94.2%)
```

#### Priority Classifications
- **P0 Failures:** Block release, immediate attention required
- **P1 Failures:** Should be fixed before release
- **P2 Failures:** Nice to have, can be addressed in future releases

---

*Complete this checklist systematically, documenting all failures with detailed steps to reproduce. Each test should have clear pass/fail criteria and be executable by any team member.*