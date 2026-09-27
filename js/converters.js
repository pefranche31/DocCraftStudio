/**
 * DocCraft Studio - Bidirectional Document Converters
 * AsciiDoc <-> Markdown conversion logic
 */

/**
 * Convert AsciiDoc text to Markdown format
 */
function convertAsciiDocToMarkdown(text) {
  let lines = text.split(/\r?\n/);
  let output = [];
  let inSourceBlock = false;
  let sourceLang = '';
  let inPlantUmlBlock = false;
  let inTable = false;
  let tableRows = [];
  let inAdmonition = false;
  let admonitionType = '';
  let admonitionContent = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 1. PlantUML block detection [plantuml...]
    let pumlMatch = line.match(/^\[plantuml\b(.*)\]/i);
    if (pumlMatch) {
      inPlantUmlBlock = true;
      output.push('```plantuml');
      continue;
    }
    if (inPlantUmlBlock && (line.match(/^----$/) || line.match(/^\.\.\.\.$/))) {
      if (inPlantUmlBlock === 'inside') {
        inPlantUmlBlock = false;
        output.push('```');
        continue;
      } else {
        inPlantUmlBlock = 'inside';
        continue;
      }
    }
    if (inPlantUmlBlock === 'inside') {
      output.push(line);
      continue;
    }

    // 2. Source code blocks
    let sourceMatch = line.match(/^\[source\s*,?\s*([a-zA-Z0-9_-]*)\]/i);
    if (sourceMatch) {
      sourceLang = sourceMatch[1] || '';
      continue;
    }
    if (line.match(/^----$/)) {
      if (!inSourceBlock) {
        inSourceBlock = true;
        output.push('```' + sourceLang);
      } else {
        inSourceBlock = false;
        output.push('```');
        sourceLang = '';
      }
      continue;
    }
    if (inSourceBlock) {
      output.push(line);
      continue;
    }

    // 2. Multiline Admonitions [NOTE], [TIP], [WARNING], etc.
    let admMatch = line.match(/^\[(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
    if (admMatch) {
      admonitionType = admMatch[1].toUpperCase();
      continue;
    }
    if (line.match(/^====$/)) {
      if (!inAdmonition) {
        inAdmonition = true;
        admonitionContent = [];
      } else {
        inAdmonition = false;
        const emojis = { NOTE: 'ℹ️ NOTE', TIP: '💡 TIP', IMPORTANT: '📌 IMPORTANT', WARNING: '⚠️ WARNING', CAUTION: '🛑 CAUTION' };
        const label = emojis[admonitionType] || admonitionType;
        output.push(`> **${label}**:`);
        admonitionContent.forEach(al => output.push(`> ${al}`));
        output.push('');
        admonitionType = '';
      }
      continue;
    }
    if (inAdmonition) {
      admonitionContent.push(line);
      continue;
    }

    // 3. One-line admonition e.g. NOTE: message
    let singleAdmonition = line.match(/^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\s*(.*)$/i);
    if (singleAdmonition) {
      const type = singleAdmonition[1].toUpperCase();
      const emojis = { NOTE: 'ℹ️ NOTE', TIP: '💡 TIP', IMPORTANT: '📌 IMPORTANT', WARNING: '⚠️ WARNING', CAUTION: '🛑 CAUTION' };
      output.push(`> **${emojis[type] || type}**: ${singleAdmonition[2]}`);
      continue;
    }

    // 4. Tables |===
    if (line.match(/^\|===/)) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      } else {
        inTable = false;
        // Compile tableRows into Markdown table
        if (tableRows.length > 0) {
          const header = tableRows[0];
          output.push('| ' + header.join(' | ') + ' |');
          output.push('| ' + header.map(() => '---').join(' | ') + ' |');
          for (let r = 1; r < tableRows.length; r++) {
            output.push('| ' + tableRows[r].join(' | ') + ' |');
          }
          output.push('');
        }
      }
      continue;
    }
    if (inTable) {
      if (line.trim().startsWith('|')) {
        const cells = line.split('|').slice(1).map(c => c.trim());
        if (cells.length > 0 && !(cells.length === 1 && cells[0] === '')) {
          tableRows.push(cells);
        }
      }
      continue;
    }

    // 5. Quote blocks [quote] or ____
    if (line.match(/^\[quote\]/i)) continue;
    if (line.match(/^____/)) continue;

    // 6. Headers (= Title, == H2, etc.)
    let headingMatch = line.match(/^(=+)\s+(.*)$/);
    if (headingMatch) {
      const lvl = headingMatch[1].length;
      output.push('#'.repeat(lvl) + ' ' + headingMatch[2]);
      continue;
    }

    // 7. Horizontal separator '''
    if (line.match(/^'''$/)) {
      output.push('---');
      continue;
    }

    // Forced line break {empty} +
    if (line.trim() === '{empty} +') {
      output.push('<br>');
      continue;
    }

    // 8. Images: image::url[alt,width=x] or image:url[alt]
    let imageProcessed = line.replace(/image::?([^\[]+)\[(.*?)\]/g, (match, url, meta) => {
      let parts = meta.split(',');
      let alt = parts[0] || 'Image';
      return `![${alt.trim()}](${url.trim()})`;
    });

    // 9. Links: https://site[Label] -> [Label](https://site)
    let linkProcessed = imageProcessed.replace(/(https?:\/\/[^\s\[]+)\[(.*?)\]/g, (match, url, label) => {
      return `[${label || url}](${url})`;
    });

    // 10. Inline styles: Bold *text* -> **text**, Italic _text_ -> *text*, Strike line-through[x] -> ~~x~~
    let textLine = linkProcessed
      .replace(/line-through\[(.*?)\]/g, '~~$1~~')
      .replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1**$2**$3')
      .replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1*$2*$3');

    // 11. Lists (* -> -, . -> 1., * [ ] -> - [ ])
    if (textLine.match(/^\*\s+\[([ xX])\]\s+/)) {
      textLine = textLine.replace(/^\*\s+\[([ xX])\]\s+/, '- [$1] ');
    } else if (textLine.match(/^\.\s+/)) {
      textLine = textLine.replace(/^\.\s+/, '1. ');
    } else if (textLine.match(/^\*\s+/)) {
      textLine = textLine.replace(/^\*\s+/, '- ');
    }

    output.push(textLine);
  }

  return output.join('\n');
}

/**
 * Convert Markdown text to AsciiDoc format
 */
function convertMarkdownToAsciiDoc(text) {
  let lines = text.split(/\r?\n/);
  let output = [];
  let inCodeBlock = false;
  let codeLang = '';
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 1. Code blocks ```
    let codeMatch = line.match(/^```(.*)$/);
    if (codeMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = codeMatch[1].trim();
        if (codeLang.toLowerCase() === 'plantuml') {
          output.push('[plantuml]\n----');
        } else if (codeLang) {
          output.push(`[source,${codeLang}]\n----`);
        } else {
          output.push('----\n');
        }
      } else {
        inCodeBlock = false;
        output.push('----');
        codeLang = '';
      }
      continue;
    }
    if (inCodeBlock) {
      output.push(line);
      continue;
    }

    // 2. Headings (# H1, ## H2, etc.)
    let headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const lvl = headingMatch[1].length;
      output.push('='.repeat(lvl) + ' ' + headingMatch[2]);
      continue;
    }

    // 3. Tables | Col 1 | Col 2 |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // Check if separator line |---|---|
      if (line.match(/^\|[\s\-:]+(\|[\s\-:]+)+\|$/)) {
        continue; // AsciiDoc defines header naturally in |===
      }
      if (!inTable) {
        inTable = true;
        output.push('|===');
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      output.push(cells.map(c => `| ${c}`).join(' '));
      continue;
    } else if (inTable) {
      inTable = false;
      output.push('|===');
      output.push('');
    }

    // 4. Blockquotes / Admonitions
    let quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      const content = quoteMatch[1];
      // Check for simulated admonitions like > **NOTE** : or > 💡 ASTUCE
      const admCheck = content.match(/\*\*([A-ZÀ-ÿ\s💡ℹ️📌⚠️🛑]+)\*\*\s*:\s*(.*)/i);
      if (admCheck) {
        const rawType = admCheck[1].toUpperCase();
        let type = 'NOTE';
        if (rawType.includes('TIP') || rawType.includes('ASTUCE')) type = 'TIP';
        else if (rawType.includes('WARN') || rawType.includes('ATTENTION')) type = 'WARNING';
        else if (rawType.includes('IMPORTANT')) type = 'IMPORTANT';
        else if (rawType.includes('CAUTION') || rawType.includes('PRUDENCE')) type = 'CAUTION';

        output.push(`[${type}]`);
        output.push('====');
        output.push(admCheck[2]);
        output.push('====');
      } else {
        output.push(`"${content}"`);
      }
      continue;
    }

    // 5. Horizontal rule --- or ***
    if (line.match(/^(\-{3,}|\*{3,})$/)) {
      output.push("'''");
      continue;
    }

    // Forced line break <br>
    if (line.trim().match(/^<br\s*\/?>$/i)) {
      output.push('{empty} +');
      continue;
    }

    // 6. Images: ![alt](url) -> image:url[alt]
    let imageProcessed = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      return `image:${url.trim()}[${alt || 'Image'}]`;
    });

    // 7. Links: [label](url) -> url[label]
    let linkProcessed = imageProcessed.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (match, label, url) => {
      return `${url}[${label}]`;
    });

    // 8. Inline styles: Bold **text** -> *text*, Strike ~~text~~ -> line-through[text], Italic *text* -> _text_
    let textLine = linkProcessed
      .replace(/~~(.*?)~~/g, 'line-through[$1]')
      .replace(/\*\*([^\*]+)\*\*/g, '*$1*')
      .replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1_$2_$3');

    // 9. Lists (- [ ] -> * [ ], - -> *, 1. -> .)
    if (textLine.match(/^-\s+\[([ xX])\]\s+/)) {
      textLine = textLine.replace(/^-\s+\[([ xX])\]\s+/, '* [$1] ');
    } else if (textLine.match(/^\d+\.\s+/)) {
      textLine = textLine.replace(/^\d+\.\s+/, '. ');
    } else if (textLine.match(/^-\s+/)) {
      textLine = textLine.replace(/^-\s+/, '* ');
    }

    output.push(textLine);
  }

  if (inTable) {
    output.push('|===');
  }

  return output.join('\n');
}

