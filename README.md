# INFOGEST 2.0 Static In-Vitro Digestion Calculator

A comprehensive web-based calculator for the **INFOGEST 2.0 static in-vitro digestion model** (Minekus et al., 2014). This tool simplifies the complex calculations required for simulating human digestion in the laboratory.

## Citation

If you use this software in your research, please cite:

**INFOGEST 2.0 Calculator**  
Developed by Dr. Thomas Agius  
ETH Zurich, HEST department, Sustainable Food Processing group of prof. Alexander Mathys

**Reference:** Minekus, M., et al. (2014). A standardised static in vitro digestion method suitable for food—an international collaborative study. *Food & Function*, 5(6), 1113–1124.

If you use the dashboard (including the e-learning dashboard views), please cite both Dr. Thomas Agius and this repository.

**AMA citation example (software/repository):**  
Agius T. INFOGEST 2.0 Static In-Vitro Digestion Calculator (dashboard). GitHub repository. Available at: https://github.com/<owner>/<repo>. Published 2024. Accessed March 5, 2026.

## About

INFOGEST 2.0 is a standardized static in-vitro digestion model designed to simulate the oral, gastric, and intestinal phases of human digestion. This calculator automates all the tedious calculations required to prepare reagents, enzymes, and other components needed for running digestion experiments.

**Reference:** Minekus et al. (2014). *A standardised static in vitro digestion method suitable for food—an international collaborative study*. Food & Function, 5(6), 1113–1124.

## Features

- **Multi-phase digestion calculator**: Oral → Gastric → Intestinal phases
- **Dual substrate support**: Food or Algae sample modes
- **Batch processing**: Calculate for multiple samples simultaneously
- **Enzyme management**: Support for various enzyme products with activity tracking
- **Data export**: Export calculations to Excel (.xlsx) or JSON format
- **Data import**: Load previously saved experiments from JSON
- **Dark/Light theme**: Toggle between themes for comfortable use
- **Real-time calculations**: Instant results as you adjust parameters
- **Responsive design**: Works on desktop and tablet interfaces

## Project Structure

```
.
├── index.html              # Main HTML structure
├── css/
│   └── theme.css          # Styling and theming system
├── js/
│   ├── calc.js            # Core calculation engine
│   ├── state.js           # Application state management
│   ├── ui.js              # User interface controllers
│   └── export.js          # Export functionality
├── data/
│   └── defaults.json      # Default values for all digestion phases
└── .gitignore             # Git configuration
```

### File Descriptions

- **[index.html](index.html)**: Main application interface with header, input forms, and result tables
- **[css/theme.css](css/theme.css)**: Comprehensive styling with CSS variables for theming support
- **[js/calc.js](js/calc.js)**: Pure calculation functions for all digestion phase computations
- **[js/state.js](js/state.js)**: Application state management and persistence
- **[js/ui.js](js/ui.js)**: UI event handlers and dynamic content updates
- **[js/export.js](js/export.js)**: Excel and JSON export/import functionality
- **[data/defaults.json](data/defaults.json)**: Default parameters for each digestion phase

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server-side setup required for basic use

### Running Locally

1. Clone the repository
2. Navigate to the project directory
3. Start a local web server (e.g., Python):
   ```bash
   python3 -m http.server 8000
   ```
4. Open `http://localhost:8000` in your browser

### Basic Usage

1. **Set up your experiment**:
   - Enter number of samples (n)
   - Specify operator name and date
   - Choose substrate type (Food or Algae)

2. **Configure each phase**:
   - Oral phase: Set food weight, duration, temperature, and amylase
   - Gastric phase: Configure pepsin, HCl, and other parameters
   - Intestinal phase: Set pancreatin, bile, and final conditions

3. **Review calculations**: Results are displayed in real-time

4. **Export results**: Download as Excel file or JSON for analysis/documentation

## Technical Stack

- **HTML5**: Semantic markup
- **CSS3**: Custom properties (variables) for theming, flexbox, grid layouts
- **Vanilla JavaScript (ES6+)**: Modular architecture with no external dependencies
- **JSON**: Data serialization for imports/exports

## Architecture

The application follows a modular design:

- **Calculation Layer** (`calc.js`): Pure functions for mathematical operations
- **State Layer** (`state.js`): Centralized state management with localStorage persistence
- **UI Layer** (`ui.js`): Event handling and DOM manipulation
- **Export Layer** (`export.js`): Data serialization and file generation

## Customization

### Modifying Default Values

Edit [data/defaults.json](data/defaults.json) to change default parameters for any digestion phase.

### Theming

The application uses CSS custom properties. Modify color values in [css/theme.css](css/theme.css) to customize the appearance.

## Browser Support

- Chrome/Edge: Latest versions
- Firefox: Latest versions
- Safari: Latest versions
- Mobile browsers: Limited support (designed primarily for desktop/tablet)

## Contributing

Contributions are welcome! Please ensure any changes maintain the modular structure and update calculations according to the INFOGEST 2.0 methodology.

### Development Guidelines

- Follow the existing code style and modular architecture
- Test calculations thoroughly against the INFOGEST 2.0 protocol
- Update documentation for any new features
- Ensure browser compatibility across modern browsers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Copyright © 2024 Dr. Thomas Agius, ETH Zurich, HEST department, Sustainable Food Processing group of prof. Alexander Mathys**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Acknowledgments

- **INFOGEST Network**: For developing and standardizing the in-vitro digestion protocol
- **ETH Zurich**: For providing the research environment and resources
- **Sustainable Food Processing Group**: For supporting the development of research tools

## Disclaimer

This software is provided for research and educational purposes. Users are responsible for validating calculations against their specific experimental conditions and ensuring compliance with laboratory safety protocols. The developers assume no liability for the use of this software in experimental procedures.

## References

- Minekus, M., et al. (2014). A standardised static in vitro digestion method suitable for food—an international collaborative study. *Food & Function*, 5(6), 1113–1124.
- [INFOGEST Official Website](https://www.infogest.org/)

For technical issues or questions about this software, please create an issue on this GitHub repository.
