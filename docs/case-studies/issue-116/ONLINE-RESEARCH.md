# Issue 116 Online Research

Accessed on 2026-05-26.

## Sources

- [MDN: `<script type="importmap">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)
- [MDN: Import attributes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with)
- [Node.js: ECMAScript modules](https://nodejs.org/api/esm.html)
- [GitHub Docs: Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Findings Applied

- Browser import maps must be declared before module scripts that rely on those
  mapped specifiers, so the `links-notation` mapping belongs in the document
  head before `web/app.js`.
- Native browser module imports must resolve to URLs. The deployed static page
  cannot resolve a bare package specifier without an import map or bundling.
- JSON module imports require explicit import attributes in current standards
  and Node.js. The final fix avoids that newer syntax in the deployed page by
  fetching the JSON data resource when the module is served over HTTP.
- GitHub Pages custom workflows support a build job that uploads a prepared
  artifact and a deploy job that exposes the deployed page URL. The workflow now
  validates both the prepared `_site` artifact and the final deployed URL.
