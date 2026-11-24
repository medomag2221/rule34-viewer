package lan.serverhome.r34viewer

import android.app.Activity
import android.content.pm.ActivityInfo
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.widget.ImageView
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import java.net.URL

class MediaActivity : Activity() {
  private val assets = WebViewAssetLoader.Builder()
    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
    .build()
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val source = intent.getStringExtra(EXTRA_URL)
    if (!Rule34Api.isAllowedMedia(source)) { finish(); return }
    window.setStatusBarColor(Color.BLACK)
    window.setNavigationBarColor(Color.BLACK)
    window.insetsController?.hide(WindowInsets.Type.systemBars())
    window.insetsController?.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    if (intent.getBooleanExtra(EXTRA_VIDEO, false)) showVideo(source!!) else showImage(source!!)
  }

  private fun showVideo(source: String) {
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
    val player = WebView(this).apply {
      setBackgroundColor(Color.BLACK)
      settings.javaScriptEnabled = true
      settings.mediaPlaybackRequiresUserGesture = false
      settings.allowFileAccess = false
      settings.allowContentAccess = false
      webViewClient = object : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
          Rule34Api.intercept(request) ?: assets.shouldInterceptRequest(request.url)
      }
      loadUrl("https://appassets.androidplatform.net/assets/media.html?url=${Uri.encode(source)}")
    }
    setContentView(player)
  }

  private fun showImage(source: String) {
    val image = ImageView(this).apply {
      setBackgroundColor(Color.BLACK)
      scaleType = ImageView.ScaleType.FIT_CENTER
      setOnClickListener { finish() }
    }
    setContentView(image)
    Thread {
      try {
        val bitmap = URL(source).openConnection().getInputStream().use(BitmapFactory::decodeStream)
        runOnUiThread { image.setImageBitmap(bitmap) }
      } catch (_: Exception) { runOnUiThread { finish() } }
    }.start()
  }

  companion object {
    const val EXTRA_URL = "url"
    const val EXTRA_VIDEO = "video"
  }
}
