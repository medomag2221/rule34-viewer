package lan.serverhome.r34viewer

import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Build
import android.view.WindowInsets
import android.widget.FrameLayout
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

class MainActivity : Activity() {
  private lateinit var browser: WebView
  private val assets = WebViewAssetLoader.Builder()
    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
    .build()
  private val credentialPreferences: SharedPreferences by lazy {
    getSharedPreferences("rule34-credentials", Context.MODE_PRIVATE)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    Rule34Api.configureCredentials(
      credentialPreferences.getString("apiKey", "").orEmpty(),
      credentialPreferences.getString("userId", "").orEmpty(),
    )
    browser = WebView(this).apply {
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
      settings.javaScriptEnabled = true
      settings.domStorageEnabled = true
      settings.mediaPlaybackRequiresUserGesture = false
      settings.allowFileAccess = false
      settings.allowContentAccess = false
      addJavascriptInterface(CredentialsBridge(), "Android")
      CookieManager.getInstance().setAcceptCookie(true)
      webViewClient = object : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
          val url = request.url
          if (url.scheme == APP_SCHEME) return handleAppAction(url)
          if (url.host == APP_HOST) return false
          startActivity(Intent(Intent.ACTION_VIEW, url))
          return true
        }

        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
          Rule34Api.intercept(request) ?: assets.shouldInterceptRequest(request.url)
      }
      setDownloadListener(DownloadListener { url, userAgent, _, mimeType, _ ->
        enqueueDownload(Uri.parse(url).getQueryParameter("url"), mimeType, userAgent)
      })
      if (savedInstanceState == null) loadUrl(APP_URL) else restoreState(savedInstanceState)
    }

    val content = FrameLayout(this).apply {
      setBackgroundColor(Color.rgb(16, 18, 18))
      addView(browser, FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      ))
    }
    setContentView(content)

    // Android 15 enforces edge-to-edge layouts for apps targeting API 35.
    // Keep system UI in the root container and lay the WebView out inside the safe area.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      content.setOnApplyWindowInsetsListener { _, insets ->
        val bars = insets.getInsets(WindowInsets.Type.systemBars())
        val params = browser.layoutParams as FrameLayout.LayoutParams
        params.setMargins(bars.left, bars.top, bars.right, bars.bottom)
        browser.layoutParams = params
        insets
      }
      content.post { content.requestApplyInsets() }
    }
  }

  override fun onSaveInstanceState(outState: Bundle) {
    browser.saveState(outState)
    super.onSaveInstanceState(outState)
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    if (browser.canGoBack()) browser.goBack() else super.onBackPressed()
  }

  private fun handleAppAction(uri: Uri): Boolean {
    val source = uri.getQueryParameter("url")
    if (!Rule34Api.isAllowedMedia(source)) return true
    when (uri.host) {
      "download" -> enqueueDownload(source, mimeType(source), null)
      "open" -> startActivity(Intent(this, MediaActivity::class.java).apply {
        putExtra(MediaActivity.EXTRA_URL, source)
        putExtra(MediaActivity.EXTRA_VIDEO, mimeType(source).startsWith("video/"))
      })
    }
    return true
  }

  private inner class CredentialsBridge {
    @JavascriptInterface
    fun saveCredentials(apiKey: String, userId: String) {
      val key = apiKey.trim()
      val id = userId.trim()
      if (key.isBlank() || id.isBlank()) return
      credentialPreferences.edit()
        .putString("apiKey", key)
        .putString("userId", id)
        .apply()
      Rule34Api.configureCredentials(key, id)
    }
  }

  private fun enqueueDownload(source: String?, type: String?, userAgent: String?) {
    if (!Rule34Api.isAllowedMedia(source)) return
    val request = DownloadManager.Request(Uri.parse(source!!)).apply {
      setTitle("Rule34 Viewer")
      setDescription("Скачивание оригинала")
      setMimeType(type ?: mimeType(source))
      setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
      userAgent?.let { addRequestHeader("User-Agent", it) }
    }
    (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
  }

  private fun mimeType(url: String?): String = when {
    url.orEmpty().substringBefore('?').endsWith(".mp4", true) -> "video/mp4"
    url.orEmpty().substringBefore('?').endsWith(".webm", true) -> "video/webm"
    url.orEmpty().substringBefore('?').endsWith(".gif", true) -> "image/gif"
    else -> "image/*"
  }

  companion object {
    private const val APP_HOST = "appassets.androidplatform.net"
    private const val APP_SCHEME = "r34viewer"
    private const val APP_URL = "https://appassets.androidplatform.net/assets/index.html?native=1"
  }
}
