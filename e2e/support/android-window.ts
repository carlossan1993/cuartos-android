/** API 35 WindowManager diagnostic: require a DocumentsUI window on screen. */
export function documentPickerVisible(dump: string): boolean {
  return dump.split(/\n\s*Window #\d+/).some(window =>
    /^\s*Window\{[^\n]*\bcom\.(?:google\.android|android)\.documentsui\//.test(window) &&
    /^\s*isOnScreen=true\s*$/m.test(window) &&
    /^\s*isVisible=true\s*$/m.test(window))
}