function openConvertModal() {
  const isAscii = (currentMode === 'asciidoc');
  const targetFormat = isAscii ? 'Markdown' : 'AsciiDoc';
  const sourceText = getEditorValue();

  pendingConvertedContent = isAscii 
    ? convertAsciiDocToMarkdown(sourceText)
    : convertMarkdownToAsciiDoc(sourceText);

  const titleEl = document.getElementById('convertModalTitle');
  const descEl = document.getElementById('convertModalDescription');
  const previewEl = document.getElementById('conversionPreviewText');

  if (titleEl) titleEl.innerText = `Conversion: ${isAscii ? 'AsciiDoc ➔ Markdown' : 'Markdown ➔ AsciiDoc'}`;
  if (descEl) descEl.innerText = `Automatically converts the active syntax (${isAscii ? 'AsciiDoc' : 'Markdown'}) to ${targetFormat}. Tags, headings, tables, and blocks are unified.`;
  if (previewEl) previewEl.textContent = pendingConvertedContent || '(Empty document)';
  
  openModal('convertModal');
}

function applyConversion() {
  if (pendingConvertedContent !== undefined) {
    setEditorValue(pendingConvertedContent);
    const newMode = (currentMode === 'asciidoc') ? 'markdown' : 'asciidoc';
    closeModal('convertModal');
    setMode(newMode);
    showToast(`Document converted to ${newMode === 'asciidoc' ? 'AsciiDoc' : 'Markdown'}!`);
  }
}

function copyConversionResult() {
  if (!pendingConvertedContent) return;
  const el = document.createElement('textarea');
  el.value = pendingConvertedContent;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    showToast("Converted result copied to clipboard");
  } catch (e) {
    showToast("Copy failed", false);
  }
  document.body.removeChild(el);
}
