# Tamagotchi ovladač

BLE remote for the ESP32 `TamagotchiPet` (Capacitor + @capacitor-community/bluetooth-le).
The same code also runs in Chrome on Android over HTTPS (Web Bluetooth).

## Get the APK from GitHub (no local tools)

1. Create a GitHub repository and upload everything from this folder, including the hidden `.github` folder. Commit to `main`.
2. The **Actions** tab runs "Build APK" automatically (about 5-8 minutes).
3. On your phone open the repo, then **Releases**, and download `app-debug.apk`. Allow "install unknown apps" when asked.
4. On first launch allow "Nearby devices".

The workflow also keeps the APK as a downloadable artifact on each run.

## Settings

Device name, UUIDs and the sent characters ("1" to "4") are at the top of `src/main.js` and in the buttons in `www/index.html`.
