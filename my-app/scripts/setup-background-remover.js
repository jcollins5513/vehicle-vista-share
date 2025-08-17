#!/usr/bin/env node

/**
 * Setup script for background remover dependencies
 * This script helps install Python and the backgroundremover package
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class BackgroundRemoverSetup {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.pythonCmd = this.isWindows ? 'python' : 'python3';
    this.pipCmd = this.isWindows ? 'pip' : 'pip3';
  }

  async run() {
    console.log('🚀 Setting up Background Remover...\n');

    try {
      await this.checkPython();
      await this.checkPip();
      await this.installBackgroundRemover();
      await this.testInstallation();
      
      console.log('\n✅ Background Remover setup completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. You can now use the BackgroundRemoverService in your application');
      console.log('2. Call the API endpoint: POST /api/background-removal');
      console.log('3. Use the React component to process vehicle images');
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      console.log('\n🔧 Manual installation steps:');
      this.printManualInstructions();
      process.exit(1);
    }
  }

  async checkPython() {
    console.log('🔍 Checking Python installation...');
    
    return new Promise((resolve, reject) => {
      exec(`${this.pythonCmd} --version`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error('Python is not installed or not in PATH. Please install Python 3.6+ from https://python.org'));
          return;
        }
        
        const version = stdout.trim();
        console.log(`✅ Found ${version}`);
        
        // Check if version is 3.6+
        const versionMatch = version.match(/Python (\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1]);
          const minor = parseInt(versionMatch[2]);
          
          if (major < 3 || (major === 3 && minor < 6)) {
            reject(new Error('Python 3.6+ is required. Please upgrade your Python installation.'));
            return;
          }
        }
        
        resolve();
      });
    });
  }

  async checkPip() {
    console.log('🔍 Checking pip installation...');
    
    return new Promise((resolve, reject) => {
      exec(`${this.pipCmd} --version`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error('pip is not installed. Please install pip first.'));
          return;
        }
        
        console.log(`✅ Found ${stdout.trim()}`);
        resolve();
      });
    });
  }

  async installBackgroundRemover() {
    console.log('📦 Installing backgroundremover package...');
    
    return new Promise((resolve, reject) => {
      const installProcess = spawn(this.pipCmd, ['install', '--upgrade', 'backgroundremover'], {
        stdio: 'inherit'
      });
      
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ backgroundremover installed successfully');
          resolve();
        } else {
          reject(new Error(`Installation failed with exit code ${code}`));
        }
      });
      
      installProcess.on('error', (error) => {
        reject(new Error(`Failed to start installation: ${error.message}`));
      });
    });
  }

  async testInstallation() {
    console.log('🧪 Testing backgroundremover installation...');
    
    return new Promise((resolve, reject) => {
      exec('backgroundremover --help', (error, stdout, stderr) => {
        if (error) {
          reject(new Error('backgroundremover command not found. Installation may have failed.'));
          return;
        }
        
        console.log('✅ backgroundremover is working correctly');
        resolve();
      });
    });
  }

  printManualInstructions() {
    console.log('\n📋 Manual Installation Instructions:');
    console.log('1. Install Python 3.6+ from https://python.org');
    console.log('2. Install pip if not already installed');
    console.log('3. Run: pip install --upgrade backgroundremover');
    console.log('4. Install PyTorch from https://pytorch.org');
    
    if (this.isWindows) {
      console.log('\n🪟 Windows-specific notes:');
      console.log('- Make sure Python is added to your PATH');
      console.log('- You may need to install Microsoft Visual C++ Build Tools');
      console.log('- Consider using Windows Subsystem for Linux (WSL) for better compatibility');
    } else {
      console.log('\n🐧 Linux/macOS notes:');
      console.log('- You may need to install python3-dev: sudo apt install python3-dev');
      console.log('- Install ffmpeg: sudo apt install ffmpeg');
    }
  }
}

// Run the setup
if (require.main === module) {
  const setup = new BackgroundRemoverSetup();
  setup.run();
}

module.exports = BackgroundRemoverSetup;