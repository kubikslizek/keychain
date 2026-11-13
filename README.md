# Tamagotchi ovladač v2

BLE remote for the ESP32 `TamagotchiPet` (Capacitor + @capacitor-community/bluetooth-le).
Has its own in-app device finder (no system picker). The finder uses native BLE scanning, so it works in the APK, not in a desktop/Chrome browser.

## Get the APK from GitHub

1. Upload everything from this folder to a GitHub repo (replace existing files). Make sure `.github/workflows/build-apk.yml` exists.
2. The **Actions** tab builds the APK on every push to `main` (about 5-8 minutes).
3. On your phone open the repo, then **Releases**, and download `app-debug.apk`. Allow "install unknown apps" when asked.
4. On first launch allow "Nearby devices".

## Settings

Device name, UUIDs, scan length and the four moods (with the characters sent) are at the top of `src/main.js`.
