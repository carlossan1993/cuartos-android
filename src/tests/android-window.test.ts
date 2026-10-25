import { describe, expect, it } from 'vitest'
import { documentPickerVisible } from '../../e2e/support/android-window'

const window = (pkg: string, onScreen = true, visible = true) =>
  '\n  Window #8 Window{2b71b32 u0 ' + pkg + '/com.android.documentsui.picker.PickActivity}:\n' +
  '    mHasSurface=true isReadyForDisplay()=true\n' +
  '    isOnScreen=' + onScreen + '\n    isVisible=' + visible + '\n'

describe('native document picker visibility', () => {
  it.each(['com.google.android.documentsui', 'com.android.documentsui'])('recognizes the visible %s picker', pkg => {
    expect(documentPickerVisible('WINDOW MANAGER WINDOWS' + window(pkg))).toBe(true)
  })
  it('rejects background windows even when DocumentsUI appears in their metadata', () => {
    const dump = window('com.google.android.documentsui', false, false) +
      window('com.odamus.app') + '\nimeLayeringTarget com.google.android.documentsui'
    expect(documentPickerVisible(dump)).toBe(false)
  })
  it('requires on-screen and visible status on the same picker window', () => {
    expect(documentPickerVisible(window('com.android.documentsui', false, true))).toBe(false)
    expect(documentPickerVisible(window('com.android.documentsui', true, false))).toBe(false)
    expect(documentPickerVisible(window('com.android.documentsui', false, true) + window('com.android.documentsui', true, false))).toBe(false)
  })
  it('rejects a different foreground app and bare references without a window', () => {
    expect(documentPickerVisible(window('com.odamus.app'))).toBe(false)
    expect(documentPickerVisible('imeLayeringTarget com.android.documentsui/com.android.documentsui.picker.PickActivity\nisOnScreen=true\nisVisible=true')).toBe(false)
  })
})
