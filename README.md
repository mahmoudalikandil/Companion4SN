# ServiceNow Live Companion

An advanced live-instance developer toolkit for ServiceNow, packaged as a modern Chrome Extension (Manifest V3) and built with Vite + TypeScript.

## Getting Started

Follow these steps to build the extension and load it into Google Chrome.

### 1. Install Dependencies
Make sure you have [Node.js](https://nodejs.org/) installed, then run:
```bash
npm install
```

### 2. Build the Extension
Compile the TypeScript and bundle the files for production:
```bash
npm run build
```
*This will generate a `dist/` folder containing the compiled extension.*

### 3. Load into Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (the toggle switch in the top right corner).
3. Click the **Load unpacked** button in the top left.
4. Select the `dist/` folder that was generated in Step 2.

### 4. Usage
- Pin the extension to your Chrome toolbar for easy access.
- Navigate to your active ServiceNow instance tab (e.g., `https://your-instance.service-now.com`).
- Click the extension icon and hit **Initialize Bridge** to connect.

## Development

If you want to make changes to the code:
- Edit the TypeScript files in the `src/js/` directory.
- Run `npm run build` again to recompile.
- Go back to `chrome://extensions/` and click the **Refresh** icon (🔄) on the extension card to load your latest changes.
