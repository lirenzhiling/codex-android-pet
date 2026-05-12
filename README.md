# Codex Android 桌宠

[English](README.en.md)

一个可在 **Android** 平台运行的 Codex 桌宠应用，支持悬浮窗显示、大小调节，以及导入 Codex 生成的 `webp` 精灵图。

![faa90317698587ed01c9838c4817eace](./assets/faa90317698587ed01c9838c4817eace.jpg)

## 功能特性

- 支持 Android 悬浮窗桌宠显示
- 支持桌宠大小调节（`0.3x ~ 3.0x`）
- 支持导入 Codex 生成的 `spritesheet.webp`
- 支持内置/导入桌宠管理（添加、选择、重命名、删除）

## 技术栈

- React Native 0.85
- TypeScript
- React Navigation
- AsyncStorage / React Native FS

## 快速开始

### 环境要求

- Node.js `>= 22.11.0`
- Android Studio + Android SDK
- 一台已开启开发者模式的 Android 设备或模拟器

### 安装依赖

```bash
npm install
```

### 运行项目（Android）

```bash
npm start
npm run android
```

## 导入 Codex 生成的 WEBP

1. 在应用中进入 **添加桌宠** 页面
2. 点击 **选择精灵图 (webp)**
3. 选择 Codex 生成的 `spritesheet.webp`
4. 输入桌宠名称并确认添加
5. 返回首页后可选择并开启悬浮窗显示



## 项目结构

```text
src/
  components/   # 动画组件
  screens/      # 页面
  services/     # 存储与导入逻辑
  native/       # 原生模块桥接
```

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。
