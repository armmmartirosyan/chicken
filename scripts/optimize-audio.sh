#!/bin/bash

# Audio Optimization Script
# Reduces all audio files to mono, 48-64kbps for minimal file size
# Saves approximately 1.0-1.2MB

set -e  # Exit on error

echo "🎵 Audio Optimization Script"
echo "=============================="
echo ""

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg is not installed!"
    echo ""
    echo "To install ffmpeg:"
    echo "  macOS:   brew install ffmpeg"
    echo "  Ubuntu:  sudo apt install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
    echo ""
    exit 1
fi

echo "✅ ffmpeg found"
echo ""

# Navigate to audio directory
AUDIO_DIR="src/assets/audios"
cd "$AUDIO_DIR" || exit 1

echo "📂 Working directory: $AUDIO_DIR"
echo ""

# Backup original files (optional)
if [ "$1" == "--backup" ]; then
    echo "💾 Creating backups..."
    mkdir -p backups
    cp -r *.webm *.mp3 backups/ 2>/dev/null || true
    echo "✅ Backups created in backups/"
    echo ""
fi

# Optimize Soundtrack (most aggressive - mono 48kbps)
echo "🎼 Optimizing Soundtrack.webm (mono, 48kbps)..."
if [ -f "Soundtrack.webm" ]; then
    ffmpeg -i "Soundtrack.webm" \
           -ac 1 \
           -b:a 48k \
           -c:a libopus \
           -y \
           "Soundtrack-optimized.webm" \
           2>&1 | tail -3
    
    ORIGINAL_SIZE=$(du -h "Soundtrack.webm" | cut -f1)
    mv "Soundtrack-optimized.webm" "Soundtrack.webm"
    NEW_SIZE=$(du -h "Soundtrack.webm" | cut -f1)
    
    echo "   ✅ Soundtrack.webm: $ORIGINAL_SIZE → $NEW_SIZE"
else
    echo "   ⚠️  Soundtrack.webm not found, skipping"
fi
echo ""

# Optimize all other WebM files (mono 64kbps)
echo "🔊 Optimizing other WebM files (mono, 64kbps)..."
for file in *.webm; do
    # Skip if it's the soundtrack (already done) or if no files match
    [ "$file" = "Soundtrack.webm" ] && continue
    [ "$file" = "*.webm" ] && continue
    
    echo "   Processing: $file"
    
    ffmpeg -i "$file" \
           -ac 1 \
           -b:a 64k \
           -c:a libopus \
           -y \
           "${file%.webm}-optimized.webm" \
           2>&1 | tail -3
    
    ORIGINAL_SIZE=$(du -h "$file" | cut -f1)
    mv "${file%.webm}-optimized.webm" "$file"
    NEW_SIZE=$(du -h "$file" | cut -f1)
    
    echo "   ✅ $file: $ORIGINAL_SIZE → $NEW_SIZE"
done
echo ""

# Optimize MP3 files (mono 64kbps)
echo "🎵 Optimizing MP3 files (mono, 64kbps)..."
for file in *.mp3; do
    # Skip if no files match
    [ "$file" = "*.mp3" ] && continue
    
    echo "   Processing: $file"
    
    ffmpeg -i "$file" \
           -ac 1 \
           -b:a 64k \
           -y \
           "${file%.mp3}-optimized.mp3" \
           2>&1 | tail -3
    
    ORIGINAL_SIZE=$(du -h "$file" | cut -f1)
    mv "${file%.mp3}-optimized.mp3" "$file"
    NEW_SIZE=$(du -h "$file" | cut -f1)
    
    echo "   ✅ $file: $ORIGINAL_SIZE → $NEW_SIZE"
done
echo ""

# Show total size
echo "📊 Final Audio Directory Size:"
du -sh .
echo ""

echo "✅ Audio optimization complete!"
echo ""
echo "Next steps:"
echo "  1. Rebuild the project: yarn build"
echo "  2. Check new size: du -h dist/index.html"
echo "  3. Test audio in the game to ensure quality is acceptable"
echo ""
echo "Expected build size: < 5.0MB"
