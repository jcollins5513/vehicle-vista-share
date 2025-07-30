@echo off
REM Setup script for nadermx/backgroundremover on Windows

echo 🚀 Setting up nadermx/backgroundremover for Windows...

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 3 is required but not installed.
    echo Please install Python 3.6 or higher from https://python.org
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

REM Show Python version
echo 📍 Python version:
python --version

REM Upgrade pip
echo ⬆️ Upgrading pip...
python -m pip install --upgrade pip

REM Install PyTorch (CPU version for compatibility)
echo 🔥 Installing PyTorch...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

REM Install backgroundremover
echo 🎨 Installing backgroundremover...
pip install backgroundremover

REM Test installation
echo 🧪 Testing installation...
backgroundremover --help >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ backgroundremover installed successfully!
    
    echo 📥 Downloading AI models on first use...
    echo Note: Models will be downloaded automatically when first used.
    
    echo.
    echo 🎉 Setup complete! You can now use background removal in the app.
    echo.
    echo Available models:
    echo   - u2net ^(default, best for general images^)
    echo   - u2netp ^(lighter version^)
    echo   - u2net_human_seg ^(optimized for people^)
    echo.
    echo ⚠️ Note: You may need to install FFmpeg separately for video processing:
    echo    Download from: https://ffmpeg.org/download.html
    echo.
) else (
    echo ❌ Installation failed. Please check the error messages above.
    echo.
    echo Manual installation steps:
    echo 1. python -m pip install --upgrade pip
    echo 2. pip install torch torchvision
    echo 3. pip install backgroundremover
    echo.
    pause
    exit /b 1
)

echo Setup completed successfully!
pause
