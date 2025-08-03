# PyNote - Python Notebook in the Browser

PyNote is an interactive Python notebook application that runs entirely in the browser using Pyodide. It provides a Jupyter-like experience with code cells, markdown support, and rich output display, all without requiring a server.

## Features

- 🐍 **Browser-based Python Execution**: Run Python code directly in the browser using Pyodide
- 📝 **Rich Cell Types**: Support for both code and markdown cells
- 🎨 **Themable UI**: Multiple built-in themes with customizable appearance
- 💾 **File System Integration**: Save and load notebooks with the browser's file system API
- 📊 **Rich Output**: Display images, tables, and other rich outputs from Python
- 🖥️ **Integrated Terminal**: Built-in terminal for file operations and package management
- 🔌 **Package Management**: Install Python packages directly from PyPI

## How It Works

### Pyodide Integration

PyNote uses [Pyodide](https://pyodide.org/), which is a Python distribution for the browser and Node.js based on WebAssembly. Here's how it works:

1. **Initialization**: When the app loads, it initializes Pyodide in a Web Worker
2. **Code Execution**: Python code is sent to the worker where Pyodide executes it
3. **Output Handling**: The output is captured and sent back to the main thread for display
4. **File System**: Pyodide provides a virtual file system that can be synced with the browser's file system API

### Key Components

- **Kernel**: Manages Python execution using Pyodide
- **Cell System**: Handles code and markdown cells with execution state
- **File System**: Manages file operations and persistence
- **Theme System**: Provides customizable theming for the UI
- **Terminal**: Interactive terminal for file operations and package management

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/hemantsingh443/pynote.git
   cd pynote
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser to `http://localhost:5173`

## Usage

1. **Create a new notebook**: Click the "New" button in the sidebar
2. **Add cells**: Use the "+ Code" or "+ Text" buttons to add new cells
3. **Run code**: Press `Shift+Enter` or click the run button to execute a cell
4. **Save your work**: Use the save button in the header to download your notebook
5. **Install packages**: Use the terminal to install Python packages with `%pip install package-name`

## File System

PyNote provides a virtual file system with the following structure:

- `/mnt`: Mount point for user directories
- `/content`: Default directory for storing notebooks and generated files
- `/tmp`: Temporary directory

## Customization

### Themes

PyNote comes with several built-in themes. To change the theme:

1. Click the theme selector in the header
2. Choose from the available themes
3. Your preference will be saved in the browser's local storage

### Keyboard Shortcuts

- `Shift+Enter`: Run the current cell 

remain to be added:
- `Ctrl+Enter`: Run the current cell and insert a new cell below
- `Esc`: Enter command mode
- `a`: Insert a cell above
- `b`: Insert a cell below
- `d,d`: Delete the current cell

## Development

### Project Structure

```
src/
  ├── components/     # React components
  ├── kernel/        # Pyodide kernel and execution logic
  ├── store/         # State management
  ├── styles/        # Global styles and theming
  ├── types/         # TypeScript type definitions
  └── utils/         # Utility functions
```

### Building for Production

```bash
npm run build
# or
yarn build
```

This will create a production build in the `dist` directory.

## License

MIT

## Acknowledgements

- [Pyodide](https://pyodide.org/) - Python with the scientific stack, compiled to WebAssembly
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - The code editor that powers VS Code
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling  

```
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
