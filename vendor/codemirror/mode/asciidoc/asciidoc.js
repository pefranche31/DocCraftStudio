/**
 * CodeMirror AsciiDoc Mode
 * Lightweight, robust syntax highlighter for AsciiDoc syntax in CodeMirror 5
 */
(function(mod) {
  if (typeof exports === "object" && typeof module === "object") {
    mod(require("../../codemirror"));
  } else if (typeof define === "function" && define.amd) {
    define(["../../codemirror"], mod);
  } else {
    mod(CodeMirror);
  }
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineMode("asciidoc", function() {
    return {
      startState: function() {
        return {
          inCodeBlock: false,
          inPlantUml: false,
          inCommentBlock: false
        };
      },
      token: function(stream, state) {
        // Handle code blocks (---- or ....)
        if (stream.sol()) {
          if (stream.match(/^----\s*$/) || stream.match(/^\.\.\.\.\s*$/)) {
            state.inCodeBlock = !state.inCodeBlock;
            return "comment";
          }
          if (stream.match(/^\/\/\/\/\s*$/)) {
            state.inCommentBlock = !state.inCommentBlock;
            return "comment";
          }
        }

        if (state.inCommentBlock) {
          stream.skipToEnd();
          return "comment";
        }

        if (state.inCodeBlock) {
          stream.skipToEnd();
          return "atom";
        }

        // Single-line comments
        if (stream.sol() && stream.match(/^\/\/.*/)) {
          return "comment";
        }

        // Headings (= Title, == H2, etc.)
        if (stream.sol() && stream.match(/^={1,6}\s+.*/)) {
          return "header";
        }

        // Block attributes e.g. [source,javascript], [plantuml], [NOTE], [quote]
        if (stream.sol() && stream.match(/^\[[^\]]+\]/)) {
          return "tag";
        }

        // Document / section attributes :name: value
        if (stream.sol() && stream.match(/^:[a-zA-Z0-9_\-]+:(\s+.*)?$/)) {
          return "def";
        }

        // Admonition labels at line start (NOTE:, TIP:, etc.)
        if (stream.sol() && stream.match(/^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\s+/i)) {
          return "keyword";
        }

        // Table delimiters |===
        if (stream.sol() && stream.match(/^\|={3,}\s*$/)) {
          return "bracket";
        }

        // Table cell markers |
        if (stream.eat('|')) {
          return "bracket";
        }

        // Bullet / Ordered lists at line start
        if (stream.sol() && stream.match(/^(\*{1,5}|\.{1,5})\s+/)) {
          return "variable-2";
        }

        // Checkbox lists
        if (stream.sol() && stream.match(/^\*\s+\[[ xX]\]\s+/)) {
          return "keyword";
        }

        // Images image::url[alt] or image:url[alt]
        if (stream.match(/^image::?[^\[]+\[[^\]]*\]/)) {
          return "string";
        }

        // Links https://...[label]
        if (stream.match(/^https?:\/\/[^\s\[]+\[[^\]]*\]/)) {
          return "link";
        }

        // Inline Bold *text*
        if (stream.match(/^\*[^\s\*][^\*]*\*/)) {
          return "strong";
        }

        // Inline Italic _text_
        if (stream.match(/^_[^\s_][^_]*_/)) {
          return "em";
        }

        // Inline Code `text`
        if (stream.match(/^`[^`]+`/)) {
          return "atom";
        }

        // Advance one character
        stream.next();
        return null;
      }
    };
  });

  CodeMirror.defineMIME("text/x-asciidoc", "asciidoc");
});
