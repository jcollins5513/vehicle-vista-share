# Background Removal Setup Guide

This application uses [nadermx/backgroundremover](https://github.com/nadermx/backgroundremover) for AI-powered background removal. This guide will help you set it up.

## Quick Setup

### Automatic Setup (Recommended)

Run the setup script for your platform:

**Linux/macOS:**
```bash
chmod +x scripts/setup-background-remover.sh
./scripts/setup-background-remover.sh
```

**Windows:**
```bat
scripts/setup-background-remover.bat
```

### Manual Setup

#### 1. Prerequisites

- **Python 3.6+** with pip
- **FFmpeg 4.4+** (for video processing)
- **PyTorch** (CPU or GPU version)

#### 2. Install System Dependencies

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg python3-dev
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
- Download FFmpeg from https://ffmpeg.org/download.html
- Add to PATH environment variable

#### 3. Install Python Packages

```bash
# Upgrade pip
pip install --upgrade pip

# Install PyTorch (visit https://pytorch.org for GPU versions)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install backgroundremover
pip install backgroundremover
```

#### 4. Test Installation

```bash
backgroundremover --help
```

## Usage

Once installed, the background removal service will be available in the app. The service supports:

- **Single image processing**
- **Batch processing** (up to 20 images)
- **Multiple AI models**:
  - `u2net` - Best for general images (default)
  - `u2netp` - Lighter, faster version
  - `u2net_human_seg` - Optimized for people

## Models

The first time you use the service, it will automatically download the AI models:

- **u2net.pth** (~176MB) - Main model
- **u2netp.pth** (~4.7MB) - Light model  
- **u2net_human_seg.pth** (~176MB) - Human-focused model

Models are cached locally and only downloaded once.

## Troubleshooting

### Service Not Available

If you see "Service Unavailable" in the app:

1. **Check Installation:**
   ```bash
   backgroundremover --help
   ```

2. **Check API Health:**
   ```bash
   curl http://localhost:3000/api/remove-background
   ```

3. **Check Logs:**
   Look for errors in the Next.js console

### Common Issues

**"command not found: backgroundremover"**
- Ensure Python packages are installed in the correct environment
- Check if pip packages are in PATH

**"torch not found"**
- Install PyTorch: `pip install torch torchvision`
- Visit https://pytorch.org for GPU versions

**"ffmpeg not found"**
- Install FFmpeg for your system
- Ensure FFmpeg is in system PATH

**Memory Issues**
- Use `u2netp` model for lighter processing
- Process smaller batches
- Ensure sufficient RAM (4GB+ recommended)

### Performance Tips

1. **Use appropriate models:**
   - `u2net` - Best quality, slower
   - `u2netp` - Faster, good quality
   - `u2net_human_seg` - Best for people

2. **Optimize image sizes:**
   - Resize large images before processing
   - Use reasonable batch sizes (5-10 images)

3. **Hardware considerations:**
   - GPU acceleration available with CUDA-enabled PyTorch
   - More RAM = larger batch processing

## API Endpoints

The background removal service exposes these endpoints:

- `POST /api/remove-background` - Single image processing
- `PUT /api/remove-background` - Batch processing
- `GET /api/remove-background` - Health check

## Advanced Usage

### Command Line (Direct)

You can also use backgroundremover directly:

```bash
# Single image
backgroundremover -i "input.jpg" -o "output.png"

# With alpha matting (better edges)
backgroundremover -i "input.jpg" -a -ae 15 -o "output.png"

# Different model
backgroundremover -i "input.jpg" -m "u2net_human_seg" -o "output.png"

# Process folder
backgroundremover -if "/path/to/images" -of "/path/to/output"
```

### Model Selection

Choose the right model for your use case:

- **Vehicles/Objects**: `u2net` (default)
- **People/Portraits**: `u2net_human_seg`  
- **Speed over quality**: `u2netp`

## Support

For issues with:
- **This integration**: Check app logs and API health
- **backgroundremover itself**: Visit https://github.com/nadermx/backgroundremover
- **PyTorch/CUDA**: Visit https://pytorch.org

The service is designed to work reliably on your home computer setup and can handle vehicle images flawlessly.
