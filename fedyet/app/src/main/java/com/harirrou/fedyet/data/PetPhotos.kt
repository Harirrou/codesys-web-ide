package com.harirrou.fedyet.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Copies a picture the owner chose into the app's own files as a small square JPEG. */
object PetPhotos {
    private const val SIDE = 512

    /** Returns the saved file's path, or null if the picture could not be read. */
    suspend fun import(context: Context, source: Uri, petId: String): String? = withContext(Dispatchers.IO) {
        runCatching {
            val resolver = context.contentResolver

            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            resolver.openInputStream(source)?.use { BitmapFactory.decodeStream(it, null, bounds) }
            var sample = 1
            while (minOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= SIDE) sample *= 2

            val decoded = resolver.openInputStream(source)?.use {
                BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
            } ?: return@runCatching null

            // Phones store portrait photos sideways with a note saying how to turn them.
            val degrees = resolver.openInputStream(source)?.use { stream ->
                when (ExifInterface(stream).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                    ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                    ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                    ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                    else -> 0f
                }
            } ?: 0f

            val edge = minOf(decoded.width, decoded.height)
            val matrix = Matrix().apply {
                postRotate(degrees)
                postScale(SIDE.toFloat() / edge, SIDE.toFloat() / edge)
            }
            val square = Bitmap.createBitmap(
                decoded,
                (decoded.width - edge) / 2,
                (decoded.height - edge) / 2,
                edge,
                edge,
                matrix,
                true,
            )

            val folder = File(context.filesDir, "pets").apply { mkdirs() }
            val file = File(folder, "$petId-${System.currentTimeMillis()}.jpg")
            file.outputStream().use { square.compress(Bitmap.CompressFormat.JPEG, 88, it) }
            file.absolutePath
        }.getOrNull()
    }
}
