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

class MainActivity : Activity() {
  private lateinit var browser: WebView

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
          if (url.host == "server-home.lan") return false
          startActivity(Intent(Intent.ACTION_VIEW, url))
          return true
        }
      }
      setDownloadListener(DownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
        val request = DownloadManager.Request(Uri.parse(url)).apply {
          setTitle("Rule34 Viewer")
          setDescription("Скачивание оригинала")
          setMimeType(mimeType)
          setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
          addRequestHeader("User-Agent", userAgent)
          CookieManager.getInstance().getCookie(url)?.let { addRequestHeader("Cookie", it) }
        }
        (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
      })
      if (savedInstanceState == null) loadUrl(SERVICE_URL) else restoreState(savedInstanceState)
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
    private const val SERVICE_URL = "http://server-home.lan/r34viewer/"
  }
}
