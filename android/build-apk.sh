#!/usr/bin/env bash
set -euo pipefail

echo "================================================================="
echo "       🚀 Mailops Pro Production APK Compilation & Signer        "
echo "================================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configure Java Environment
if [ -d "/opt/homebrew/Cellar/openjdk@17/17.0.20.1/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/opt/homebrew/Cellar/openjdk@17/17.0.20.1/libexec/openjdk.jdk/Contents/Home"
elif [ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
elif [ -d "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
fi

if [ -n "${JAVA_HOME:-}" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
fi

# Define Paths
SDK_ROOT="/Users/krtvysingh/Library/Android/sdk"
BUILD_TOOLS="$SDK_ROOT/build-tools/36.0.0"
PLATFORM_JAR="$SDK_ROOT/platforms/android-36/android.jar"

AAPT2="$BUILD_TOOLS/aapt2"
D8="$BUILD_TOOLS/d8"
ZIPALIGN="$BUILD_TOOLS/zipalign"
APKSIGNER="$BUILD_TOOLS/apksigner"

APP_DIR="$SCRIPT_DIR/app"
BUILD_DIR="$APP_DIR/build"
OUTPUT_DIR="$ROOT_DIR/dist-apk"

mkdir -p "$BUILD_DIR/compiled_res" "$BUILD_DIR/gen" "$BUILD_DIR/classes" "$OUTPUT_DIR" "$APP_DIR/src/main/assets"

echo "📦 Step 1: Building optimized Web Application Assets..."
npm --prefix "$ROOT_DIR/web" run build
rm -rf "$APP_DIR/src/main/assets/dist"
cp -r "$ROOT_DIR/web/dist" "$APP_DIR/src/main/assets/dist"

echo "🎨 Step 2: Compiling Android Resources with AAPT2..."
"$AAPT2" compile --dir "$APP_DIR/src/main/res" -o "$BUILD_DIR/compiled_res.zip"

echo "🔗 Step 3: Linking Resources & Generating R.java..."
"$AAPT2" link \
    -I "$PLATFORM_JAR" \
    --manifest "$APP_DIR/src/main/AndroidManifest.xml" \
    --java "$BUILD_DIR/gen" \
    -o "$BUILD_DIR/base_unaligned.apk" \
    -A "$APP_DIR/src/main/assets" \
    --auto-add-overlay \
    "$BUILD_DIR/compiled_res.zip"

echo "☕ Step 4: Compiling Java Sources with javac..."
javac -d "$BUILD_DIR/classes" \
    -cp "$PLATFORM_JAR" \
    "$BUILD_DIR/gen/me/mailops/app/R.java" \
    "$APP_DIR/src/main/java/me/mailops/app/MainActivity.java"

echo "⚡ Step 5: Transforming Bytecode to classes.dex with D8..."
"$D8" \
    --lib "$PLATFORM_JAR" \
    --min-api 24 \
    --output "$BUILD_DIR" \
    $(find "$BUILD_DIR/classes" -name "*.class")

echo "📦 Step 6: Assembling Package with DEX & Assets..."
cp "$BUILD_DIR/base_unaligned.apk" "$BUILD_DIR/unaligned.apk"
cd "$BUILD_DIR"
jar -uf "$BUILD_DIR/unaligned.apk" classes.dex
cd "$ROOT_DIR"

echo "📐 Step 7: Optimizing & 4-Byte Zip-Aligning APK..."
"$ZIPALIGN" -p -f -v 4 "$BUILD_DIR/unaligned.apk" "$BUILD_DIR/mailops-aligned.apk"

echo "🔐 Step 8: Generating Release Keystore & Signing APK (v1 + v2 + v3 Scheme)..."
KEYSTORE="$APP_DIR/mailops-release.keystore"
KEY_ALIAS="mailops_release"
KEY_PASS="mailops_secure_pass_2026"

if [ ! -f "$KEYSTORE" ]; then
    keytool -genkeypair -v \
        -keystore "$KEYSTORE" \
        -alias "$KEY_ALIAS" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass "$KEY_PASS" \
        -keypass "$KEY_PASS" \
        -dname "CN=Mailops Release, OU=Mobile Security, O=Mailops Corp, L=San Francisco, ST=California, C=US"
fi

"$APKSIGNER" sign \
    --ks "$KEYSTORE" \
    --ks-key-alias "$KEY_ALIAS" \
    --ks-pass "pass:$KEY_PASS" \
    --key-pass "pass:$KEY_PASS" \
    --v1-signing-enabled true \
    --v2-signing-enabled true \
    --v3-signing-enabled true \
    --out "$OUTPUT_DIR/mailops-pro-signed.apk" \
    "$BUILD_DIR/mailops-aligned.apk"

echo "================================================================="
echo "🔍 Step 9: In-Depth Layer Verification & Security Check          "
echo "================================================================="

echo "--- 1. Cryptographic Signature Verification ---"
"$APKSIGNER" verify --verbose --print-certs "$OUTPUT_DIR/mailops-pro-signed.apk"

echo "--- 2. Manifest & Package Badging Analysis ---"
"$AAPT2" dump badging "$OUTPUT_DIR/mailops-pro-signed.apk" | head -n 25

echo "================================================================="
echo "🎉 SUCCESS: Complete signed APK ready at:                         "
echo "   $OUTPUT_DIR/mailops-pro-signed.apk"
echo "================================================================="
