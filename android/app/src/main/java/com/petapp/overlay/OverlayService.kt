package com.petapp.overlay

import android.app.*
import android.content.Intent
import android.graphics.*
import android.net.Uri
import android.os.*
import android.view.*
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.random.Random

data class AnimDef(val row: Int, val frames: Int, val fps: Int, val frameHeight: Int, val yOffset: Int)

class OverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var animHandler: Handler? = null
    private var animRunnable: Runnable? = null
    private var spritesheet: Bitmap? = null
    private var idleTimerHandler: Handler? = null
    private var idleTimerRunnable: Runnable? = null

    private var dragLeftAnim: AnimDef? = null
    private var dragRightAnim: AnimDef? = null
    private var idleAnims: List<AnimDef> = emptyList()

    private var currentAnim: AnimDef? = null
    private var currentFrame = 0
    private var isDragging = false

    private var frameWidth = 192
    private var columns = 8
    private var displayScale = 1.0f
    private var maxFrameHeight = 200
    private var frameBuffer: Bitmap? = null
    private var frameCanvas: Canvas? = null
    private val srcRect = Rect()
    private val dstRect = Rect()
    private var currentDragDirection = 0

    private var layoutParams: WindowManager.LayoutParams? = null

    companion object {
        const val CHANNEL_ID = "pet_overlay_channel"
        const val NOTIFICATION_ID = 1001
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        if (intent == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        val spritesheetUri = intent.getStringExtra("spritesheet_uri") ?: ""
        frameWidth = intent.getIntExtra("frame_width", 192)
        columns = intent.getIntExtra("columns", 8)
        displayScale = intent.getFloatExtra("scale", 1.0f)
        val animsJson = intent.getStringExtra("animations_json") ?: "{}"

        parseAnimations(animsJson)

        Thread {
            val bmp = loadBitmap(spritesheetUri)
            if (bmp != null) {
                spritesheet = bmp
                Handler(Looper.getMainLooper()).post {
                    showOverlay(bmp)
                }
            }
        }.start()

        return START_NOT_STICKY
    }

    private fun parseAnimations(json: String) {
        val idles = mutableListOf<AnimDef>()
        var parsedMaxFrameHeight = 200
        try {
            val obj = JSONObject(json)

            data class RawAnim(val key: String, val row: Int, val frames: Int, val fps: Int, val frameHeight: Int)
            val rawList = mutableListOf<RawAnim>()
            val keys = obj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                val anim = obj.getJSONObject(key)
                rawList.add(RawAnim(
                    key = key,
                    row = anim.getInt("row"),
                    frames = anim.getInt("frames"),
                    fps = anim.optInt("fps", 6),
                    frameHeight = anim.optInt("frameHeight", 200)
                ))
            }

            rawList.sortBy { it.row }
            if (rawList.isNotEmpty()) {
                parsedMaxFrameHeight = rawList.maxOf { it.frameHeight }
            }

            val yOffsets = mutableMapOf<Int, Int>()
            var cumulativeY = 0
            for (raw in rawList) {
                yOffsets[raw.row] = cumulativeY
                cumulativeY += raw.frameHeight
            }

            for (raw in rawList) {
                val def = AnimDef(
                    row = raw.row,
                    frames = raw.frames,
                    fps = raw.fps,
                    frameHeight = raw.frameHeight,
                    yOffset = yOffsets[raw.row] ?: 0
                )
                when (raw.key) {
                    "dragLeft" -> dragLeftAnim = def
                    "dragRight" -> dragRightAnim = def
                    else -> idles.add(def)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        idleAnims = idles
        if (idleAnims.isEmpty()) {
            idleAnims = listOf(AnimDef(0, 6, 6, 200, 0))
        }
        maxFrameHeight = parsedMaxFrameHeight.coerceAtLeast(1)
    }

    private fun switchToAnim(anim: AnimDef) {
        if (currentAnim == anim) return
        currentAnim = anim
        currentFrame = 0
    }

    private fun pickRandomIdle() {
        val anim = idleAnims[Random.nextInt(idleAnims.size)]
        switchToAnim(anim)
    }

    private fun startIdleTimer() {
        stopIdleTimer()
        idleTimerHandler = Handler(Looper.getMainLooper())
        idleTimerRunnable = Runnable {
            if (!isDragging) {
                pickRandomIdle()
            }
            idleTimerHandler?.postDelayed(idleTimerRunnable!!, (3000 + Random.nextLong(5000)))
        }
        idleTimerHandler?.postDelayed(idleTimerRunnable!!, (3000 + Random.nextLong(5000)))
    }

    private fun stopIdleTimer() {
        idleTimerRunnable?.let { idleTimerHandler?.removeCallbacks(it) }
    }

    private fun showOverlay(bitmap: Bitmap) {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        val displayW = (frameWidth * displayScale).toInt()
        val displayH = (maxFrameHeight * displayScale).toInt()

        val imageView = ImageView(this).apply {
            scaleType = ImageView.ScaleType.FIT_XY
        }

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            displayW,
            displayH,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 100
            y = 300
        }

        layoutParams = params
        windowManager?.addView(imageView, params)
        overlayView = imageView

        pickRandomIdle()
        setupDrag(imageView, params)
        startAnimation(imageView, bitmap)
        startIdleTimer()
    }

    private fun startAnimation(imageView: ImageView, bitmap: Bitmap) {
        frameBuffer?.recycle()
        frameBuffer = Bitmap.createBitmap(frameWidth, maxFrameHeight, Bitmap.Config.ARGB_8888)
        val buffer = frameBuffer ?: return
        frameCanvas = Canvas(buffer)
        imageView.setImageBitmap(buffer)

        animHandler = Handler(Looper.getMainLooper())
        animRunnable = object : Runnable {
            override fun run() {
                val anim = currentAnim ?: return
                val canvas = frameCanvas ?: return
                val col = currentFrame % anim.frames
                val srcX = col * frameWidth
                val srcY = anim.yOffset

                val cropH = anim.frameHeight
                val safeW = minOf(frameWidth, bitmap.width - srcX)
                val safeH = minOf(cropH, bitmap.height - srcY)

                canvas.drawColor(Color.TRANSPARENT, PorterDuff.Mode.CLEAR)
                if (safeW > 0 && safeH > 0) {
                    srcRect.set(srcX, srcY, srcX + safeW, srcY + safeH)
                    dstRect.set(0, 0, safeW, safeH)
                    canvas.drawBitmap(bitmap, srcRect, dstRect, null)
                }
                imageView.invalidate()

                currentFrame = (currentFrame + 1) % anim.frames
                animHandler?.postDelayed(this, (1000 / anim.fps).toLong())
            }
        }
        animHandler?.post(animRunnable!!)
    }

    private fun setupDrag(view: View, params: WindowManager.LayoutParams) {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = true
                    currentDragDirection = 0
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - initialTouchX
                    params.x = initialX + dx.toInt()
                    params.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager?.updateViewLayout(view, params)

                    val nextDragDirection = when {
                        dx < -12 -> -1
                        dx > 12 -> 1
                        else -> 0
                    }
                    if (nextDragDirection != currentDragDirection) {
                        when (nextDragDirection) {
                            -1 -> dragLeftAnim?.let { switchToAnim(it) }
                            1 -> dragRightAnim?.let { switchToAnim(it) }
                        }
                        currentDragDirection = nextDragDirection
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    isDragging = false
                    currentDragDirection = 0
                    pickRandomIdle()
                    true
                }
                else -> false
            }
        }
    }

    private fun loadBitmap(uri: String): Bitmap? {
        return try {
            when {
                uri.startsWith("asset://") -> {
                    val path = uri.removePrefix("asset:///").removePrefix("asset://")
                    val input = assets.open(path)
                    BitmapFactory.decodeStream(input)
                }
                uri.contains("android_asset") -> {
                    val path = uri.substringAfter("android_asset/")
                    val input = assets.open(path)
                    BitmapFactory.decodeStream(input)
                }
                uri.startsWith("http") -> {
                    val url = URL(uri)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.doInput = true
                    conn.connect()
                    val input: InputStream = conn.inputStream
                    BitmapFactory.decodeStream(input)
                }
                uri.startsWith("file://") -> {
                    BitmapFactory.decodeFile(uri.removePrefix("file://"))
                }
                uri.startsWith("content://") -> {
                    val input = contentResolver.openInputStream(Uri.parse(uri))
                    BitmapFactory.decodeStream(input)
                }
                else -> {
                    BitmapFactory.decodeFile(uri)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            tryLoadFromAssets(uri)
        }
    }

    private fun tryLoadFromAssets(uri: String): Bitmap? {
        val candidates = listOf(
            uri,
            uri.substringAfterLast("/"),
            "pets/ayato/spritesheet.webp"
        )
        for (path in candidates) {
            try {
                val input = assets.open(path)
                return BitmapFactory.decodeStream(input)
            } catch (_: Exception) {}
        }
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        animRunnable?.let { animHandler?.removeCallbacks(it) }
        stopIdleTimer()
        overlayView?.let { windowManager?.removeView(it) }
        frameBuffer?.recycle()
        frameBuffer = null
        frameCanvas = null
        spritesheet?.recycle()
        spritesheet = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "桌宠悬浮窗",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "桌宠悬浮窗服务通知"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("桌宠运行中")
            .setContentText("点击返回应用")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}
