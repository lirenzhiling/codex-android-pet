# Codex Android Desktop Pet

[中文](README.md)

An **Android-only** desktop pet app built with React Native. It supports floating overlay display, size scaling, and importing Codex-generated `webp` spritesheets.

## Features

- Android floating overlay pet
- Pet scaling (`0.3x ~ 3.0x`)
- Import Codex-generated `spritesheet.webp`
- Built-in/imported pet management (add, select, rename, delete)

## Tech Stack

- React Native 0.85
- TypeScript
- React Navigation
- AsyncStorage / React Native FS

## Quick Start

### Requirements

- Node.js `>= 22.11.0`
- Android Studio + Android SDK
- An Android device or emulator with developer mode enabled

### Install Dependencies

```bash
npm install
```

### Run (Android)

```bash
npm start
npm run android
```

## Import Codex WEBP

1. Open **Add Pet** in the app
2. Tap **Select Spritesheet (webp)**
3. Choose the Codex-generated `spritesheet.webp`
4. Enter a pet name and confirm
5. Return to the home page to select and enable the overlay

## Project Structure

```text
src/
  components/   # animation components
  screens/      # screens
  services/     # storage and import logic
  native/       # native module bridge
```

## License

This project is open-sourced under the [MIT License](./LICENSE).
