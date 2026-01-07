# Fix Caméra Android pour Scanner Multi-Page

## 🔍 Diagnostic Root Cause

Le `SecurityException` provient du fait que la **WebView Chromium** nécessite sa propre autorisation via `WebChromeClient.onPermissionRequest()`, même si le runtime Android a accordé la permission caméra.

### Problème Technique
1. Capacitor demande la permission Android via `Camera.requestPermissions()` ✅
2. Android accorde la permission ✅
3. La WebView tente d'accéder à la caméra via `getUserMedia()` ❌
4. Chromium (dans la WebView) n'a pas reçu son autorisation propre ❌
5. → `SecurityException`

## 📁 Fichiers à Modifier

### 1. MainActivity.java

Créez ou remplacez `android/app/src/main/java/app/lovable/f41db48dd08e462eb46d84427d4de801/MainActivity.java` :

```java
package app.lovable.f41db48dd08e462eb46d84427d4de801;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingPermissionRequest = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure WebView for camera access
        setupWebViewForCamera();
    }

    private void setupWebViewForCamera() {
        WebView webView = getBridge().getWebView();
        
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Get requested resources
                String[] resources = request.getResources();
                
                for (String resource : resources) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                        // Check if Android has camera permission
                        if (hasCameraPermission()) {
                            // Grant WebView permission
                            runOnUiThread(() -> {
                                request.grant(request.getResources());
                            });
                        } else {
                            // Store pending request and ask for Android permission
                            pendingPermissionRequest = request;
                            requestCameraPermission();
                        }
                        return;
                    }
                }
                
                // Deny other resources
                super.onPermissionRequest(request);
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                super.onPermissionRequestCanceled(request);
                pendingPermissionRequest = null;
            }
        });
    }

    private boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
                == PackageManager.PERMISSION_GRANTED;
    }

    private void requestCameraPermission() {
        ActivityCompat.requestPermissions(
            this,
            new String[] { Manifest.permission.CAMERA },
            CAMERA_PERMISSION_REQUEST_CODE
        );
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted - fulfill pending WebView request
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                    pendingPermissionRequest = null;
                }
            } else {
                // Permission denied
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.deny();
                    pendingPermissionRequest = null;
                }
            }
        }
    }
}
```

### 2. AndroidManifest.xml

Assurez-vous que `android/app/src/main/AndroidManifest.xml` contient :

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Camera Permissions -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <!-- Storage for Android < 13 -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
        android:maxSdkVersion="29" />

    <!-- Media for Android 13+ -->
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

    <!-- Internet (development) -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Biometrics -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:requestLegacyExternalStorage="true"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:label="@string/title_activity_main"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

    </application>

</manifest>
```

## 🔧 Instructions d'Installation

### Étape 1: Synchroniser le projet

```bash
# Depuis votre machine locale
git pull origin main
npm install
npm run build
npx cap sync android
```

### Étape 2: Modifier MainActivity.java

Copiez le fichier `MainActivity.java` fourni ci-dessus dans :
```
android/app/src/main/java/app/lovable/f41db48dd08e462eb46d84427d4de801/MainActivity.java
```

### Étape 3: Vérifier AndroidManifest.xml

Mettez à jour le fichier `android/app/src/main/AndroidManifest.xml` avec le contenu fourni.

### Étape 4: Reconstruire et tester

```bash
npx cap sync android
npx cap run android
```

## 🧪 Plan de Test

### Test 1: Permission jamais demandée
1. Désinstallez l'app
2. Réinstallez l'app
3. Ouvrez le scanner
4. ✅ La permission doit être demandée
5. ✅ Acceptez → La caméra doit s'afficher

### Test 2: Permission acceptée
1. L'app a déjà la permission
2. Ouvrez le scanner
3. ✅ La caméra doit s'afficher immédiatement

### Test 3: Permission refusée
1. Refusez la permission quand demandée
2. ✅ Message d'erreur doit s'afficher
3. ✅ Bouton "Réessayer" doit fonctionner

### Test 4: Permission définitivement refusée
1. Refusez avec "Ne plus demander"
2. ✅ Message d'erreur avec bouton vers Paramètres
3. ✅ Après activation manuelle, relancer l'app → OK

### Test 5: Multi-page PDF
1. Capturez 3+ pages
2. Ajustez luminosité/contraste
3. Terminez et nommez le document
4. ✅ Le PDF doit être créé avec toutes les pages

### Test 6: Vérification Logcat
```bash
adb logcat | grep -E "(SecurityException|Camera|CameraPermissions)"
```
✅ Aucun `SecurityException` ne doit apparaître

## 📋 Checklist Avant Production

- [ ] MainActivity.java modifié avec WebChromeClient
- [ ] AndroidManifest.xml contient toutes les permissions
- [ ] Plus aucun SecurityException dans Logcat
- [ ] Permission fonctionne sur Android 11/12
- [ ] Permission fonctionne sur Android 13/14
- [ ] Multi-page capture → PDF fonctionne
- [ ] Recadrage fonctionne
- [ ] Ajustements luminosité/contraste fonctionnent
