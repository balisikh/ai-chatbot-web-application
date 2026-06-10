import * as state from "./state.js";
import * as dom from "./dom.js";

export function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
export function highlightCode(escaped) {
  const pattern =
    /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(\d+(?:\.\d+)?)\b|\b(const|let|var|function|return|if|else|for|while|import|from|export|class|new|async|await|try|catch|throw|def|lambda|print|true|false|null|undefined|None|True|False|public|private|static|void|int|float|string|bool)\b/g;
  return escaped.replace(pattern, (m, comment, str, num, kw) => {
    if (comment) return `<span class="tok-comment">${comment}</span>`;
    if (str) return `<span class="tok-string">${str}</span>`;
    if (num) return `<span class="tok-number">${num}</span>`;
    if (kw) return `<span class="tok-keyword">${kw}</span>`;
    return m;
  });
}
export function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}
export function isTableSeparator(line) {
  if (!line || !line.includes("-")) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
}

export function renderMarkdown(md) {
  const codeBlocks = [];
  let src = md.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
    codeBlocks.push(code.replace(/\n$/, ""));
    return `\u0000${codeBlocks.length - 1}\u0000`;
  });
  const inline = (s) => {
    s = escapeHtml(s);
    s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    return s;
  };
  const lines = src.split("\n");
  let html = "";
  let listType = null;
  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const ph = line.match(/^\u0000(\d+)\u0000$/);
    if (ph) {
      closeList();
      html += `<pre><code class="hl">${highlightCode(
        escapeHtml(codeBlocks[+ph[1]])
      )}</code></pre>`;
      continue;
    }
    // GitHub-style tables: header row, separator row, then body rows.
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      closeList();
      const header = splitTableRow(line);
      const aligns = splitTableRow(lines[i + 1]).map((c) => {
        const l = c.startsWith(":");
        const r = c.endsWith(":");
        return l && r ? "center" : r ? "right" : l ? "left" : "";
      });
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      i--;
      const cellStyle = (idx) =>
        aligns[idx] ? ` style="text-align:${aligns[idx]}"` : "";
      let t = "<table><thead><tr>";
      header.forEach((h, idx) => (t += `<th${cellStyle(idx)}>${inline(h)}</th>`));
      t += "</tr></thead><tbody>";
      for (const row of rows) {
        t += "<tr>";
        for (let idx = 0; idx < header.length; idx++) {
          t += `<td${cellStyle(idx)}>${inline(row[idx] || "")}</td>`;
        }
        t += "</tr>";
      }
      t += "</tbody></table>";
      html += t;
      continue;
    }
    if (/^\s*$/.test(line)) {
      closeList();
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      closeList();
      const lvl = m[1].length;
      html += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (listType !== "ul") {
        closeList();
        html += "<ul>";
        listType = "ul";
      }
      html += `<li>${inline(m[1])}</li>`;
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (listType !== "ol") {
        closeList();
        html += "<ol>";
        listType = "ol";
      }
      html += `<li>${inline(m[1])}</li>`;
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}
export function toPlainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, " code snippet ")
    .replace(/[*_`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

// --- Toast ----------------------------------------------------------------
export function showToast(message) {
  dom.toastEl.textContent = message;
  dom.toastEl.classList.remove("hidden");
  void dom.toastEl.offsetWidth; // restart transition
  dom.toastEl.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    dom.toastEl.classList.remove("show");
    setTimeout(() => dom.toastEl.classList.add("hidden"), 220);
  }, 1800);
}

// --- DOM helpers ----------------------------------------------------------
export function formatTime(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
// Rough token estimate (~4 characters per token, the common rule of thumb).
export function estimateTokens(text) {
  return Math.max(1, Math.round((text || "").length / 4));
}
export function scrollToBottom() {
  dom.messagesEl.scrollTop = dom.messagesEl.scrollHeight;
}
export function nearBottom() {
  return (
    dom.messagesEl.scrollHeight - dom.messagesEl.scrollTop - dom.messagesEl.clientHeight < 60
  );
}
export function enhanceCodeBlocks(bubble) {
  bubble.querySelectorAll("pre").forEach((pre) => {
    if (pre.querySelector(".copy-code")) return;
    const btn = document.createElement("button");
    btn.className = "copy-code";
    btn.textContent = "Copy code";
    btn.addEventListener("click", async () => {
      const code = pre.querySelector("code");
      try {
        await navigator.clipboard.writeText(code ? code.textContent : "");
        btn.textContent = "Copied!";
        showToast("Code copied to clipboard");
        setTimeout(() => (btn.textContent = "Copy code"), 1500);
      } catch {
        /* ignore */
      }
    });
    pre.appendChild(btn);
  });
}
export function makeMetaButton(label, title, onClick) {
  const btn = document.createElement("button");
  btn.className = "meta-btn";
  btn.textContent = label;
  btn.title = title;
  btn.addEventListener("click", onClick);
  return btn;