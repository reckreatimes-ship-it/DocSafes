# Configuration des Permissions Android pour DocSafe

## AndroidManifest.xml

Après avoir exécuté `npx cap add android`, modifiez le fichier `android/app/src/main/AndroidManifest.xml` pour ajouter les permissions suivantes :

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions Caméra -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <!-- Permissions Stockage pour Android < 10 (API < 29) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
        android:maxSdkVersion="29" />

    <!-- Permissions Médias pour Android 13+ (API 33+) -->
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />

    <!-- Accès au stockage complet pour Android 11+ (si nécessaire) -->
    <!-- Décommentez uniquement si vous avez besoin d'accéder à tous les fichiers -->
    <!-- <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" /> -->

    <!-- Permission Internet (pour le hot-reload en développement) -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Biométrie -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:requestLegacyExternalStorage="true">

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

        <!-- Provider pour le partage de fichiers -->
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

    <!-- Requêtes pour le partage -->
    <queries>
        <intent>
            <action android:name="android.intent.action.SENDTO" />
            <data android:scheme="mailto" />
        </intent>
        <intent>
            <action android:name="android.intent.action.SEND" />
            <data android:mimeType="*/*" />
        </intent>
    </queries>

</manifest>
```

## Fichier file_paths.xml

Créez le fichier `android/app/src/main/res/xml/file_paths.xml` :

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="." />
    <cache-path name="cache" path="." />
    <files-path name="files" path="." />
</paths>
```

## Compatibilité Android

### Android 10 (API 29)
- Utilise `READ_EXTERNAL_STORAGE` pour accéder aux photos
- `requestLegacyExternalStorage="true"` dans l'application

### Android 11 (API 30)
- Scoped Storage obligatoire
- `READ_EXTERNAL_STORAGE` limité aux médias
- Le plugin Camera de Capacitor gère automatiquement

### Android 12 (API 31-32)
- Mêmes règles qu'Android 11
- Nouvelles restrictions sur les exports

### Android 13 (API 33)
- `READ_MEDIA_IMAGES` et `READ_MEDIA_VIDEO` au lieu de `READ_EXTERNAL_STORAGE`
- Permissions granulaires pour les médias

### Android 14 (API 34)
- Permissions photos partielles possibles
- Le plugin Camera gère les restrictions

## Gestion des Permissions en Kotlin (si personnalisation nécessaire)

Si vous devez personnaliser la gestion des permissions, modifiez `android/app/src/main/java/.../MainActivity.kt` :

```kotlin
package app.lovable.f41db48dd08e462eb46d84427d4de801

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    
    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }
    
    /**
     * Vérifie si toutes les permissions requises sont accordées
     */
    fun checkAllPermissions(): Boolean {
        val permissions = getRequiredPermissions()
        return permissions.all { permission ->
            ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    /**
     * Retourne la liste des permissions requises selon la version Android
     */
    private fun getRequiredPermissions(): List<String> {
        val permissions = mutableListOf<String>()
        
        // Caméra
        permissions.add(Manifest.permission.CAMERA)
        
        // Stockage selon la version Android
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+
            permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
            permissions.add(Manifest.permission.READ_MEDIA_VIDEO)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10-12
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
        } else {
            // Android < 10
            permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }
        
        return permissions
    }
    
    /**
     * Demande les permissions manquantes
     */
    fun requestMissingPermissions() {
        val permissions = getRequiredPermissions().filter { permission ->
            ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()
        
        if (permissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE)
        }
    }
    
    /**
     * Vérifie si une permission est définitivement refusée
     */
    fun isPermissionPermanentlyDenied(permission: String): Boolean {
        return !ActivityCompat.shouldShowRequestPermissionRationale(this, permission) &&
               ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED
    }
    
    /**
     * Ouvre les paramètres de l'application
     */
    fun openAppSettings() {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", packageName, null)
        }
        startActivity(intent)
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val deniedPermissions = permissions.filterIndexed { index, _ ->
                grantResults[index] != PackageManager.PERMISSION_GRANTED
            }
            
            // Notify the WebView about permission results
            // The Capacitor plugin handles this automatically
        }
    }
}
```

## Instructions d'Installation

1. **Exporter le projet sur GitHub** via le bouton "Export to Github"

2. **Cloner et installer** :
   ```bash
   git clone <votre-repo>
   cd <votre-projet>
   npm install
   ```

3. **Ajouter Android** :
   ```bash
   npx cap add android
   ```

4. **Modifier AndroidManifest.xml** avec les permissions ci-dessus

5. **Créer file_paths.xml** pour le partage de fichiers

6. **Construire et synchroniser** :
   ```bash
   npm run build
   npx cap sync android
   ```

7. **Lancer sur un appareil** :
   ```bash
   npx cap run android
   ```

## Vérification dans les Paramètres Android

Pour vérifier que DocSafe apparaît correctement dans les paramètres :

1. Ouvrez **Paramètres** > **Applications** > **DocSafe**
2. Appuyez sur **Autorisations**
3. Vous devriez voir :
   - **Appareil photo** - Pour scanner les documents
   - **Photos et vidéos** (Android 13+) ou **Fichiers et médias** (Android < 13)

## Dépannage

### Permission refusée définitivement
Si l'utilisateur refuse une permission avec "Ne plus demander", l'application doit :
1. Détecter ce cas (`shouldShowRequestPermissionRationale` retourne false)
2. Afficher un message expliquant pourquoi la permission est nécessaire
3. Proposer un bouton pour ouvrir les paramètres

### L'application n'apparaît pas dans les paramètres
- Vérifiez que l'APK est bien installé (pas juste en mode développement)
- Redémarrez l'appareil si nécessaire
