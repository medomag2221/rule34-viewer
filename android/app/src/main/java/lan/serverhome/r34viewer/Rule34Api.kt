package lan.serverhome.r34viewer

import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

/** Direct, keyless Rule34 client used only by the mobile app. */
object Rule34Api {
  private const val APP_HOST = "appassets.androidplatform.net"
  private const val USER_AGENT = "Rule34ViewerAndroid/1.0"
  private val mediaHosts = setOf(
    "api-cdn.rule34.xxx", "api-cdn-mp4.rule34.xxx", "rule34.xxx", "www.rule34.xxx",
  )

  fun intercept(request: WebResourceRequest): WebResourceResponse? {
    val uri = request.url
    if (uri.host != APP_HOST || !uri.path.orEmpty().startsWith("/assets/api/")) return null
    return try {
      when (uri.path) {
        "/assets/api/posts" -> json(posts(uri))
        "/assets/api/tags" -> json(tags(uri))
        "/assets/api/health" -> json(health())
        "/assets/api/media" -> media(uri, request.requestHeaders["Range"])
        else -> json(JSONObject().put("error", "Not found"), 404, "Not Found")
      }
    } catch (error: Exception) {
      json(JSONObject().put("error", error.message ?: "Network error"), 502, "Bad Gateway")
    }
  }

  fun isAllowedMedia(value: String?): Boolean = try {
    val uri = Uri.parse(value)
    uri.scheme == "https" && uri.host?.lowercase() in mediaHosts && uri.userInfo == null && uri.port == -1
  } catch (_: Exception) { false }

  private fun posts(query: Uri): JSONObject {
    val limit = query.getQueryParameter("limit")?.toIntOrNull()?.coerceIn(1, 100) ?: 40
    val page = query.getQueryParameter("page")?.toIntOrNull()?.coerceIn(0, 10_000) ?: 0
    val minimum = query.getQueryParameter("minLikes")?.toIntOrNull()?.coerceIn(0, 1_000_000)
    val terms = query.getQueryParameter("tags").orEmpty().split(',')
      .map { it.trim().replace(' ', '_').lowercase() }.filter { it.isNotEmpty() }.toMutableList()
    if (minimum != null) terms += "score:>$minimum"
    if (query.getQueryParameter("sort") == "fav") terms += "sort:score:desc"
    val api = Uri.parse("https://api.rule34.xxx/index.php").buildUpon()
      .appendQueryParameter("page", "dapi")
      .appendQueryParameter("s", "post")
      .appendQueryParameter("q", "index")
      .appendQueryParameter("json", "1")
      .appendQueryParameter("limit", limit.toString())
      .appendQueryParameter("pid", page.toString())
      .appendQueryParameter("tags", terms.joinToString(" "))
      .build().toString()
    val source = JSONArray(readText(api))
    val normalized = JSONArray()
    for (index in 0 until source.length()) {
      val post = source.optJSONObject(index) ?: continue
      val file = post.optString("file_url")
      if (file.isBlank()) continue
      val score = post.optInt("score", Int.MIN_VALUE)
      if (minimum != null && (score == Int.MIN_VALUE || score <= minimum)) continue
      val tags = JSONArray()
      post.optString("tags").split(Regex("\\s+")).filter { it.isNotBlank() }.forEach(tags::put)
      normalized.put(JSONObject().apply {
        put("id", post.optLong("id"))
        put("sampleUrl", post.optString("sample_url", file))
        put("fileUrl", file)
        put("width", post.optInt("width"))
        put("height", post.optInt("height"))
        put("score", if (score == Int.MIN_VALUE) JSONObject.NULL else score)
        put("tags", tags)
        put("type", if (file.matches(Regex(".*\\.(webm|mp4)(?:\\?.*)?", RegexOption.IGNORE_CASE))) "video" else if (file.matches(Regex(".*\\.gif(?:\\?.*)?", RegexOption.IGNORE_CASE))) "gif" else "image")
      })
    }
    return JSONObject().apply {
      put("page", page); put("limit", limit); put("source", "rule34-direct-mobile")
      put("hasMore", source.length() == limit); put("scanned", source.length()); put("posts", normalized)
    }
  }

  private fun tags(query: Uri): JSONObject {
    val q = query.getQueryParameter("q").orEmpty().trim().take(120)
    if (q.isBlank()) return JSONObject().put("tags", JSONArray())
    val data = JSONArray(readText(Uri.parse("https://api.rule34.xxx/autocomplete.php").buildUpon().appendQueryParameter("q", q).build().toString()))
    val tags = JSONArray()
    for (index in 0 until minOf(data.length(), 30)) {
      val item = data.optJSONObject(index) ?: continue
      tags.put(JSONObject().put("name", item.optString("value")).put("label", item.optString("label")))
    }
    return JSONObject().put("tags", tags)
  }

  private fun health(): JSONObject = try {
    readText("https://api.rule34.xxx/autocomplete.php?q=landscape")
    JSONObject().put("ok", true).put("upstreams", JSONArray().put(JSONObject().put("name", "rule34-direct").put("ok", true)))
  } catch (error: Exception) {
    JSONObject().put("ok", false).put("upstreams", JSONArray().put(JSONObject().put("name", "rule34-direct").put("ok", false).put("error", error.message)))
  }

  private fun media(uri: Uri, range: String?): WebResourceResponse {
    val source = uri.getQueryParameter("url")
    require(isAllowedMedia(source)) { "Unsupported media address" }
    val connection = open(source!!)
    if (!range.isNullOrBlank()) connection.setRequestProperty("Range", range)
    val code = connection.responseCode
    if (code !in listOf(200, 206)) throw IllegalStateException("Media returned HTTP $code")
    val headers = mutableMapOf<String, String>()
    listOf("Content-Type", "Content-Length", "Content-Range", "Accept-Ranges").forEach { name ->
      connection.getHeaderField(name)?.let { headers[name] = it }
    }
    return WebResourceResponse(
      connection.contentType?.substringBefore(';') ?: "application/octet-stream", null, code,
      if (code == 206) "Partial Content" else "OK", headers, connection.inputStream,
    )
  }

  private fun readText(value: String): String = open(value).inputStream.bufferedReader().use { it.readText() }
  private fun open(value: String): HttpURLConnection = (URL(value).openConnection() as HttpURLConnection).apply {
    connectTimeout = 15_000; readTimeout = 30_000; instanceFollowRedirects = true
    setRequestProperty("User-Agent", USER_AGENT); setRequestProperty("Accept-Encoding", "identity")
  }
  private fun json(body: JSONObject, status: Int = 200, reason: String = "OK") = WebResourceResponse(
    "application/json", "utf-8", status, reason, mapOf("Cache-Control" to "no-store"),
    ByteArrayInputStream(body.toString().toByteArray()),
  )
}
