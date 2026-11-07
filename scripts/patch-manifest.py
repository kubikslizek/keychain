"""Adds the BLE permissions to the generated Android manifest (run by CI after `cap add android`)."""
PATH = 'android/app/src/main/AndroidManifest.xml'
PERMS = '''
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />
'''
text = open(PATH, encoding='utf-8').read()
if 'BLUETOOTH_SCAN' not in text:
    text = text.replace('</manifest>', PERMS + '</manifest>')
    open(PATH, 'w', encoding='utf-8').write(text)
print('manifest ok')
