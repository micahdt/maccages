# Maccages

Maccages brings a native app experience to Google Messages on macOS. Built from the ground up using Electron, it breaks the Google Messages web client out of the browser and embeds it seamlessly into the Apple ecosystem. 

## ✨ Features

- **Frameless Native UI**: Custom window injection to seamlessly integrate with the macOS traffic lights, ditching bulky browser borders.
- **Native Quick Reply**: Fully custom-built background message injection engine. Reply directly from macOS notification banners without ever switching focus to the app!
- **Persistent Anti-Idle**: Overrides standard web visibility state limits, preventing the client from disconnecting when hidden in the background.
- **Persistent Backgrounding**: Run silently in the background all day.
- **Auto-Launch on Startup**: Boot quietly with your Mac so you never miss a text.
- **System Dark Mode Sync**: Automatically forces the internal web app to switch themes alongside your macOS settings.

## System Requirements

* **OS:** macOS 11.0 or later
* **Hardware:** Works on Macs with Apple Silicon (M1/M2/M3/M4)
  
## 🚀 Installation

### Option 1: Homebrew (Recommended)
If you have [Homebrew](https://brew.sh) installed, you can easily install and automatically update Maccages.

```bash
brew install micahdt/tap/maccages
```

*To update the app in the future, just run `brew upgrade maccages`!*

### Option 2: Manual Download

1. Go to the **[Releases](https://github.com/micahdt/maccages/releases)** tab and download the latest `Maccages-v#.#.#-mac-arm64.zip`.
2. Extract the ZIP file.
3. Drag the `Maccages.app` file directly into your Mac's `/Applications` folder.
4. Launch the app from your Launchpad or Applications folder. 

> [!NOTE]
> Since Maccages is a free, open-source app, it is currently "unsigned". When you open it for the very first time, your Mac may block it with an "unidentified developer" warning. To bypass this, simply **Right-Click** on the app and select **Open**. You will only have to do this once!

## 🛠️ Build from Source

If you want to modify the app or compile it yourself locally:

```bash
# Clone the repository
git clone https://github.com/micahdt/maccages.git
cd maccages

# Install dependencies
npm install

# Run the app locally for testing
npm start

# Package the final distributable Application
VERSION=$(node -p "require('./package.json').version")
npx @electron/packager . "Maccages" --platform=darwin --arch=arm64 --icon=Maccages.icns --ignore=".*\.zip$" --ignore="Maccages\.app" --overwrite
```

<br/>

*Built with Antigravity*
