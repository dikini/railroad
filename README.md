# RRD Preview

RRD Preview renders [librrd](https://github.com/epfl-systemf/librrd) railroad diagrams in Visual Studio Code's built-in Markdown preview.

````markdown
```rrd
("function" [identifier] "(" (- [parameter] ",") ")")
```
````

The source remains a normal CommonMark code fence outside VS Code. In VS Code, diagrams automatically reflow as the preview width changes. The first release intentionally uses librrd's native diagram DSL and one built-in style.

## Local development

Building requires Node.js, Java 17+, and sbt. Install dependencies with `npm install`, then run `npm run check`. Package a locally installable VSIX with `npm run package`.

Before publishing, replace `publisher` in `package.json` with the identifier of your VS Code Marketplace publisher.

## License notices

This extension bundles librrd, which is MIT licensed. The distributed VSIX includes `THIRD_PARTY_NOTICES.md`.
