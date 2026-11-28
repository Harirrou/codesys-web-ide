package com.harirrou.fedyet.walk

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import java.util.Locale
import kotlin.coroutines.resume
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/** Finds the walk place: from the phone's rough location, or from a town the person types. */
object Places {

    fun hasLocationPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    /** The phone's rough position as a place, or null if it cannot be found. */
    @SuppressLint("MissingPermission") // callers check hasLocationPermission first
    suspend fun fromPhone(context: Context): WalkPlace? {
        if (!hasLocationPermission(context)) return null
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val providers = runCatching { manager.getProviders(true) }.getOrDefault(emptyList())
        val last = providers.mapNotNull { runCatching { manager.getLastKnownLocation(it) }.getOrNull() }.maxByOrNull { it.time }
        val location = last ?: fresh(context, manager, providers) ?: return null
        return WalkPlace(location.latitude, location.longitude, nameOf(context, location.latitude, location.longitude))
    }

    @SuppressLint("MissingPermission")
    private suspend fun fresh(context: Context, manager: LocationManager, providers: List<String>): Location? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return null
        val provider = listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER).firstOrNull { it in providers } ?: return null
        return withTimeoutOrNull(12_000) {
            suspendCancellableCoroutine { continuation ->
                manager.getCurrentLocation(provider, null, ContextCompat.getMainExecutor(context)) { location ->
                    if (continuation.isActive) continuation.resume(location)
                }
            }
        }
    }

    /** Looks a town up by name. Null when nothing matches or the phone has no lookup service. */
    @Suppress("DEPRECATION") // the blocking call is fine here: this runs off the main thread
    suspend fun fromName(context: Context, name: String): WalkPlace? = withContext(Dispatchers.IO) {
        if (!Geocoder.isPresent()) return@withContext null
        runCatching {
            Geocoder(context, Locale.getDefault()).getFromLocationName(name, 1)?.firstOrNull()?.let {
                WalkPlace(it.latitude, it.longitude, it.locality ?: it.subAdminArea ?: it.featureName ?: name)
            }
        }.getOrNull()
    }

    @Suppress("DEPRECATION")
    private suspend fun nameOf(context: Context, latitude: Double, longitude: Double): String = withContext(Dispatchers.IO) {
        if (!Geocoder.isPresent()) return@withContext ""
        runCatching {
            Geocoder(context, Locale.getDefault()).getFromLocation(latitude, longitude, 1)?.firstOrNull()?.let {
                it.locality ?: it.subAdminArea ?: it.adminArea
            }
        }.getOrNull().orEmpty()
    }
}
