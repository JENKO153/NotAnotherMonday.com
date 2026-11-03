/*
 * Shows a recipe that someone shared from Not Another Monday.
 *
 * The recipe is inside the link (?d=...), as compact JSON in base64url, so
 * nothing is stored on a server. It is untrusted input: every value is
 * length-limited and written to the page as plain text (textContent), never
 * as HTML. The limits match the app's (lib/app/recipe_share.dart).
 */
(function () {
  "use strict";

  var IOS_STORE = "https://apps.apple.com/app/id6809999070";
  var ANDROID_STORE = ""; // paste the Google Play listing URL here once it is live
  var ANDROID_PACKAGE = "com.chookychasinglife.notanothermonday";
  var APP_SCHEME = "notanothermonday";
  var MAX_PAYLOAD = 24000;
  var MAX_TITLE = 120;
  var MAX_INGREDIENTS = 4000;
  var MAX_METHOD = 8000;

  function clean(value, max) {
    if (typeof value !== "string") return "";
    var text = value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
    return text.length <= max ? text : text.slice(0, max).trim();
  }

  function cleanNumber(value, max) {
    return typeof value === "number" && Math.floor(value) === value && value >= 0 && value <= max
      ? value
      : null;
  }

  function decode(payload) {
    if (!payload || payload.length > MAX_PAYLOAD) return null;
    try {
      var base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      var binary = atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      var data = JSON.parse(new TextDecoder("utf-8").decode(bytes));
      if (!data || typeof data !== "object" || data.v !== 1) return null;
      var title = clean(data.t, MAX_TITLE);
      if (!title) return null;
      return {
        title: title,
        ingredients: clean(data.i, MAX_INGREDIENTS),
        method: clean(data.m, MAX_METHOD),
        servings: cleanNumber(data.s, 100),
        minutes: cleanNumber(data.n, 2000),
        protein: cleanNumber(data.p, 500)
      };
    } catch (e) {
      return null;
    }
  }

  function platform() {
    var ua = navigator.userAgent || "";
    if (/android/i.test(ua)) return "android";
    if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    return "other";
  }

  function show(id) {
    var el = document.getElementById(id);
    if (el) el.hidden = false;
    return el;
  }

  function render(recipe) {
    document.getElementById("r-title").textContent = recipe.title;
    document.title = recipe.title + " — Not Another Monday";

    var facts = [];
    if (recipe.servings !== null) facts.push("Serves " + recipe.servings);
    if (recipe.minutes !== null) facts.push(recipe.minutes + " min");
    if (recipe.protein !== null) facts.push(recipe.protein + " g protein / serving");
    var factsEl = document.getElementById("r-facts");
    if (facts.length) {
      factsEl.textContent = facts.join(" · ");
      factsEl.hidden = false;
    }

    var lines = recipe.ingredients
      .split("\n")
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
    if (lines.length) {
      var list = document.getElementById("r-ingredients-list");
      lines.forEach(function (line) {
        var li = document.createElement("li");
        li.textContent = line;
        list.appendChild(li);
      });
      show("r-ingredients");
    }

    if (recipe.method) {
      document.getElementById("r-method-text").textContent = recipe.method;
      show("r-method");
    }
  }

  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
    } catch (e) { /* fall through */ }
    return Promise.reject(new Error("no clipboard"));
  }

  function wire(payload) {
    var which = platform();
    var openApp = document.getElementById("open-app");
    var getApp = document.getElementById("get-app");
    var hint = document.getElementById("r-hint");

    var storeUrl = which === "ios" ? IOS_STORE : which === "android" ? ANDROID_STORE : "";
    var homeDownload = new URL("../#download", location.href).href;

    // "Open in the app".
    if (which === "android") {
      // Android knows whether the app is installed: it opens the app if so,
      // and goes to the fallback address (the store) if not.
      var fallback = storeUrl || homeDownload;
      openApp.href =
        "intent://recipe?d=" + payload +
        "#Intent;scheme=" + APP_SCHEME +
        ";package=" + ANDROID_PACKAGE +
        ";S.browser_fallback_url=" + encodeURIComponent(fallback) + ";end";
    } else if (which === "ios") {
      openApp.href = APP_SCHEME + "://recipe?d=" + payload;
    } else {
      openApp.hidden = true;
      hint.textContent = "Open this link on your phone to save the recipe in the app. If you don't have it yet, you can get Not Another Monday free.";
    }

    // "Get the app": leave the recipe link on the clipboard first, so the app
    // can offer to save it the first time it is opened after installing.
    getApp.href = storeUrl || homeDownload;
    getApp.addEventListener("click", function (event) {
      var target = getApp.href;
      event.preventDefault();
      var go = function () { location.href = target; };
      var timer = setTimeout(go, 600);
      copyText(location.href).then(
        function () { clearTimeout(timer); go(); },
        function () { clearTimeout(timer); go(); }
      );
    });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var payload = new URLSearchParams(location.search).get("d");
  var recipe = decode(payload);
  if (!recipe) {
    show("problem");
    return;
  }
  render(recipe);
  wire(payload);
  show("recipe");
})();
