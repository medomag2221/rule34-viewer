package lan.serverhome.r34viewer

import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

class MainActivity : Activity() {
  private lateinit var browser: WebView
  private val assets = WebViewAssetLoader.Builder()
    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
    .build()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
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
      CookieManager.getInstance().setAcceptCookie(true)
      webViewClient = object : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
          val url = request.url
          if (url.host == APP_HOST) return false
          startActivity(Intent(Intent.ACTION_VIEW, url))
          return true
        }

        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
          Rule34Api.intercept(request) ?: assets.shouldInterceptRequest(request.url)
      }
      setDownloadListener(DownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
        val source = Uri.parse(url).getQueryParameter("url")
        if (!Rule34Api.isAllowedMedia(source)) return@DownloadListener
        val request = DownloadManager.Request(Uri.parse(source!!)).apply {
          setTitle("Rule34 Viewer")
          setDescription("Скачивание оригинала")
          setMimeType(mimeType)
          setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
          addRequestHeader("User-Agent", userAgent)
          CookieManager.getInstance().getCookie(url)?.let { addRequestHeader("Cookie", it) }
        }
        (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
      })
      if (savedInstanceState == null) loadUrl(APP_URL) else restoreState(savedInstanceState)
    }
    setContentView(browser)
  }

  override fun onSaveInstanceState(outState: Bundle) {
    browser.saveState(outState)
    super.onSaveInstanceState(outState)
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    if (browser.canGoBack()) browser.goBack() else super.onBackPressed()
  }

  companion object {
    private const val APP_HOST = "appassets.androidplatform.net"
    private const val APP_URL = "https://appassets.androidplatform.net/assets/index.html?native=1"
  }
}
