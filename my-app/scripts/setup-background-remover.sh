#!/bin/bash

# Setup script for nadermx/backgroundremover
# This script installs the background removal service

echo "🚀 Setting up nadermx/backgroundremover..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.6 or higher first."
    exit 1
fi

# Check Python version
python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "📍 Python version: $python_version"

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed."
    echo "Installing pip..."
    python3 -m ensurepip --default-pip
fi

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip3 install --upgrade pip

# Install system dependencies (Linux/Ubuntu)
if command -v apt-get &> /dev/null; then
    echo "📦 Installing system dependencies (Ubuntu/Debian)..."
    sudo apt-get update
    sudo apt-get install -y ffmpeg python3-dev
elif command -v yum &> /dev/null; then
    echo "📦 Installing system dependencies (CentOS/RHEL)..."
    sudo yum install -y ffmpeg python3-devel
elif command -v brew &> /dev/null; then
    echo "📦 Installing system dependencies (macOS)..."
    brew install ffmpeg
else
    echo "⚠️ Please manually install FFmpeg for your system:"
    echo "  - Ubuntu/Debian: sudo apt install ffmpeg python3-dev"
    echo "  - macOS: brew install ffmpeg"
    echo "  - Windows: Download from https://ffmpeg.org/download.html"
fi

# Install PyTorch (CPU version for compatibility)
echo "🔥 Installing PyTorch..."
pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install backgroundremover
echo "🎨 Installing backgroundremover..."
pip3 install backgroundremover

# Test installation
echo "🧪 Testing installation..."
if backgroundremover --help &> /dev/null; then
    echo "✅ backgroundremover installed successfully!"
    
    # Download models on first run
    echo "📥 Downloading AI models (this may take a few minutes)..."
    echo "Creating test image..."
    
    # Create a simple test image using Python
    python3 -c "
from PIL import Image
import numpy as np
img = Image.fromarray(np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8))
img.save('test_input.jpg')
print('Test image created')
"
    
    # Test background removal
    backgroundremover -i "test_input.jpg" -o "test_output.png"
    
    if [ -f "test_output.png" ]; then
        echo "✅ Background removal test successful!"
        rm -f test_input.jpg test_output.png
    else
        echo "⚠️ Background removal test failed, but installation appears complete."
    fi
    
    echo ""
    echo "🎉 Setup complete! You can now use background removal in the app."
    echo ""
    echo "Available models:"
    echo "  - u2net (default, best for general images)"
    echo "  - u2netp (lighter version)"
    echo "  - u2net_human_seg (optimized for people)"
    echo ""
    
else
    echo "❌ Installation failed. Please check the error messages above."
    echo ""
    echo "Manual installation steps:"
    echo "1. pip3 install --upgrade pip"
    echo "2. pip3 install torch torchvision"
    echo "3. pip3 install backgroundremover"
    echo ""
    exit 1
fi
