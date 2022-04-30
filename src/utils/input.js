/**
 *
 * @param {Array<String>} chars
 * @param {Number?} cursor
 */
export const listToSpanChars = (chars, cursor) => {
  cursor = cursor === undefined ? chars.length : cursor;
  const cursorHtml = "<span virtual-cursor></span>";

  const res = [
    ...chars.map((char, i) => {
      const html = `<span charPosition="${i}">${char}</span>`;
      if (i === cursor) return `${cursorHtml}${html}`;
      return html;
    }),
  ].join("");

  if (cursor >= chars.length) return `${res}${cursorHtml}`;
  return res;
};
